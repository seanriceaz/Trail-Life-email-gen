package com.traillife.eqcalibration

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.ln
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Cooley-Tukey radix-2 Decimation-In-Time FFT.
 *
 * Operates in-place on arrays of size that must be a power of two.
 * After calling [fft], re[k] and im[k] contain the real and imaginary
 * parts of the k-th frequency bin.
 */
object FFT {

    /**
     * In-place Cooley-Tukey FFT (forward transform).
     *
     * @param re Real part input/output array. Length must be a power of 2.
     * @param im Imaginary part input/output array. Same length as [re].
     *           Pass an array of zeros for a purely real signal.
     */
    fun fft(re: DoubleArray, im: DoubleArray) {
        val n = re.size
        require(n == im.size) { "re and im arrays must be the same length" }
        require(n > 0 && (n and (n - 1)) == 0) { "Array length must be a power of 2" }

        // Bit-reversal permutation
        var j = 0
        for (i in 1 until n) {
            var bit = n shr 1
            while (j and bit != 0) {
                j = j xor bit
                bit = bit shr 1
            }
            j = j xor bit
            if (i < j) {
                var tmp = re[i]; re[i] = re[j]; re[j] = tmp
                tmp = im[i]; im[i] = im[j]; im[j] = tmp
            }
        }

        // Cooley-Tukey iterative FFT
        var len = 2
        while (len <= n) {
            val halfLen = len / 2
            val ang = -2.0 * PI / len
            val wRe = cos(ang)
            val wIm = sin(ang)

            var i = 0
            while (i < n) {
                var curWRe = 1.0
                var curWIm = 0.0
                for (jj in 0 until halfLen) {
                    val uRe = re[i + jj]
                    val uIm = im[i + jj]
                    val vRe = re[i + jj + halfLen] * curWRe - im[i + jj + halfLen] * curWIm
                    val vIm = re[i + jj + halfLen] * curWIm + im[i + jj + halfLen] * curWRe

                    re[i + jj] = uRe + vRe
                    im[i + jj] = uIm + vIm
                    re[i + jj + halfLen] = uRe - vRe
                    im[i + jj + halfLen] = uIm - vIm

                    val newCurWRe = curWRe * wRe - curWIm * wIm
                    curWIm = curWRe * wIm + curWIm * wRe
                    curWRe = newCurWRe
                }
                i += len
            }
            len = len shl 1
        }
    }

    /**
     * Compute the power spectrum (magnitude squared) from FFT output arrays.
     *
     * Only the first (n/2 + 1) bins are meaningful for a real input signal.
     *
     * @param re Real parts (after calling [fft]).
     * @param im Imaginary parts (after calling [fft]).
     * @return FloatArray of length (n/2 + 1) containing power for each bin.
     */
    fun powerSpectrum(re: DoubleArray, im: DoubleArray): FloatArray {
        val n = re.size
        val half = n / 2 + 1
        val power = FloatArray(half)
        for (i in 0 until half) {
            val mag = sqrt(re[i] * re[i] + im[i] * im[i])
            power[i] = mag.toFloat()
        }
        return power
    }

    /**
     * Apply a Hann window to a short array in-place to reduce spectral leakage.
     *
     * @param samples Short array of PCM samples to window.
     * @param re Output DoubleArray that receives the windowed, normalized samples.
     *           Must be at least as long as [samples].
     */
    fun applyHannWindow(samples: ShortArray, re: DoubleArray) {
        val n = samples.size
        for (i in 0 until n) {
            val window = 0.5 * (1.0 - cos(2.0 * PI * i / (n - 1)))
            re[i] = samples[i].toDouble() / 32768.0 * window
        }
    }

    /**
     * Next power of two >= [n].
     */
    fun nextPowerOfTwo(n: Int): Int {
        var p = 1
        while (p < n) p = p shl 1
        return p
    }
}
