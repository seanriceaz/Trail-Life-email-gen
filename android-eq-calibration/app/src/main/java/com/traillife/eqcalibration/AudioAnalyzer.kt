package com.traillife.eqcalibration

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import kotlin.math.log10
import kotlin.math.sqrt

/**
 * Captures audio from the microphone on a background thread, performs FFT-based
 * frequency analysis, and reports smoothed octave-band levels via a callback.
 *
 * Usage:
 *   val analyzer = AudioAnalyzer { levels -> /* FloatArray of 9 dBFS values */ }
 *   analyzer.start()
 *   // …later…
 *   analyzer.stop()
 */
class AudioAnalyzer(private val onLevelsUpdated: (FloatArray) -> Unit) {

    companion object {
        private const val SAMPLE_RATE = 44100
        private const val FFT_SIZE = 8192          // Must be power of 2; gives ~5.4 Hz resolution
        private const val SMOOTHING_ALPHA = 0.15f  // EMA coefficient (lower = smoother/slower)

        /** Number of FFT frames to average before reporting a result. */
        private const val FRAMES_TO_AVERAGE = 4

        private val BAND_FREQUENCIES = EqRecommendation.BAND_FREQUENCIES

        /**
         * For each octave band centered at fc, the band edges are fc/√2 … fc*√2.
         * This computes which FFT bin indices fall inside that range.
         *
         * @param fftSize   Total FFT size (number of samples).
         * @param sampleRate Sampling rate in Hz.
         * @return Array of IntRange, one per octave band.
         */
        fun octaveBandBinRanges(fftSize: Int, sampleRate: Int): Array<IntRange> {
            val freqResolution = sampleRate.toDouble() / fftSize
            return Array(BAND_FREQUENCIES.size) { i ->
                val fc = BAND_FREQUENCIES[i].toDouble()
                val fLow = fc / sqrt(2.0)
                val fHigh = fc * sqrt(2.0)
                val binLow = (fLow / freqResolution).toInt().coerceAtLeast(1)
                val binHigh = (fHigh / freqResolution).toInt().coerceAtMost(fftSize / 2)
                binLow..binHigh
            }
        }
    }

    @Volatile private var running = false
    private var thread: Thread? = null

    /** Smoothed band levels across FFT frames (dBFS, initialised to silence). */
    private val smoothedLevels = FloatArray(BAND_FREQUENCIES.size) { -60f }

    /** Pre-computed bin ranges for each octave band. */
    private val bandRanges: Array<IntRange> = octaveBandBinRanges(FFT_SIZE, SAMPLE_RATE)

    // Reusable work arrays (allocated once to avoid GC pressure on audio thread)
    private val reBuffer = DoubleArray(FFT_SIZE)
    private val imBuffer = DoubleArray(FFT_SIZE)
    private val accumulatedPower = FloatArray(BAND_FREQUENCIES.size)

    /**
     * Start audio capture and analysis on a background thread.
     * Safe to call multiple times; a second call is a no-op if already running.
     */
    fun start() {
        if (running) return
        running = true

        thread = Thread({
            android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_URGENT_AUDIO)
            runAnalysis()
        }, "AudioAnalyzer").also { it.start() }
    }

    /**
     * Stop audio capture. Blocks briefly until the background thread finishes.
     */
    fun stop() {
        running = false
        thread?.join(1000)
        thread = null
    }

    // -------------------------------------------------------------------------
    // Internal implementation
    // -------------------------------------------------------------------------

    private fun runAnalysis() {
        val minBuf = AudioRecord.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )
        // Use at least FFT_SIZE samples so we can fill a whole frame each read.
        val bufferSizeBytes = maxOf(minBuf, FFT_SIZE * 2).let { size ->
            // Round up to next multiple of FFT_SIZE * 2
            val chunk = FFT_SIZE * 2
            ((size + chunk - 1) / chunk) * chunk
        }

        val record = try {
            AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                bufferSizeBytes
            )
        } catch (e: SecurityException) {
            // RECORD_AUDIO permission was revoked at runtime; stop gracefully.
            running = false
            return
        }

        if (record.state != AudioRecord.STATE_INITIALIZED) {
            record.release()
            running = false
            return
        }

        record.startRecording()

        val readBuffer = ShortArray(FFT_SIZE)
        var frameCount = 0
        accumulatedPower.fill(0f)

        try {
            while (running) {
                val samplesRead = record.read(readBuffer, 0, FFT_SIZE)
                if (samplesRead <= 0) continue

                // Apply Hann window and copy into real part; zero out imaginary part
                FFT.applyHannWindow(readBuffer, reBuffer)
                imBuffer.fill(0.0)

                // In-place FFT
                FFT.fft(reBuffer, imBuffer)

                // Power spectrum (magnitude)
                val power = FFT.powerSpectrum(reBuffer, imBuffer)

                // Accumulate RMS power per octave band
                for (b in BAND_FREQUENCIES.indices) {
                    val range = bandRanges[b]
                    var sumPower = 0.0
                    var count = 0
                    for (bin in range) {
                        if (bin < power.size) {
                            val p = power[bin].toDouble()
                            sumPower += p * p  // square magnitude → power
                            count++
                        }
                    }
                    val rms = if (count > 0) sqrt(sumPower / count).toFloat() else 0f
                    accumulatedPower[b] += rms
                }

                frameCount++

                if (frameCount >= FRAMES_TO_AVERAGE) {
                    // Average over accumulated frames and convert to dBFS
                    val bandLevels = FloatArray(BAND_FREQUENCIES.size)
                    for (b in BAND_FREQUENCIES.indices) {
                        val avgMag = accumulatedPower[b] / frameCount
                        // Convert to dBFS: 0 dBFS = full scale (magnitude of 1.0 after normalisation)
                        val dbfs = if (avgMag > 1e-10f) {
                            (20.0 * log10(avgMag.toDouble())).toFloat()
                        } else {
                            -60f
                        }
                        // Clamp to display range
                        bandLevels[b] = dbfs.coerceIn(-60f, 0f)
                    }

                    // Exponential moving average smoothing
                    for (b in BAND_FREQUENCIES.indices) {
                        smoothedLevels[b] = SMOOTHING_ALPHA * bandLevels[b] +
                                (1f - SMOOTHING_ALPHA) * smoothedLevels[b]
                    }

                    // Deliver a copy to the callback (called on audio thread; UI must post to main)
                    onLevelsUpdated(smoothedLevels.copyOf())

                    // Reset accumulators
                    accumulatedPower.fill(0f)
                    frameCount = 0
                }
            }
        } finally {
            record.stop()
            record.release()
        }
    }
}
