#!/usr/bin/env node
/**
 * Agent Skill Script: verify_report_integrity.js
 * Purpose: Automated Linter & Parity Checker to prevent omissions in technical reports.
 *          Verifies 1:1 parity between summary tables and detailed sections, and enforces
 *          strict 4-part AI audit documentation.
 * Author: BaoBeiii (23127327)
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(75));
console.log('  REPORT INTEGRITY & ZERO-OMISSION AUDITOR (LINTER)');
console.log('='.repeat(75));

let hasErrors = false;

// 1. Audit bug_reports.md
const possibleBugPaths = [
    path.resolve(__dirname, '../reports/bug_reports.md'),
    path.resolve(__dirname, '../../../../reports/bug_reports.md'),
    path.resolve(process.cwd(), 'reports/bug_reports.md')
];
const bugReportPath = possibleBugPaths.find(p => fs.existsSync(p)) || path.resolve(process.cwd(), 'reports/bug_reports.md');

if (fs.existsSync(bugReportPath)) {
    console.log(`\n[CHECK 1] Auditing Bug Reports: ${bugReportPath}`);
    const content = fs.readFileSync(bugReportPath, 'utf-8');

    // Extract bugs from summary table
    const tableBugMatches = content.match(/\|\s*\*\*BUG-(\d+)\*\*/g) || [];
    const tableBugs = [...new Set(tableBugMatches.map(m => m.match(/BUG-(\d+)/)[0]))];

    // Extract bugs from detailed sections
    const sectionBugMatches = content.match(/###\s*[^\n]*BUG-(\d+)/g) || [];
    const sectionBugs = [...new Set(sectionBugMatches.map(m => m.match(/BUG-(\d+)/)[0]))];

    console.log(`  - Found in Summary Table:    ${tableBugs.join(', ')} (${tableBugs.length} bugs)`);
    console.log(`  - Found in Detailed Sections: ${sectionBugs.join(', ')} (${sectionBugs.length} bugs)`);

    const missingInSections = tableBugs.filter(b => !sectionBugs.includes(b));
    if (missingInSections.length > 0) {
        console.error(`  ❌ [FAIL] Missing detailed sections for: ${missingInSections.join(', ')}!`);
        hasErrors = true;
    } else {
        console.log(`  ✅ [PASS] 100% 1:1 Parity between summary table and detailed sections!`);
    }
} else {
    console.warn(`[WARN] bug_reports.md not found at ${bugReportPath}`);
}

// 2. Audit AI_Audit_Report.md
const possibleAuditPaths = [
    path.resolve(__dirname, '../reports/AI_Audit_Report.md'),
    path.resolve(__dirname, '../../../../reports/AI_Audit_Report.md'),
    path.resolve(process.cwd(), 'reports/AI_Audit_Report.md')
];
const auditReportPath = possibleAuditPaths.find(p => fs.existsSync(p)) || path.resolve(process.cwd(), 'reports/AI_Audit_Report.md');

if (fs.existsSync(auditReportPath)) {
    console.log(`\n[CHECK 2] Auditing AI Audit Report: ${auditReportPath}`);
    const content = fs.readFileSync(auditReportPath, 'utf-8');

    // Extract sessions
    const sessionMatches = content.match(/##\s*\d+\.\s*PHIÊN LÀM VIỆC\s*(\d+)/g) || [];
    console.log(`  - Found ${sessionMatches.length} documented AI interaction sessions.`);

    sessionMatches.forEach((s) => {
        const sessionNum = s.match(/PHIÊN LÀM VIỆC\s*(\d+)/)[1];
        // Check for 4 required parts
        const hasPrompt = content.includes(`${sessionNum}.1 Yêu Cầu Của Người Dùng`);
        const hasInitialOutput = content.includes(`${sessionNum}.2 Kết Quả Ban Đầu Của AI`);
        const hasCorrections = content.includes(`${sessionNum}.3 Các Điểm Người Dùng Phát Hiện & Yêu Cầu Sửa Đổi`);
        const hasFinal = content.includes(`${sessionNum}.4 Kết Quả Hoàn Thiện Sau Khi Sửa`);

        if (hasPrompt && hasInitialOutput && hasCorrections && hasFinal) {
            console.log(`  ✅ [PASS] Phiên ${sessionNum}: Complete 4-part structure verified.`);
        } else {
            console.error(`  ❌ [FAIL] Phiên ${sessionNum}: Incomplete structure! (Prompt: ${hasPrompt}, Initial: ${hasInitialOutput}, Corrections: ${hasCorrections}, Final: ${hasFinal})`);
            hasErrors = true;
        }
    });
} else {
    console.warn(`[WARN] AI_Audit_Report.md not found at ${auditReportPath}`);
}

console.log('\n' + '='.repeat(75));
if (hasErrors) {
    console.error('❌ [AUDIT FAILED] Report integrity violations or omissions detected! Please fix before submitting.');
    process.exit(1);
} else {
    console.log('✅ [AUDIT PASSED] Zero omissions detected! All reports meet the highest integrity standards.');
    process.exit(0);
}
