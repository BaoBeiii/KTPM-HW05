/**
 * Utility Script: seed_test_users.js
 * Purpose: Seed 50 test users from data/users.csv into EShop database
 * Author: BaoBeiii (23127327)
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const possibleDbPaths = [
    path.resolve(__dirname, '../backend/database.sqlite'),
    path.resolve(__dirname, '../../eshop-sut/backend/database.sqlite'),
    path.resolve(__dirname, '../eshop-sut/backend/database.sqlite'),
    path.resolve(__dirname, './database.sqlite'),
    path.resolve(__dirname, '../database.sqlite')
];

let dbPath = possibleDbPaths.find(p => fs.existsSync(p)) || possibleDbPaths[0];
console.log(`[INFO] Connecting to database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('[ERROR] Could not connect to database:', err.message);
        process.exit(1);
    }
});

const csvPath = path.resolve(__dirname, '../data/users.csv');
if (!fs.existsSync(csvPath)) {
    console.error(`[ERROR] File users.csv not found at ${csvPath}`);
    process.exit(1);
}

const lines = fs.readFileSync(csvPath, 'utf-8').split('\n').map(l => l.trim()).filter(l => l.length > 0);
const headers = lines[0].split(',');

db.serialize(() => {
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO users (name, email, password, role, login_attempts, locked_until)
        VALUES (?, ?, ?, ?, 0, NULL)
    `);

    let count = 0;
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 2) {
            const email = parts[0];
            const password = parts[1];
            const role = parts[2] || 'user';
            const name = email.split('@')[0];
            stmt.run([name, email, password, role], function(err) {
                if (!err && this.changes > 0) count++;
            });
        }
    }

    stmt.finalize(() => {
        console.log(`[SUCCESS] Seeded/verified test user accounts in database.`);
        db.close();
    });
});
