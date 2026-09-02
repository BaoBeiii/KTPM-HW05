/**
 * Utility Script: reset_lockout.js
 * Purpose: Reset account lockout state (FR-02) in SQLite database after Stress/Spike test
 * Author: BaoBeiii (23127327)
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Try locating database.sqlite in standard project locations
const possibleDbPaths = [
    path.resolve(__dirname, '../backend/database.sqlite'),
    path.resolve(__dirname, '../../eshop-sut/backend/database.sqlite'),
    path.resolve(__dirname, '../eshop-sut/backend/database.sqlite'),
    path.resolve(__dirname, './database.sqlite'),
    path.resolve(__dirname, '../database.sqlite')
];

let dbPath = possibleDbPaths.find(p => fs.existsSync(p));

if (!dbPath) {
    dbPath = possibleDbPaths[0];
    console.log(`[INFO] database.sqlite not found in search paths. Defaulting to: ${dbPath}`);
} else {
    console.log(`[INFO] Found database at: ${dbPath}`);
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('[ERROR] Could not connect to database:', err.message);
        process.exit(1);
    }
});

const sql = `UPDATE users SET login_attempts = 0, locked_until = NULL;`;

db.run(sql, function (err) {
    if (err) {
        console.error('[ERROR] Failed to reset lockout:', err.message);
        db.close();
        process.exit(1);
    }
    console.log(`[SUCCESS] Reset account lockout for all users! Rows affected: ${this.changes}`);
    db.close();
});
