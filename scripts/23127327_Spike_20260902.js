/**
 * ==============================================================================
 * Test Plan: 23127327_Spike_20260902.js
 * Scenario: Spike Testing (Sudden Surge & Recovery) - Initial AI-Generated Version
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

// Spike Testing Options (Sudden surge to 150 VUs in 10s)
export const options = {
    stages: [
        { duration: '30s', target: 5 },   // Low baseline traffic (5 VUs)
        { duration: '10s', target: 150 }, // Sudden sharp spike to 150 VUs!
        { duration: '30s', target: 150 }, // Hold spike peak
        { duration: '10s', target: 5 },   // Sudden drop back to baseline
        { duration: '30s', target: 5 },   // Recovery observation period
    ],
    thresholds: {
        http_req_duration: ['p(95)<2500'],
        http_req_failed: ['rate<0.20'],
    },
};

export default function () {
    const user = users[__VU % users.length];
    const product = products[Math.floor(Math.random() * products.length)];
    const orderInfo = ordersData[Math.floor(Math.random() * ordersData.length)];

    let token = null;

    // STEP 1: Login
    const loginRes = http.post(`${BASE_URL}/api/login`, JSON.stringify({
        email: user.email,
        password: user.password,
    }), {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: '01_Login' },
    });

    const loginSuccess = check(loginRes, {
        'Login successful (200)': (r) => r.status === 200,
    });

    if (loginSuccess && loginRes.json('token')) {
        token = loginRes.json('token');
    }

    sleep(1);

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };

    // STEP 2: Browse & Detail
    const prodListRes = http.get(`${BASE_URL}/api/products`, {
        headers: authHeaders,
        tags: { name: '02_BrowseProducts' },
    });
    check(prodListRes, { 'Browse ok': (r) => r.status === 200 });

    if (product && product.id) {
        const prodDetailRes = http.get(`${BASE_URL}/api/products/${product.id}`, {
            headers: authHeaders,
            tags: { name: '03_ProductDetail' },
        });
        check(prodDetailRes, { 'Detail ok': (r) => r.status === 200 });
    }

    sleep(1);

    // STEP 3: Coupon
    if (orderInfo && orderInfo.coupon_code) {
        const couponRes = http.post(`${BASE_URL}/api/coupons/apply`, JSON.stringify({
            code: orderInfo.coupon_code,
        }), {
            headers: authHeaders,
            tags: { name: '04_ValidateCoupon' },
        });
        check(couponRes, { 'Coupon valid': (r) => r.status === 200 || r.status === 400 });
    }

    sleep(1);

    // STEP 4: Checkout
    if (token && product && product.id) {
        const checkoutRes = http.post(`${BASE_URL}/api/orders`, JSON.stringify({
            items: [{ product_id: parseInt(product.id), quantity: parseInt(orderInfo.quantity || 1) }],
            shipping_address: orderInfo.shipping_address || '789 Spike Blvd, Q3, HCMC',
            coupon_code: orderInfo.coupon_code || '',
        }), {
            headers: authHeaders,
            tags: { name: '05_CheckoutOrder' },
        });

        check(checkoutRes, { 'Order placed': (r) => r.status === 200 || r.status === 201 });
    }

    sleep(1);

    // STEP 5: Order History & Coupon Usage
    if (token) {
        const historyRes = http.get(`${BASE_URL}/api/orders`, {
            headers: authHeaders,
            tags: { name: '06_CouponUsage_OrderHistory' },
        });
        check(historyRes, { 'History ok': (r) => r.status === 200 });
    }

    sleep(1);
}
