/**
 * ==============================================================================
 * Test Plan: 23127327_Load_20260902.js
 * Scenario: Load Testing (Peak Traffic Load - 50 VUs)
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

// Load Testing Options (Peak Traffic: 50 VUs)
export const options = {
    stages: [
        { duration: '2m', target: 50 }, // Ramp-up to 50 VUs
        { duration: '5m', target: 50 }, // Sustained load at 50 VUs
        { duration: '1m', target: 0 },  // Ramp-down to 0 VUs
    ],
    thresholds: {
        'http_req_duration{name:01_Login}': ['p(95)<1500'],
        'http_req_duration{name:02_BrowseProducts}': ['p(95)<800'],
        'http_req_duration{name:03_ProductDetail}': ['p(95)<800'],
        'http_req_duration{name:04_ApplyCoupon}': ['p(95)<1000'],
        'http_req_duration{name:05_Checkout}': ['p(95)<1500'],
        'http_req_duration{name:06_CouponUsage}': ['p(95)<1000'],
        'http_req_duration{name:07_MyOrders}': ['p(95)<1000'],
        http_req_failed: ['rate<0.05'], // Max 5% error tolerance
    },
};

export default function () {
    // Pick unique user per VU to avoid lockout collisions
    const user = users[__VU % users.length];
    const product = products[Math.floor(Math.random() * products.length)];
    const orderInfo = ordersData[Math.floor(Math.random() * ordersData.length)];

    let token = null;
    let userId = null;
    let couponId = null;

    // STEP 1: Auth-heavy - Login
    const loginPayload = JSON.stringify({
        email: user.email,
        password: user.password,
    });

    const loginRes = http.post(`${BASE_URL}/api/login`, loginPayload, {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: '01_Login' },
    });

    const loginCheck = check(loginRes, {
        'Login status is 200': (r) => r.status === 200,
        'Login returns token': (r) => r.json('token') !== undefined,
        'Login account not locked (not 403)': (r) => r.status !== 403,
    });

    if (loginRes.status === 200) {
        token = loginRes.json('token');
        userId = loginRes.json('user.id');
    }

    // Realistic stochastic think-time (1s to 3s)
    sleep(Math.random() * 2 + 1);

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };

    // STEP 2: Read-heavy - Browse & Detail
    const prodListRes = http.get(`${BASE_URL}/api/products`, {
        headers: authHeaders,
        tags: { name: '02_BrowseProducts' },
    });
    check(prodListRes, {
        'Product list status is 200': (r) => r.status === 200,
        'Product list is array': (r) => Array.isArray(r.json()),
    });

    sleep(Math.random() * 2 + 1);

    if (product && product.id) {
        const prodDetailRes = http.get(`${BASE_URL}/api/products/${product.id}`, {
            headers: authHeaders,
            tags: { name: '03_ProductDetail' },
        });
        check(prodDetailRes, {
            'Product detail status is 200': (r) => r.status === 200,
            'Product price is number (Detect BUG #3: string on even IDs)': (r) => typeof r.json('price') === 'number',
        });
    }

    sleep(Math.random() * 2 + 1);

    // STEP 3: Coupon Validation (Endpoint: POST /api/apply-coupon)
    const productPrice = product ? parseInt(product.price || 150000) : 150000;
    const quantity = parseInt(orderInfo.quantity || 1);
    const totalAmount = productPrice * quantity;

    if (orderInfo && orderInfo.coupon_code) {
        const couponPayload = JSON.stringify({
            code: orderInfo.coupon_code,
            total_amount: totalAmount,
            user_id: userId || 1,
        });

        const couponRes = http.post(`${BASE_URL}/api/apply-coupon`, couponPayload, {
            headers: authHeaders,
            tags: { name: '04_ApplyCoupon' },
        });

        check(couponRes, {
            'Coupon endpoint responds': (r) => r.status === 200 || r.status === 400 || r.status === 404,
            'Coupon discount valid (Detect BUG #1: negative percent discount)': (r) => {
                if (r.status === 200 && r.json('success')) {
                    couponId = r.json('coupon_id');
                    return r.json('final_amount') < totalAmount && r.json('discount_amount') > 0;
                }
                return true;
            },
        });
    }

    sleep(Math.random() * 2 + 1);

    // STEP 4: Transactional - Checkout (Endpoint: POST /api/checkout)
    if (token) {
        const checkoutPayload = JSON.stringify({
            total_amount: totalAmount,
            shipping_address: orderInfo.shipping_address || '123 Test St, Q1, HCMC',
        });

        const checkoutRes = http.post(`${BASE_URL}/api/checkout`, checkoutPayload, {
            headers: authHeaders,
            tags: { name: '05_Checkout' },
        });

        check(checkoutRes, {
            'Checkout status is 200': (r) => r.status === 200,
            'Checkout returns orderId': (r) => r.json('orderId') !== undefined,
        });
    }

    sleep(Math.random() * 2 + 1);

    // STEP 5: Record Coupon Usage (Endpoint: POST /api/coupon-usage)
    if (token && couponId) {
        const usagePayload = JSON.stringify({
            coupon_id: couponId,
        });

        const usageRes = http.post(`${BASE_URL}/api/coupon-usage`, usagePayload, {
            headers: authHeaders,
            tags: { name: '06_CouponUsage' },
        });

        check(usageRes, {
            'Coupon usage recorded': (r) => r.status === 200,
        });
    }

    sleep(Math.random() * 2 + 1);

    // STEP 6: Transactional Verification - Order History (Endpoint: GET /api/orders/my-orders)
    if (token) {
        const myOrdersRes = http.get(`${BASE_URL}/api/orders/my-orders`, {
            headers: authHeaders,
            tags: { name: '07_MyOrders' },
        });

        check(myOrdersRes, {
            'My orders status is 200': (r) => r.status === 200,
            'My orders is array': (r) => Array.isArray(r.json()),
        });
    }

    sleep(Math.random() * 2 + 1);
}
