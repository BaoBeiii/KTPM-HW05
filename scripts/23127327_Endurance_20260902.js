/**
 * ==============================================================================
 * Test Plan: 23127327_Endurance_20260902.js
 * Scenario: Endurance / Soak Testing (15-minute Sustained Load)
 * Student ID: 23127327
 * Date: 2026-09-02
 * Workflow: Login -> Product -> Coupon -> Checkout -> Coupon Usage
 * SUT Endpoints:
 *   1. POST /api/login
 *   2. GET  /api/products & GET /api/products/:id
 *   3. POST /api/apply-coupon
 *   4. POST /api/checkout
 *   5. POST /api/coupon-usage
 *   6. GET  /api/orders/my-orders
 * Tool: k6 v2.1.0
 * Purpose: Empirically determine hardware threshold (Max stable RPS, memory ceiling)
 * ==============================================================================
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import papaparse from './papaparse.js';
import { htmlReport } from './k6-reporter.js';
import { textSummary } from './k6-summary.js';

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
        'http_req_duration{name:01_Login}': ['p(95)<1500'],
        'http_req_duration{name:05_Checkout}': ['p(95)<2000'],
        http_req_failed: ['rate<0.05'],
    },
};

export default function () {
    const user = users[__VU % users.length];
    const product = products[Math.floor(Math.random() * products.length)];
    const orderInfo = ordersData[Math.floor(Math.random() * ordersData.length)];

    let token = null;
    let userId = null;
    let couponId = null;

    // 1. Login
    const loginRes = http.post(`${BASE_URL}/api/login`, JSON.stringify({
        email: user.email,
        password: user.password,
    }), {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: '01_Login' },
    });

    if (loginRes.status === 200) {
        token = loginRes.json('token');
        userId = loginRes.json('user.id');
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

    // 3. Apply Coupon
    const productPrice = product ? parseInt(product.price || 150000) : 150000;
    const quantity = parseInt(orderInfo.quantity || 1);
    const totalAmount = productPrice * quantity;

    if (orderInfo && orderInfo.coupon_code) {
        const couponRes = http.post(`${BASE_URL}/api/apply-coupon`, JSON.stringify({
            code: orderInfo.coupon_code,
            total_amount: totalAmount,
            user_id: userId || 1,
        }), {
            headers: authHeaders,
            tags: { name: '04_ApplyCoupon' },
        });

        if (couponRes.status === 200 && couponRes.json('success')) {
            couponId = couponRes.json('coupon_id');
        }
    }

    sleep(1.5);

    // 4. Checkout
    if (token) {
        http.post(`${BASE_URL}/api/checkout`, JSON.stringify({
            total_amount: totalAmount,
            shipping_address: orderInfo.shipping_address || '101 Soak Way, Q1, HCMC',
        }), {
            headers: authHeaders,
            tags: { name: '05_Checkout' },
        });
    }

    sleep(1.5);

    // 5. Coupon Usage
    if (token && couponId) {
        http.post(`${BASE_URL}/api/coupon-usage`, JSON.stringify({ coupon_id: couponId }), {
            headers: authHeaders,
            tags: { name: '06_CouponUsage' },
        });
    }

    sleep(1.5);

    // 6. My Orders
    if (token) {
        http.get(`${BASE_URL}/api/orders/my-orders`, { headers: authHeaders, tags: { name: '07_MyOrders' } });
    }

    sleep(1.5);
}

export function handleSummary(data) {
    return {
        'results/endurance/summary.html': htmlReport(data),
        'results/endurance/metrics.json': JSON.stringify(data, null, 2),
        stdout: textSummary(data, { indent: ' ', enableColors: true }),
    };
}
