/**
 * ==============================================================================
 * Test Plan: 23127327_Stress_20260902.js
 * Scenario: Stress Testing (Stepped Ramp-up to 200 VUs Breaking Point)
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
        { duration: '45s', target: 10 },  // Step 1: 10 VUs
        { duration: '45s', target: 30 },  // Step 2: 30 VUs
        { duration: '45s', target: 70 },  // Step 3: 70 VUs
        { duration: '45s', target: 120 }, // Step 4: 120 VUs
        { duration: '45s', target: 200 }, // Step 5: 200 VUs (Saturation Breaking Point)
        { duration: '30s', target: 0 },   // Ramp-down
    ],
    thresholds: {
        'http_req_duration{name:01_Login}': ['p(95)<3000'],
        'http_req_duration{name:05_Checkout}': ['p(95)<4000'],
        http_req_failed: ['rate<0.25'], // Tolerate up to 25% failure during stress breaking point
    },
};

export default function () {
    const user = users[__VU % users.length];
    const product = products[Math.floor(Math.random() * products.length)];
    const orderInfo = ordersData[Math.floor(Math.random() * ordersData.length)];

    let token = null;
    let userId = null;
    let couponId = null;

    // STEP 1: Login
    const loginRes = http.post(`${BASE_URL}/api/login`, JSON.stringify({
        email: user.email,
        password: user.password,
    }), {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: '01_Login' },
    });

    const isLocked = (loginRes.status === 403);
    check(loginRes, {
        'Login success (200)': (r) => r.status === 200,
        'Account Locked detected (403 - FR-02 Lockout Triggered)': (r) => isLocked,
    });

    if (loginRes.status === 200) {
        token = loginRes.json('token');
        userId = loginRes.json('user.id');
    }

    sleep(1);

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };

    // STEP 2: Products
    const prodListRes = http.get(`${BASE_URL}/api/products`, {
        headers: authHeaders,
        tags: { name: '02_BrowseProducts' },
    });
    check(prodListRes, { 'Browse status 200': (r) => r.status === 200 });

    if (product && product.id) {
        const prodDetailRes = http.get(`${BASE_URL}/api/products/${product.id}`, {
            headers: authHeaders,
            tags: { name: '03_ProductDetail' },
        });
        check(prodDetailRes, {
            'Product detail status 200': (r) => r.status === 200,
            'Price type check (Detect BUG #3 string on even IDs)': (r) => typeof r.json('price') === 'number',
        });
    }

    sleep(1);

    // STEP 3: Apply Coupon
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

        check(couponRes, {
            'Coupon response valid': (r) => r.status === 200 || r.status === 400 || r.status === 404,
            'Coupon discount valid (Detect BUG #1: negative discount on percent)': (r) => {
                if (r.status === 200 && r.json('success')) {
                    couponId = r.json('coupon_id');
                    return r.json('final_amount') < totalAmount && r.json('discount_amount') > 0;
                }
                return true;
            },
        });
    }

    sleep(1);

    // STEP 4: Checkout (High stress point: concurrent SQLite writes)
    if (token) {
        const checkoutRes = http.post(`${BASE_URL}/api/checkout`, JSON.stringify({
            total_amount: totalAmount,
            shipping_address: orderInfo.shipping_address || '456 Stress Way, Q1, HCMC',
        }), {
            headers: authHeaders,
            tags: { name: '05_Checkout' },
        });

        check(checkoutRes, {
            'Checkout success (200)': (r) => r.status === 200,
            'Detect SQLite DB lock / 500 error under high concurrency': (r) => r.status !== 500,
        });
    }

    sleep(1);

    // STEP 5: Coupon Usage
    if (token && couponId) {
        http.post(`${BASE_URL}/api/coupon-usage`, JSON.stringify({ coupon_id: couponId }), {
            headers: authHeaders,
            tags: { name: '06_CouponUsage' },
        });
    }

    sleep(1);

    // STEP 6: My Orders
    if (token) {
        const historyRes = http.get(`${BASE_URL}/api/orders/my-orders`, {
            headers: authHeaders,
            tags: { name: '07_MyOrders' },
        });
        check(historyRes, { 'My orders status 200': (r) => r.status === 200 });
    }

    sleep(1);
}
