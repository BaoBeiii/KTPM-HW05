/**
 * Utility Script: reset_database.js
 * Purpose: Complete database reset and re-seed to restore clean state (FR-01 to FR-19)
 * Author: BaoBeiii (23127327)
 */

const path = require('path');
const fs = require('fs');

let sqlite3;
try {
    sqlite3 = require('sqlite3').verbose();
} catch (e) {
    try {
        sqlite3 = require(path.resolve(__dirname, '../eshop-sut/backend/node_modules/sqlite3')).verbose();
    } catch (e2) {
        sqlite3 = require(path.resolve(__dirname, '../../eshop-sut/backend/node_modules/sqlite3')).verbose();
    }
}

const possibleDbPaths = [
    path.resolve(__dirname, '../backend/database.sqlite'),
    path.resolve(__dirname, '../../eshop-sut/backend/database.sqlite'),
    path.resolve(__dirname, '../eshop-sut/backend/database.sqlite'),
    path.resolve(__dirname, './database.sqlite'),
    path.resolve(__dirname, '../database.sqlite')
];

let dbPath = possibleDbPaths.find(p => fs.existsSync(p)) || possibleDbPaths[0];
console.log(`[INFO] Resetting database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('[ERROR] Could not connect to database:', err.message);
        process.exit(1);
    }
});

db.serialize(() => {
    console.log('[INFO] Rebuilding database tables...');
    db.run('DROP TABLE IF EXISTS coupon_usage');
    db.run('DROP TABLE IF EXISTS coupons');
    db.run('DROP TABLE IF EXISTS users');
    db.run('DROP TABLE IF EXISTS products');
    db.run('DROP TABLE IF EXISTS categories');
    db.run('DROP TABLE IF EXISTS orders');

    // Create Categories Table
    db.run(`CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT
    )`);

    // Create Coupons Table
    db.run(`CREATE TABLE coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE,
        type TEXT DEFAULT 'percent',
        discount_value INTEGER,
        min_order_amount INTEGER DEFAULT 0,
        expired_at DATETIME,
        is_active INTEGER DEFAULT 1,
        max_uses_per_user INTEGER DEFAULT 1
    )`);

    // Create Coupon Usage Table
    db.run(`CREATE TABLE coupon_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        coupon_id INTEGER,
        user_id INTEGER,
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create Users Table
    db.run(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user',
        login_attempts INTEGER DEFAULT 0,
        locked_until DATETIME,
        reset_token TEXT,
        shipping_address TEXT,
        phone TEXT
    )`);

    // Create Products Table
    db.run(`CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price INTEGER,
        description TEXT,
        imageUrl TEXT,
        category_id INTEGER,
        FOREIGN KEY(category_id) REFERENCES categories(id)
    )`);

    // Create Orders Table
    db.run(`CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        total_amount INTEGER,
        discount_amount INTEGER DEFAULT 0,
        final_amount INTEGER,
        coupon_id INTEGER,
        shipping_address TEXT,
        status TEXT DEFAULT 'pending',
        items_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Seed Categories
    db.run(`INSERT INTO categories (id, name) VALUES (1, 'Thời trang'), (2, 'Điện tử'), (3, 'Gia dụng'), (4, 'Phụ kiện'), (5, 'Sách')`);

    // Seed Coupons
    db.run(`INSERT INTO coupons (code, type, discount_value, min_order_amount, expired_at, is_active, max_uses_per_user) VALUES
        ('SAVE10', 'percent', 10, 0, '2030-12-31', 1, 5),
        ('BIGBUY', 'fixed', 50000, 300000, '2030-12-31', 1, 3),
        ('VIP100', 'fixed', 100000, 500000, '2030-12-31', 1, 2),
        ('EXPIRED', 'percent', 20, 0, '2020-01-01', 0, 1)
    `);

    // Seed Default Users
    db.run(`INSERT INTO users (name, email, password, role) VALUES
        ('Administrator', 'admin@eshop.com', 'Admin123!', 'admin'),
        ('Test User', 'test@eshop.com', 'Test1234!', 'user')
    `);

    // Seed Products
    db.run(`INSERT INTO products (name, price, description, imageUrl, category_id) VALUES
        ('Áo thun cotton Basic', 150000, 'Áo thun 100% cotton thoáng mát', 'https://via.placeholder.com/150', 1),
        ('Quần jeans Slimfit Nam', 350000, 'Quần jeans co giãn phong cách', 'https://via.placeholder.com/150', 1),
        ('Giày thể thao Sneaker Pro', 650000, 'Giày thể thao êm chân', 'https://via.placeholder.com/150', 1),
        ('Tai nghe không dây TrueWireless', 450000, 'Tai nghe chống ồn chủ động', 'https://via.placeholder.com/150', 2),
        ('Bàn phím cơ RGB TKL', 850000, 'Switch cơ học tuổi thọ 50tr lần', 'https://via.placeholder.com/150', 2),
        ('Chuột gaming không dây Ultra', 520000, 'Cảm biến quang học 16000 DPI', 'https://via.placeholder.com/150', 2),
        ('Bình giữ nhiệt Inox 500ml', 180000, 'Giữ nhiệt 24 giờ liên tục', 'https://via.placeholder.com/150', 3),
        ('Balo laptop chống nước', 290000, 'Chứa laptop 15.6 inch tiện dụng', 'https://via.placeholder.com/150', 4),
        ('Đồng hồ thông minh SmartWatch V2', 1200000, 'Đo nhịp tim SpO2', 'https://via.placeholder.com/150', 2),
        ('Sạc dự phòng 20000mAh PD', 390000, 'Sạc nhanh 22.5W', 'https://via.placeholder.com/150', 2)
    `);

    console.log('[SUCCESS] Database reset and re-seeded successfully!');
    db.close();
});
