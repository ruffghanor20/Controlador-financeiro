package com.ruffghanor.salaofinanceirooffline

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

class DatabaseHelper(context: Context) : SQLiteOpenHelper(context, DB_NAME, null, DB_VERSION) {

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS kv_store (" +
                    "k TEXT PRIMARY KEY," +
                    "v TEXT NOT NULL" +
                    ")"
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // Simple, forward-only schema. Keep data.
        onCreate(db)
    }

    fun kvGet(key: String): String? {
        readableDatabase.query(
            "kv_store", arrayOf("v"),
            "k = ?", arrayOf(key),
            null, null, null
        ).use { c ->
            return if (c.moveToFirst()) c.getString(0) else null
        }
    }

    fun kvSet(key: String, value: String): Boolean {
        val cv = ContentValues().apply {
            put("k", key)
            put("v", value)
        }
        val res = writableDatabase.insertWithOnConflict(
            "kv_store", null, cv, SQLiteDatabase.CONFLICT_REPLACE
        )
        return res != -1L
    }

    fun kvDelete(key: String): Boolean {
        val res = writableDatabase.delete("kv_store", "k = ?", arrayOf(key))
        return res > 0
    }

    companion object {
        private const val DB_NAME = "salao_financeiro_offline.db"
        private const val DB_VERSION = 1
    }
}
