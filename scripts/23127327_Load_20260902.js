/**
 * ==============================================================================
 * Test Plan: 23127327_Load_20260902.js
 * Scenario: Load Testing (Peak Traffic Load) - Initial AI-Generated Version
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

// Load Testing Options (Initial AI Design)
export const options = {
    stages: [
        { duration: '2m', target: 50 }, // Ramp-up to 50 VUs
        { duration: '5m', target: 50 }, // Sustained load at 50 VUs
        { duration: '1m', target: 0 },  // Ramp-down to 0 VUs
    ],
    thresholds: {
        http_req_duration: ['p(95)<1500'], // Generic threshold
        http_req_failed: ['rate<0.05'],     // Generic error threshold
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

    // Basic AI check (flaw: assumes login always succeeds, doesn't gracefully handle lockout)
    const loginSuccess = check(loginRes, {
        'Login status is 200': (r) => r.status === 200,
    });

    if (loginSuccess && loginRes.json('token')) {
        token = loginRes.json('token');
    }

    // Flat think-time (flaw: fixed sleep instead of stochastic user pacing)
    sleep(1);

    // STEP 2: Read-heavy - Product Browse & Detail
    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };

    // 2.1 Get Products List
    const prodListRes = http.get(`${BASE_URL}/api/products`, {
        headers: authHeaders,
        tags: { name: '02_BrowseProducts' },
    });
    check(prodListRes, {
        'Product list status is 200': (r) => r.status === 200,
    });

    sleep(1);

    // 2.2 Get Product Detail
    if (product && product.id) {
        const prodDetailRes = http.get(`${BASE_URL}/api/products/${product.id}`, {
            headers: authHeaders,
            tags: { name: '03_ProductDetail' },
        });
        check(prodDetailRes, {
            'Product detail status is 200': (r) => r.status === 200,
        });
    }

    sleep(1);

    // STEP 3: Coupon Validation (Read/Verification)
    if (orderInfo && orderInfo.coupon_code) {
        const couponPayload = JSON.stringify({
            code: orderInfo.coupon_code,
        });
        const couponRes = http.post(`${BASE_URL}/api/coupons/apply`, couponPayload, {
            headers: authHeaders,
            tags: { name: '04_ValidateCoupon' },
        });
        check(couponRes, {
            'Coupon check response status valid': (r) => r.status === 200 || r.status === 400,
        });
    }

    sleep(1);

    // STEP 4: Transactional - Checkout / Create Order
    if (token && product && product.id) {
        const orderPayload = JSON.stringify({
            items: [{ product_id: parseInt(product.id), quantity: parseInt(orderInfo.quantity || 1) }],
            shipping_address: orderInfo.shipping_address || '123 Test St, Q1, HCMC',
            coupon_code: orderInfo.coupon_code || '',
        });

        const checkoutRes = http.post(`${BASE_URL}/api/orders`, orderPayload, {
            headers: authHeaders,
            tags: { name: '05_CheckoutOrder' },
        });

        check(checkoutRes, {
            'Order created successfully': (r) => r.status === 200 || r.status === 201,
        });
    }

    sleep(1);

    // STEP 5: Transactional / Audit - Verify Order History & Coupon Usage
    if (token) {
        const historyRes = http.get(`${BASE_URL}/api/orders`, {
            headers: authHeaders,
            tags: { name: '06_CouponUsage_OrderHistory' },
        });
        check(historyRes, {
            'Order history status is 200': (r) => r.status === 200,
        });
    }

    sleep(1);
}
