/**
 * ==============================================================================
 * Test Plan: 23127327_Stress_20260902.js
 * Scenario: Stress Testing (Stepped Ramp-up to Breaking Point) - Initial AI-Generated Version
 * Student ID: 23127327
 * Date: 2026-09-02
 * Workflow: Login -> Product -> Coupon -> Checkout -> Coupon Usage
 * Tool: k6 v2.1.0
 * ==============================================================================
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

// Base Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Data-Driven CSV Loading
const users = new SharedArray('users', function () {
    return papaparse.parse(open('../data/users.csv'), { header: true }).data;
});

const products = new SharedArray('products', function () {
    return papaparse.parse(open('../data/products.csv'), { header: true }).data;
});

const ordersData = new SharedArray('orders', function () {
    return papaparse.parse(open('../data/orders.csv'), { header: true }).data;
});

// Stress Testing Options (Stepped progression up to 200 VUs)
export const options = {
    stages: [
        { duration: '45s', target: 10 },  // Step 1: 10 VUs
        { duration: '45s', target: 30 },  // Step 2: 30 VUs
        { duration: '45s', target: 70 },  // Step 3: 70 VUs
        { duration: '45s', target: 120 }, // Step 4: 120 VUs
        { duration: '45s', target: 200 }, // Step 5: 200 VUs (Saturation Point)
        { duration: '30s', target: 0 },   // Recovery
    ],
    thresholds: {
        http_req_duration: ['p(95)<3000'],
        http_req_failed: ['rate<0.15'],
    },
};

export default function () {
    // Pick user from CSV
    const user = users[__VU % users.length];
    const product = products[Math.floor(Math.random() * products.length)];
    const orderInfo = ordersData[Math.floor(Math.random() * ordersData.length)];

    let token = null;

    // STEP 1: Auth-heavy - Login
    const loginPayload = JSON.stringify({
        email: user.email,
        password: user.password,
    });

    const loginRes = http.post(`${BASE_URL}/api/login`, loginPayload, {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: '01_Login' },
    });

    // AI Check flaw: under heavy stress, login may fail with 403 Lockout or 500 DB busy
    const loginSuccess = check(loginRes, {
        'Login success (200)': (r) => r.status === 200,
    });

    if (loginSuccess && loginRes.json('token')) {
        token = loginRes.json('token');
    }

    sleep(0.5); // Minimal think time in initial AI stress plan

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };

    // STEP 2: Read-heavy - Product Browse & Detail
    const prodListRes = http.get(`${BASE_URL}/api/products`, {
        headers: authHeaders,
        tags: { name: '02_BrowseProducts' },
    });
    check(prodListRes, {
        'Product list retrieved': (r) => r.status === 200,
    });

    if (product && product.id) {
        const prodDetailRes = http.get(`${BASE_URL}/api/products/${product.id}`, {
            headers: authHeaders,
            tags: { name: '03_ProductDetail' },
        });
        check(prodDetailRes, {
            'Product detail retrieved': (r) => r.status === 200,
        });
    }

    sleep(0.5);

    // STEP 3: Coupon Validation
    if (orderInfo && orderInfo.coupon_code) {
        const couponPayload = JSON.stringify({
            code: orderInfo.coupon_code,
        });
        const couponRes = http.post(`${BASE_URL}/api/coupons/apply`, couponPayload, {
            headers: authHeaders,
            tags: { name: '04_ValidateCoupon' },
        });
        check(couponRes, {
            'Coupon response valid': (r) => r.status === 200 || r.status === 400,
        });
    }

    sleep(0.5);

    // STEP 4: Transactional - Checkout / Create Order (Stress Point: Concurrent SQLite writes)
    if (token && product && product.id) {
        const orderPayload = JSON.stringify({
            items: [{ product_id: parseInt(product.id), quantity: parseInt(orderInfo.quantity || 1) }],
            shipping_address: orderInfo.shipping_address || '456 Stress St, Q1, HCMC',
            coupon_code: orderInfo.coupon_code || '',
        });

        const checkoutRes = http.post(`${BASE_URL}/api/orders`, orderPayload, {
            headers: authHeaders,
            tags: { name: '05_CheckoutOrder' },
        });

        check(checkoutRes, {
            'Order checkout processed': (r) => r.status === 200 || r.status === 201,
        });
    }

    sleep(0.5);

    // STEP 5: Transactional / Audit - Verify Order History & Coupon Usage
    if (token) {
        const historyRes = http.get(`${BASE_URL}/api/orders`, {
            headers: authHeaders,
            tags: { name: '06_CouponUsage_OrderHistory' },
        });
        check(historyRes, {
            'Order history retrieved': (r) => r.status === 200,
        });
    }

    sleep(0.5);
}
