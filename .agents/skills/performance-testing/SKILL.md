---
name: performance-testing
description: Continuous performance testing, metric extraction, SLA regression gate, and zero-omission reporting protocol for e-commerce web applications.
---

# Performance Testing Agent Skill

## 1. Overview
The `performance-testing` skill enables automated agents and CI/CD pipelines to:
- Execute load, stress, and spike test scripts using k6 and JMeter.
- Extract response time percentiles (p90, p95, p99), mean latency, throughput, and error rates from `metrics.json`.
- Compare observed metrics against Service Level Agreements (SLAs) defined in `references/sla_matrix.json`.
- Enforce automated quality gates that block Pull Requests if latency regresses by more than 20% or exceeds SLA limits.
- **Enforce the Zero-Omission & Exhaustive Reporting Protocol**: Guarantee 1:1 parity between summary tables and detailed sections to prevent missing bug write-ups or incomplete audit logs.

## 2. Directory Structure
```text
.agents/skills/performance-testing/
├── SKILL.md                          # Skill definition and protocol instructions
├── scripts/
│   ├── extract_metrics.js            # Automated CLI parser and SLA evaluation gate
│   └── verify_report_integrity.js    # Automated linter checking 1:1 parity & zero omissions
├── references/
│   └── sla_matrix.json               # Benchmark SLA thresholds per endpoint
└── examples/
    └── sample_pr_comment.md          # Sample formatted Markdown comment for GitHub PRs
```

## 3. SLA Matrix Configuration
SLA thresholds are maintained in `references/sla_matrix.json`:
- `01_Login`: `p95 < 1500 ms`, error rate `< 5%`
- `02_BrowseProducts`: `p95 < 800 ms`, error rate `< 1%`
- `03_ProductDetail`: `p95 < 800 ms`, error rate `< 1%`
- `04_ApplyCoupon`: `p95 < 1000 ms`, error rate `< 10%`
- `05_Checkout`: `p95 < 1500 ms`, error rate `< 5%`
- `06_CouponUsage`: `p95 < 1000 ms`, error rate `< 5%`
- `07_MyOrders`: `p95 < 1000 ms`, error rate `< 5%`
- `Overall Pipeline`: `p95 < 1500 ms`, error rate `< 15%`

## 4. Usage Commands
### Running k6 Test & Generating Metrics
```bash
k6 run --out json=results/ci/raw_metrics.json scripts/23127327_Load_20260902.js
```

### Auditing Metrics Against SLA Gate
```bash
node .agents/skills/performance-testing/scripts/extract_metrics.js results/load/metrics.json
```

### Auditing Report Integrity & Preventing Omissions
```bash
node .agents/skills/performance-testing/scripts/verify_report_integrity.js
```

---

## 5. Zero-Omission & Exhaustive Reporting Protocol (Giao thức Báo cáo Toàn diện Không Thiếu Sót)

To prevent reporting omissions (such as listing an item in a summary table without elaborating in the body, or providing incomplete AI interaction audits), the agent **MUST** enforce the following mandatory rules:

### Rule 1: Table-to-Detail 1:1 Parity Rule (Nguyên tắc Đối Chiếu 1:1 Tuyệt Đối)
- Every single entity (e.g. Bug ID `BUG-01`..`BUG-07`, Test Case ID `TC-01`..`TC-N`, Scenario, Optimization Recommendation) listed in any summary table, TOC, or checklist **MUST** have a corresponding dedicated, fully elaborated section in the body (Heading `### <Entity_ID>: ...`).
- **Forbidden Practice**: Never leave an entity as a "table-only phantom". Listing an item in a table creates a binding contract that a full breakdown exists below.
- **Verification**: Always execute `node .agents/skills/performance-testing/scripts/verify_report_integrity.js` before submitting deliverables.

### Rule 2: Six Mandatory Elements for Every Bug Report (Cấu Trúc Bắt Buộc Của Từng Mục Bug)
Each bug in `bug_reports.md` must strictly contain all 6 elements:
1. **Identifier & Title**: `### [Severity] BUG-XX: Title`
2. **Code Location**: Source file and exact line numbers (`server.js:Lxxx-Lyyy`).
3. **Specification Violated**: FR-XX or security/reliability standard.
4. **Defect Behavior Analysis**: Technical walkthrough of code flaws with quoted source snippets.
5. **Test Reproduction & Assertion**: Test script name, reproduction HTTP payload, assertion logic, actual vs expected result.
6. **Remediation Patch**: Actionable unified diff patch block (`--- a/file +++ b/file`).

### Rule 3: AI Audit 4-Section Traceability Protocol (Giao Thức Kiểm Toán Tương Tác AI 4 Phần Tách Bạch)
Every session in `AI_Audit_Report.md` must strictly maintain 4 separate numbered subsections:
1. `X.1 Yêu Cầu Của Người Dùng`: Verbatim user prompt and initial requirements.
2. `X.2 Kết Quả Ban Đầu Của AI`: Raw output highlighting AI limitations, oversights, or hallucinations.
3. `X.3 Các Điểm Người Dùng Phát Hiện & Yêu Cầu Sửa Đổi`: **Explicitly enumerate 4 to 5 concrete human review corrections** showing decisive human oversight.
4. `X.4 Kết Quả Hoàn Thiện Sau Khi Sửa`: Refined deliverables, validation outcomes, and associated Git commit hashes.
