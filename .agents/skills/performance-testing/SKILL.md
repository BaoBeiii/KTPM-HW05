---
name: performance-testing
description: Continuous performance testing, metric extraction, and SLA regression gate for e-commerce web applications.
---

# Performance Testing Agent Skill

## 1. Overview
The `performance-testing` skill enables automated agents and CI/CD pipelines to:
- Execute load, stress, and spike test scripts using k6 and JMeter.
- Extract response time percentiles (p90, p95, p99), mean latency, throughput, and error rates from `metrics.json`.
- Compare observed metrics against Service Level Agreements (SLAs) defined in `references/sla_matrix.json`.
- Enforce automated quality gates that block Pull Requests if latency regresses by more than 20% or exceeds SLA limits.

## 2. Directory Structure
```text
.agents/skills/performance-testing/
├── SKILL.md                          # Skill definition and agent usage instructions
├── scripts/
│   └── extract_metrics.js            # Automated CLI parser and SLA evaluation gate
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
Exit code `0` indicates PASS (within SLA). Exit code `1` triggers a build break.
