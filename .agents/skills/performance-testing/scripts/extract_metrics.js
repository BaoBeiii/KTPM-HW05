#!/usr/bin/env node
/**
 * Utility Script: extract_metrics.js
 * Purpose: Extract k6 execution metrics from metrics.json, evaluate against SLA thresholds,
 *          detect performance regressions, and generate Markdown summary tables.
 * Author: BaoBeiii (23127327)
 */

const fs = require('fs');
const path = require('path');

const metricsPath = process.argv[2] || path.resolve(__dirname, '../results/load/metrics.json');
const slaPath = path.resolve(__dirname, '../.agents/skills/performance-testing/references/sla_matrix.json');

console.log('='.repeat(75));
console.log('  PERFORMANCE REGRESSION & SLA QUALITY GATE AUDITOR');
console.log('='.repeat(75));
console.log(`[INFO] Reading execution metrics from: ${metricsPath}`);

if (!fs.existsSync(metricsPath)) {
    console.error(`[ERROR] Metrics file not found at: ${metricsPath}`);
    process.exit(1);
}

let metricsData;
try {
    metricsData = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
} catch (e) {
    console.error(`[ERROR] Failed to parse metrics JSON: ${e.message}`);
    process.exit(1);
}

let slaConfig = {
    sla_thresholds: {
        '01_Login': { p95_ms: 1500 },
        '02_BrowseProducts': { p95_ms: 800 },
        '03_ProductDetail': { p95_ms: 800 },
        '04_ApplyCoupon': { p95_ms: 1000 },
        '05_Checkout': { p95_ms: 1500 },
        '06_CouponUsage': { p95_ms: 1000 },
        '07_MyOrders': { p95_ms: 1000 },
        'overall': { p95_ms: 1500 }
    }
};

if (fs.existsSync(slaPath)) {
    try {
        slaConfig = JSON.parse(fs.readFileSync(slaPath, 'utf-8'));
    } catch (e) {
        console.warn(`[WARN] Could not parse SLA matrix, using defaults: ${e.message}`);
    }
}

const metrics = metricsData.metrics || {};
let hasSlaViolation = false;
const tableRows = [];

function getLatency(metricObj) {
    if (!metricObj) return { p95: 0, avg: 0, med: 0, max: 0 };
    const values = metricObj.values || {};
    return {
        p95: values['p(95)'] !== undefined ? Math.round(values['p(95)'] * 100) / 100 : 0,
        avg: values['avg'] !== undefined ? Math.round(values['avg'] * 100) / 100 : 0,
        med: values['med'] !== undefined ? Math.round(values['med'] * 100) / 100 : 0,
        max: values['max'] !== undefined ? Math.round(values['max'] * 100) / 100 : 0
    };
}

const overallDuration = getLatency(metrics['http_req_duration']);
const overallReqs = metrics['http_reqs'] ? metrics['http_reqs'].values.count : 0;
const overallRps = metrics['http_reqs'] ? Math.round(metrics['http_reqs'].values.rate * 100) / 100 : 0;

console.log(`[SUMMARY] Total Requests: ${overallReqs} | Throughput: ${overallRps} req/s | Overall p95: ${overallDuration.p95} ms`);

const transactions = [
    '01_Login',
    '02_BrowseProducts',
    '03_ProductDetail',
    '04_ApplyCoupon',
    '05_Checkout',
    '06_CouponUsage',
    '07_MyOrders'
];

transactions.forEach((tx) => {
    const key = `http_req_duration{name:${tx}}`;
    const metric = metrics[key] || metrics[`http_req_duration{expected_response:true,name:${tx}}`];
    const lat = getLatency(metric);
    const sla = slaConfig.sla_thresholds[tx] || { p95_ms: 1000 };
    const threshold = sla.p95_ms;
    
    let status = 'PASS';
    if (lat.p95 > threshold) {
        status = 'FAIL (REGRESSION)';
        hasSlaViolation = true;
    }

    tableRows.push({
        Transaction: tx,
        Observed_p95: `${lat.p95} ms`,
        Average: `${lat.avg} ms`,
        Max: `${lat.max} ms`,
        SLA_Threshold: `< ${threshold} ms`,
        Status: status
    });
});

console.log('\n### 📊 Performance Regression Evaluation Table\n');
console.log('| Transaction Step | Observed p(95) | Mean (Avg) | Max Latency | Target SLA | Status |');
console.log('| :--- | :---: | :---: | :---: | :---: | :---: |');
tableRows.forEach(r => {
    const icon = r.Status.startsWith('PASS') ? '✅' : '❌';
    console.log(`| **${r.Transaction}** | ${r.Observed_p95} | ${r.Average} | ${r.Max} | ${r.SLA_Threshold} | ${icon} ${r.Status} |`);
});
console.log(`| **Overall Pipeline** | **${overallDuration.p95} ms** | **${overallDuration.avg} ms** | **${overallDuration.max} ms** | **< 1500 ms** | ${overallDuration.p95 <= 1500 ? '✅ PASS' : '❌ FAIL'} |`);

console.log('\n' + '='.repeat(75));
if (hasSlaViolation) {
    console.error('❌ [GATE REJECTED] Performance regression detected! At least one endpoint breached SLA threshold.');
    process.exit(1);
} else {
    console.log('✅ [GATE APPROVED] All transactions satisfied SLA benchmarks. No performance regression found.');
    process.exit(0);
}
