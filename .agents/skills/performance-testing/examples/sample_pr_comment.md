## 🚀 Automated Performance Regression Audit Report

**Build Status:** ✅ PASS (No Performance Regression)  
**Target SUT:** EShop Backend (`http://localhost:3000`)  
**Trigger:** Pull Request CI Performance Check  
**Tooling:** k6 v2.1.0 / Grafana k6 GitHub Action  

### 📊 Metric Evaluation Against SLA Benchmarks

| Transaction Step | Observed p(95) | Mean (Avg) | Max Latency | Target SLA | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **01_Login** | 1.85 ms | 1.29 ms | 5.83 ms | < 1500 ms | ✅ PASS |
| **02_BrowseProducts** | 1.48 ms | 1.02 ms | 3.41 ms | < 800 ms | ✅ PASS |
| **03_ProductDetail** | 1.41 ms | 0.98 ms | 5.03 ms | < 800 ms | ✅ PASS |
| **04_ApplyCoupon** | 1.79 ms | 1.30 ms | 4.79 ms | < 1000 ms | ✅ PASS |
| **05_Checkout** | 6.95 ms | 5.05 ms | 8.42 ms | < 1500 ms | ✅ PASS |
| **06_CouponUsage** | 6.29 ms | 5.51 ms | 6.30 ms | < 1000 ms | ✅ PASS |
| **07_MyOrders** | 1.69 ms | 1.25 ms | 1.74 ms | < 1000 ms | ✅ PASS |
| **Overall Pipeline** | **1.74 ms** | **1.17 ms** | **8.42 ms** | **< 1500 ms** | ✅ PASS |

### 🔍 Regression Gate Verdict
- Total Requests Evaluated: **5,235**
- Overall Throughput: **10.61 req/s**
- Latency Degradation vs Baseline: **+0.00%** (Well within the 20% tolerance limit)
- **Quality Gate:** APPROVED. This Pull Request is safe to merge without causing performance regression.
