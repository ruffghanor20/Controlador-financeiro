package com.ruffghanor.salaofinanceirooffline

import android.annotation.SuppressLint
import android.content.ContentValues
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.webkit.JavascriptInterface
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import java.io.File
import java.io.FileOutputStream

class OfflineBridge(
    private val activity: AppCompatActivity,
    private val db: DatabaseHelper
) {

    @JavascriptInterface
    fun isNative(): Boolean = true

    @JavascriptInterface
    fun kvGet(key: String): String? = db.kvGet(key)

    @JavascriptInterface
    fun kvSet(key: String, value: String): Boolean = db.kvSet(key, value)

    @JavascriptInterface
    fun kvDelete(key: String): Boolean = db.kvDelete(key)

    /**
     * Save a text/binary file to Downloads using base64 content.
     * This keeps the UI offline and still exports to a user-visible folder.
     */
    @JavascriptInterface
    fun saveTextFile(fileName: String, mimeType: String, base64Content: String): Boolean {
        return saveFileToDownloads(fileName, mimeType, base64Content)
    }

    fun saveFileToDownloads(fileName: String, mimeType: String, base64Content: String): Boolean {
        return try {
            val bytes = Base64.decode(base64Content, Base64.DEFAULT)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val resolver = activity.contentResolver
                val values = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                    put(MediaStore.Downloads.MIME_TYPE, mimeType)
                    put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                }
                val uri: Uri? = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                if (uri != null) {
                    resolver.openOutputStream(uri)?.use { it.write(bytes) } ?: return false
                } else {
                    return false
                }
            } else {
                val downloads = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: activity.filesDir
                if (!downloads.exists()) downloads.mkdirs()
                val outFile = File(downloads, fileName)
                FileOutputStream(outFile).use { it.write(bytes) }
            }

            activity.runOnUiThread {
                Toast.makeText(activity, "Arquivo salvo em Downloads", Toast.LENGTH_SHORT).show()
            }
            true
        } catch (e: Exception) {
            activity.runOnUiThread {
                Toast.makeText(activity, "Não foi possível salvar o arquivo", Toast.LENGTH_SHORT).show()
            }
            false
        }
    }
}
