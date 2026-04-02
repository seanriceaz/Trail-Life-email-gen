package com.traillife.eqcalibration

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View
import kotlin.math.roundToInt

/**
 * Custom View that draws a bar-graph frequency spectrum.
 *
 * - Y axis: dBFS from -60 (bottom) to 0 (top)
 * - X axis: nine octave bands (63 Hz … 16 kHz)
 * - Each bar is colored:
 *     GREEN  if the correction needed is ≤ ±2 dB
 *     YELLOW if the correction needed is ±2–6 dB
 *     RED    if the correction needed is > ±6 dB
 * - A white dashed "reference" line shows the average (flat) level.
 * - Axis labels are drawn for both axes.
 */
class SpectrumView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyle: Int = 0
) : View(context, attrs, defStyle) {

    companion object {
        private const val DB_MIN = -60f
        private const val DB_MAX = 0f
        private const val DB_RANGE = DB_MAX - DB_MIN  // 60 dB

        private val BAND_LABELS = EqRecommendation.BAND_LABELS
        private val NUM_BANDS = BAND_LABELS.size

        // Colours
        private val COLOR_GOOD     = Color.parseColor("#4CAF50")  // green
        private val COLOR_WARNING  = Color.parseColor("#FFC107")  // amber
        private val COLOR_CRITICAL = Color.parseColor("#F44336")  // red
        private val COLOR_REF_LINE = Color.WHITE
        private val COLOR_AXIS     = Color.parseColor("#B0BEC5")  // light blue-grey
        private val COLOR_GRID     = Color.parseColor("#37474F")  // dark blue-grey
        private val COLOR_BG       = Color.parseColor("#1A1A2E")  // deep navy
        private val COLOR_BAR_OUTLINE = Color.parseColor("#546E7A")
    }

    // Paints (created once, reused every draw)
    private val barPaint     = Paint(Paint.ANTI_ALIAS_FLAG)
    private val outlinePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 1f
        color = COLOR_BAR_OUTLINE
    }
    private val refPaint     = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 2f
        color = COLOR_REF_LINE
        pathEffect = android.graphics.DashPathEffect(floatArrayOf(12f, 8f), 0f)
    }
    private val axisLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = COLOR_AXIS
        textAlign = Paint.Align.CENTER
    }
    private val dbLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = COLOR_AXIS
        textAlign = Paint.Align.RIGHT
    }
    private val gridPaint    = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 0.5f
        color = COLOR_GRID
    }

    // Data
    private var levels: FloatArray = FloatArray(NUM_BANDS) { -60f }
    private var referenceDb: Float = -30f

    // Layout geometry (computed in onSizeChanged)
    private var plotLeft   = 0f
    private var plotRight  = 0f
    private var plotTop    = 0f
    private var plotBottom = 0f
    private var barWidth   = 0f
    private var barSpacing = 0f

    /**
     * Update the displayed spectrum.
     *
     * @param newLevels   FloatArray of dBFS levels, one per octave band (length must be 9).
     * @param newReference The "flat" reference level in dBFS (average of all bands).
     */
    fun setLevels(newLevels: FloatArray, newReference: Float) {
        if (newLevels.size == NUM_BANDS) {
            newLevels.copyInto(levels)
        }
        referenceDb = newReference
        invalidate()
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)

        val density = resources.displayMetrics.density
        val leftMargin  = 44f * density   // space for dB labels
        val rightMargin = 8f * density
        val topMargin   = 8f * density
        val bottomMargin = 28f * density  // space for freq labels

        plotLeft   = leftMargin
        plotRight  = w - rightMargin
        plotTop    = topMargin
        plotBottom = h - bottomMargin

        val plotWidth = plotRight - plotLeft
        // Each band gets equal width with a small gap
        barSpacing = plotWidth / NUM_BANDS
        barWidth   = barSpacing * 0.65f

        // Scale text sizes with density
        axisLabelPaint.textSize = 10f * density
        dbLabelPaint.textSize   = 10f * density
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        // Background
        canvas.drawColor(COLOR_BG)

        // Grid lines at -60, -50, -40, -30, -20, -10, 0 dBFS
        val gridLevels = intArrayOf(-60, -50, -40, -30, -20, -10, 0)
        for (db in gridLevels) {
            val y = dbToY(db.toFloat())
            canvas.drawLine(plotLeft, y, plotRight, y, gridPaint)

            // dB label on the left
            val label = if (db == 0) "0" else "$db"
            canvas.drawText(label, plotLeft - 6f, y + dbLabelPaint.textSize / 3f, dbLabelPaint)
        }

        // Draw reference line
        val refY = dbToY(referenceDb)
        canvas.drawLine(plotLeft, refY, plotRight, refY, refPaint)

        // Draw bars
        for (i in 0 until NUM_BANDS) {
            val level = levels[i].coerceIn(DB_MIN, DB_MAX)
            val correction = referenceDb - level
            val absCorr = kotlin.math.abs(correction)

            val barColor = when {
                absCorr <= 2f -> COLOR_GOOD
                absCorr <= 6f -> COLOR_WARNING
                else          -> COLOR_CRITICAL
            }

            val barLeft   = plotLeft + i * barSpacing + (barSpacing - barWidth) / 2f
            val barRight  = barLeft + barWidth
            val barTop    = dbToY(level)
            val barBottom = plotBottom

            barPaint.color = barColor
            val rect = RectF(barLeft, barTop, barRight, barBottom)
            canvas.drawRoundRect(rect, 4f, 4f, barPaint)
            canvas.drawRoundRect(rect, 4f, 4f, outlinePaint)

            // Frequency label below each bar
            val labelX = barLeft + barWidth / 2f
            val labelY = plotBottom + axisLabelPaint.textSize + 4f
            canvas.drawText(BAND_LABELS[i], labelX, labelY, axisLabelPaint)

            // Level value above the bar (only if not silence)
            if (level > DB_MIN + 1f) {
                val valueLabel = "%.0f".format(level)
                val valuePaint = Paint(axisLabelPaint).apply {
                    textSize = axisLabelPaint.textSize * 0.85f
                    color = barColor
                }
                canvas.drawText(valueLabel, labelX, barTop - 3f, valuePaint)
            }
        }

        // "REF" label near the reference line
        val refLabelPaint = Paint(axisLabelPaint).apply {
            color = COLOR_REF_LINE
            textAlign = Paint.Align.LEFT
            textSize = axisLabelPaint.textSize * 0.9f
        }
        canvas.drawText("REF %.0f".format(referenceDb), plotLeft + 4f, refY - 4f, refLabelPaint)
    }

    /**
     * Convert a dBFS value to a Y pixel coordinate within the plot area.
     * -60 dB → plotBottom, 0 dB → plotTop.
     */
    private fun dbToY(db: Float): Float {
        val fraction = (db - DB_MIN) / DB_RANGE   // 0.0 at bottom, 1.0 at top
        return plotBottom - fraction * (plotBottom - plotTop)
    }
}
