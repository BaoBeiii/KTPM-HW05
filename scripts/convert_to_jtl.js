/**
 * Utility Script: convert_to_jtl.js
 * Purpose: Convert k6 execution raw_metrics.csv to JMeter-compatible .jtl format
 */

const fs = require('fs');
const path = require('path');

const scenario = process.argv[2] || 'load';
const csvPath = path.resolve(__dirname, `../results/${scenario}/raw_metrics.csv`);
const jtlPath = path.resolve(__dirname, `../results/${scenario}/raw_${scenario}.jtl`);

if (!fs.existsSync(csvPath)) {
    console.log(`[INFO] CSV not found at ${csvPath}`);
    process.exit(0);
}

console.log(`[INFO] Converting ${csvPath} to ${jtlPath}...`);

const lines = fs.readFileSync(csvPath, 'utf-8').split('\n');
const header = lines[0].split(',');
const metricNameIdx = header.indexOf('metric_name');
const timestampIdx = header.indexOf('timestamp');
const valueIdx = header.indexOf('metric_value');
const expectedResponseIdx = header.indexOf('expected_response');
const nameIdx = header.indexOf('name');

const jtlHeader = 'timeStamp,elapsed,label,responseCode,responseMessage,threadName,dataType,success,failureMessage,bytes,sentBytes,grpThreads,allThreads,URL,Latency,IdleTime,Connect\n';
let jtlContent = jtlHeader;

let rowCount = 0;
for (let i = 1; i < lines.length && rowCount < 5000; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts[metricNameIdx] === 'http_req_duration') {
        const timeStamp = parseInt(parts[timestampIdx]) * 1000;
        const elapsed = Math.round(parseFloat(parts[valueIdx]));
        const label = parts[nameIdx] || 'HTTP_Request';
        const isSuccess = parts[expectedResponseIdx] === 'true';
        const responseCode = isSuccess ? '200' : '500';
        const responseMessage = isSuccess ? 'OK' : 'Error';
        const threadName = `${scenario}_Thread 1-1`;
        
        jtlContent += `${timeStamp},${elapsed},${label},${responseCode},${responseMessage},${threadName},text,${isSuccess},,1024,256,50,50,http://localhost:3000,${elapsed},0,1\n`;
        rowCount++;
    }
}

fs.writeFileSync(jtlPath, jtlContent);
console.log(`[SUCCESS] Wrote ${rowCount} records to ${jtlPath}`);
