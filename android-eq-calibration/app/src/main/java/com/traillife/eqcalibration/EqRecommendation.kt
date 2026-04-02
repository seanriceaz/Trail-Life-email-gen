package com.traillife.eqcalibration

/**
 * Data class representing the EQ recommendation for a single octave band.
 *
 * @param frequencyHz Center frequency of the octave band in Hz.
 * @param label Human-readable label for the frequency (e.g. "1k").
 * @param measuredDb Measured level in dBFS (relative, smoothed).
 * @param correctionDb How many dB to boost (+) or cut (-) to reach flat.
 *                     Positive = boost needed, negative = cut needed.
 */
data class EqRecommendation(
    val frequencyHz: Int,
    val label: String,
    val measuredDb: Float,
    val correctionDb: Float
) {
    /**
     * Human-readable correction string, e.g. "+3.2 dB" or "-1.5 dB".
     */
    val correctionString: String
        get() = when {
            correctionDb > 0.05f  -> "+%.1f dB".format(correctionDb)
            correctionDb < -0.05f -> "%.1f dB".format(correctionDb)
            else                  -> "Flat"
        }

    /**
     * Severity category based on how far off from flat the measurement is.
     */
    val severity: Severity
        get() = when {
            kotlin.math.abs(correctionDb) <= 2f -> Severity.GOOD
            kotlin.math.abs(correctionDb) <= 6f -> Severity.WARNING
            else                                -> Severity.CRITICAL
        }

    enum class Severity { GOOD, WARNING, CRITICAL }

    companion object {
        /** Center frequencies of the nine standard octave bands used throughout the app. */
        val BAND_FREQUENCIES = intArrayOf(63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000)

        /** Short display labels for each band. */
        val BAND_LABELS = arrayOf("63", "125", "250", "500", "1k", "2k", "4k", "8k", "16k")

        /**
         * Build a list of [EqRecommendation] objects from an array of measured dBFS levels.
         *
         * The "flat" reference is the mean of all measured levels, so the corrections
         * are relative to the overall average level — this accounts for room volume
         * without needing an absolute SPL calibration.
         *
         * @param measuredLevels FloatArray of length 9, one entry per octave band,
         *                       in the same order as [BAND_FREQUENCIES].
         * @return List of [EqRecommendation] ordered from lowest to highest frequency.
         */
        fun buildRecommendations(measuredLevels: FloatArray): List<EqRecommendation> {
            require(measuredLevels.size == BAND_FREQUENCIES.size) {
                "Expected ${BAND_FREQUENCIES.size} bands, got ${measuredLevels.size}"
            }

            // Compute mean of all non-silence bands to use as the flat reference
            val validLevels = measuredLevels.filter { it > -59f }
            val reference = if (validLevels.isEmpty()) {
                measuredLevels.average().toFloat()
            } else {
                validLevels.average().toFloat()
            }

            return BAND_FREQUENCIES.indices.map { i ->
                val measured = measuredLevels[i]
                // Correction = reference - measured: if measured is low, correction is positive (boost)
                val correction = reference - measured
                EqRecommendation(
                    frequencyHz = BAND_FREQUENCIES[i],
                    label = BAND_LABELS[i],
                    measuredDb = measured,
                    correctionDb = correction
                )
            }
        }
    }
}
