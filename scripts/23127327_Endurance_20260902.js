/**
 * ==============================================================================
 * Test Plan: 23127327_Endurance_20260902.js
 * Scenario: Endurance / Soak Testing (15-minute Sustained Load) - Initial AI Version
 * Student ID: 23127327
 * Date: 2026-09-02
 * Workflow: Login -> Product -> Coupon -> Checkout -> Coupon Usage
 * Tool: k6 v2.1.0
 * Purpose: Empirically determine local hardware threshold (Max stable RPS, memory ceiling)
 * ==============================================================================
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const users = new SharedArray('users', function () {
    return papaparse.parse(open('../data/users.csv'), { header: true }).data;
});

const products = new SharedArray('products', function () {
    return papaparse.parse(open('../data/products.csv'), { header: true }).data;
});

const ordersData = new SharedArray('orders', function () {
    return papaparse.parse(open('../data/orders.csv'), { header: true }).data;
});

export const options = {
    stages: [
        { duration: '1m', target: 30 },  // Ramp-up to stable 30 VUs
        { duration: '13m', target: 30 }, // Sustained soak load for 13 minutes (Total ~15m)
        { duration: '1m', target: 0 },   // Ramp-down
    ],
    thresholds: {
        http_req_duration: ['p(95)<1000'],
        http_req_failed: ['rate<0.02'],
    },
};

export default function () {
    const user = users[__VU % users.length];
    const product = products[Math.floor(Math.random() * products.length)];
    const orderInfo = ordersData[Math.floor(Math.random() * ordersData.length)];

    let token = null;

    // 1. Login
    const loginRes = http.post(`${BASE_URL}/api/login`, JSON.stringify({
        email: user.email,
        password: user.password,
    }), {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: '01_Login' },
    });

    if (loginRes.status === 200 && loginRes.json('token')) {
        token = loginRes.json('token');
    }

    sleep(1.5);

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };

    // 2. Browse & Detail
    http.get(`${BASE_URL}/api/products`, { headers: authHeaders, tags: { name: '02_BrowseProducts' } });
    if (product && product.id) {
        http.get(`${BASE_URL}/api/products/${product.id}`, { headers: authHeaders, tags: { name: '03_ProductDetail' } });
    }

    sleep(1.5);

    // 3. Coupon
    if (orderInfo && orderInfo.coupon_code) {
        http.post(`${BASE_URL}/api/coupons/apply`, JSON.stringify({ code: orderInfo.coupon_code }), {
            headers: authHeaders,
            tags: { name: '04_ValidateCoupon' },
        });
    }

    sleep(1.5);

    // 4. Checkout
    if (token && product && product.id) {
        http.post(`${BASE_URL}/api/orders`, JSON.stringify({
            items: [{ product_id: parseInt(product.id), quantity: parseInt(orderInfo.quantity || 1) }],
            shipping_address: orderInfo.shipping_address || '101 Soak Way, Q1, HCMC',
            coupon_code: orderInfo.coupon_code || '',
        }), {
            headers: authHeaders,
            tags: { name: '05_CheckoutOrder' },
        });
    }

    sleep(1.5);

    // 5. Order History
    if (token) {
        http.get(`${BASE_URL}/api/orders`, { headers: authHeaders, tags: { name: '06_CouponUsage_OrderHistory' } });
    }

    sleep(1.5);
}
