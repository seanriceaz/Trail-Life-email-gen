package com.traillife.eqcalibration

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.TableRow
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.traillife.eqcalibration.databinding.ActivityMainBinding

/**
 * Main activity for the EQ Calibration tool.
 *
 * Responsibilities:
 *  - Request RECORD_AUDIO permission at runtime.
 *  - Manage the AudioAnalyzer lifecycle (start / stop).
 *  - Forward smoothed band levels to SpectrumView and the EQ table.
 *  - Allow the user to "hold" a snapshot of current measurements.
 */
class MainActivity : AppCompatActivity() {

    companion object {
        private const val REQUEST_RECORD_AUDIO = 101
    }

    private lateinit var binding: ActivityMainBinding
    private var analyzer: AudioAnalyzer? = null

    private var isRunning = false
    private var isHeld    = false

    /** The most recently received live levels (dBFS per octave band). */
    private var liveLevels: FloatArray = FloatArray(EqRecommendation.BAND_FREQUENCIES.size) { -60f }

    /** Held snapshot — non-null only when the user pressed "Hold". */
    private var heldLevels: FloatArray? = null

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupButtons()
        buildEqTableHeaders()
        updateEqTable(liveLevels)  // Show empty / silent table on launch
    }

    override fun onDestroy() {
        super.onDestroy()
        stopAnalyzer()
    }

    // -------------------------------------------------------------------------
    // UI setup
    // -------------------------------------------------------------------------

    private fun setupButtons() {
        binding.btnStartStop.setOnClickListener {
            if (isRunning) {
                stopAnalyzer()
            } else {
                requestMicPermissionOrStart()
            }
        }

        binding.btnHold.setOnClickListener {
            if (isHeld) {
                // Release hold — resume live updates
                isHeld = false
                heldLevels = null
                binding.btnHold.text = getString(R.string.btn_hold)
                binding.tvHoldStatus.visibility = View.GONE
            } else {
                // Capture snapshot of current live levels
                heldLevels = liveLevels.copyOf()
                isHeld = true
                binding.btnHold.text = getString(R.string.btn_unhold)
                binding.tvHoldStatus.visibility = View.VISIBLE
                // Immediately refresh UI from held data
                heldLevels?.let { refreshUi(it) }
            }
        }
    }

    /**
     * Build the header row for the EQ recommendations table.
     * Only called once in onCreate.
     */
    private fun buildEqTableHeaders() {
        val header = TableRow(this)
        val colWidthDp = resources.displayMetrics.density

        val titles = listOf("Frequency", "Measured", "Correction")
        for (title in titles) {
            val tv = TextView(this).apply {
                text = title
                setTextColor(Color.WHITE)
                setPadding(
                    (8 * colWidthDp).toInt(),
                    (6 * colWidthDp).toInt(),
                    (8 * colWidthDp).toInt(),
                    (6 * colWidthDp).toInt()
                )
                gravity = Gravity.CENTER
                textSize = 13f
                setTypeface(null, android.graphics.Typeface.BOLD)
            }
            header.addView(tv)
        }
        binding.tableEq.addView(header, 0)
    }

    // -------------------------------------------------------------------------
    // Analyzer control
    // -------------------------------------------------------------------------

    private fun requestMicPermissionOrStart() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            == PackageManager.PERMISSION_GRANTED
        ) {
            startAnalyzer()
        } else {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.RECORD_AUDIO),
                REQUEST_RECORD_AUDIO
            )
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_RECORD_AUDIO) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startAnalyzer()
            } else {
                Toast.makeText(
                    this,
                    R.string.permission_denied_message,
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun startAnalyzer() {
        if (isRunning) return
        isRunning = true
        binding.btnStartStop.text = getString(R.string.btn_stop)
        binding.tvStatus.text = getString(R.string.status_running)
        binding.tvStatus.setTextColor(ContextCompat.getColor(this, R.color.status_running))

        analyzer = AudioAnalyzer { levels ->
            // Called on audio thread → post to main thread
            runOnUiThread {
                liveLevels = levels
                if (!isHeld) {
                    refreshUi(levels)
                }
            }
        }
        analyzer?.start()
    }

    private fun stopAnalyzer() {
        if (!isRunning) return
        isRunning = false
        analyzer?.stop()
        analyzer = null
        binding.btnStartStop.text = getString(R.string.btn_start)
        binding.tvStatus.text = getString(R.string.status_stopped)
        binding.tvStatus.setTextColor(ContextCompat.getColor(this, R.color.status_stopped))
    }

    // -------------------------------------------------------------------------
    // UI refresh
    // -------------------------------------------------------------------------

    /**
     * Update both the SpectrumView and the EQ table from the given levels array.
     */
    private fun refreshUi(levels: FloatArray) {
        val recommendations = EqRecommendation.buildRecommendations(levels)

        // Compute the reference (average) for the spectrum view
        val validLevels = levels.filter { it > -59f }
        val reference = if (validLevels.isEmpty()) -30f else validLevels.average().toFloat()

        binding.spectrumView.setLevels(levels, reference)
        updateEqTable(levels, recommendations)
    }

    /**
     * Populate (or repopulate) the EQ recommendation rows in the TableLayout.
     * Clears all rows except the header (row 0).
     */
    private fun updateEqTable(
        levels: FloatArray,
        recommendations: List<EqRecommendation> = EqRecommendation.buildRecommendations(levels)
    ) {
        val density = resources.displayMetrics.density

        // Remove all rows except the header
        val rowCount = binding.tableEq.childCount
        if (rowCount > 1) {
            binding.tableEq.removeViews(1, rowCount - 1)
        }

        for (rec in recommendations) {
            val row = TableRow(this)

            val bgColor = when (rec.severity) {
                EqRecommendation.Severity.GOOD     -> Color.parseColor("#1B5E20")  // dark green
                EqRecommendation.Severity.WARNING  -> Color.parseColor("#4A3800")  // dark amber
                EqRecommendation.Severity.CRITICAL -> Color.parseColor("#4E0000")  // dark red
            }
            val textColor = when (rec.severity) {
                EqRecommendation.Severity.GOOD     -> Color.parseColor("#A5D6A7")
                EqRecommendation.Severity.WARNING  -> Color.parseColor("#FFE082")
                EqRecommendation.Severity.CRITICAL -> Color.parseColor("#EF9A9A")
            }

            row.setBackgroundColor(bgColor)
            row.setPadding(0, (2 * density).toInt(), 0, (2 * density).toInt())

            val freqText  = "${rec.label} Hz"
            val measText  = "%.1f dBFS".format(rec.measuredDb)
            val corrText  = rec.correctionString

            listOf(freqText, measText, corrText).forEach { text ->
                val tv = TextView(this).apply {
                    this.text = text
                    setTextColor(textColor)
                    setPadding(
                        (8 * density).toInt(),
                        (6 * density).toInt(),
                        (8 * density).toInt(),
                        (6 * density).toInt()
                    )
                    gravity = Gravity.CENTER
                    textSize = 13f
                }
                row.addView(tv)
            }

            binding.tableEq.addView(row)
        }
    }
}
