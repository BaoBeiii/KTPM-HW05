# BÁO CÁO BÀI TẬP 5: KIỂM THỬ HIỆU NĂNG ỨNG DỤNG WEB E-COMMERCE (HW05-AI)

> **Môn học:** Kiểm thử phần mềm (Software Testing)  
> **Trường:** Trường Đại học Khoa học Tự nhiên, ĐHQG-HCM (HCMUS)  
> **Mã bài tập:** HW05 – Performance Testing (Exercise ID: HW05-AI)  
> **Sinh viên thực hiện:** BaoBeiii – MSSV: **23127327**  
> **Email sinh viên:** `23127327@student.hcmus.edu.vn`  
> **Môi trường đo đạc:** Máy trạm `DESKTOP-BEIZU` (Windows 11, Node.js v24.11.0, k6 v2.1.0)  
> **Chiến lược kiểm thử:** AI-Assisted Workflow & Rigorous Human Critique (AI-First kết hợp Phản biện Con người sâu sắc)  

---

## 🌟 MỤC LỤC & DANH MỤC BÁO CÁO BÀN GIAO

1. [Tổng Quan Dự Án & Mục Tiêu Kỹ Thuật](#1-tổng-quan-dự-án--mục-tiêu-kỹ-thuật)
2. [Cây Thư Mục Toàn Diện Của Repository](#2-cây-thư-mục-toàn-diện-của-repository)
3. [Hướng Dẫn Khởi Chạy & Tái Hiện Kết Quả (Quick Start)](#3-hướng-dẫn-khởi-chạy--tái-hiện-kết-quả-quick-start)
4. [Bảng Tổng Hợp Kết Quả Đo Tải Thực Nghiệm (Task 1)](#4-bảng-tổng-hợp-kết-quả-đo-tải-thực-nghiệm-task-1)
5. [Tổng Hợp 7 Lỗi Hệ Thống SUT Được Cài Bẫy Bắt Trọn (BUG-01 đến BUG-07)](#5-tổng-hợp-7-lỗi-hệ-thống-sut-được-cài-bẫy-bắt-trọn)
6. [Phản Biện Lỗi Suy Diễn AI & 4 Giải Pháp Tối Ưu Kiến Trúc (Task 2)](#6-phản-biện-lỗi-suy-diễn-ai--4-giải-pháp-tối-ưu-kiến-trúc-task-2)
7. [Tự Động Hóa CI/CD GitHub Actions & Đóng Gói Agent Skill (Task 3)](#7-tự-động-hóa-cicd-github-actions--đóng-gói-agent-skill-task-3)
8. [Các Báo Cáo Chuyên Sâu Đi Kèm](#8-các-báo-cáo-chuyên-sâu-đi-kèm)

---

## 1. TỔNG QUAN DỰ ÁN & MỤC TIÊU KỸ THUẬT

Dự án thực hiện kiểm thử tải toàn diện cho hệ thống **EShop SUT** (Hệ thống thương mại điện tử Node.js Express + SQLite3) theo chu trình người dùng hoàn chỉnh (E2E User Journey):
$$\text{Login} \longrightarrow \text{Browse Products} \longrightarrow \text{View Detail} \longrightarrow \text{Apply Coupon} \longrightarrow \text{Checkout} \longrightarrow \text{Record Coupon Usage} \longrightarrow \text{View Order History}$$

### Các Mục Tiêu Kỹ Thuật Đã Đạt Được:
* **Đo lường định lượng chính xác 4 kịch bản tải**: Load Test (Peak 50 VUs), Stress Test (Stepped 200 VUs), Spike Test (Flash Sale 150 VUs), Endurance / Soak Test (30 VUs trong 15 phút).
* **Xác định ngưỡng phần cứng thực nghiệm (Empirical Hardware Thresholds)**:
  - **Điểm gãy (Breaking Point)**: Nằm tại mức **120 - 150 VUs** do hiện tượng nghẽn khóa ghi tập tin của SQLite (`SQLITE_BUSY`).
  - **Thời gian hồi phục (Recovery Time)**: Đạt **14 - 16 giây** sau khi kết thúc sốc tải 150 VUs về 5 VUs.
  - **Đánh giá rò rỉ bộ nhớ (Memory Leak)**: Đạt chuẩn an toàn (Working Set RAM drift chỉ $+10.7\text{ MB}$ sau 32 phút chịu tải liên tục với 576 mẫu đo telemetry).
* **Bắt trọn 7 lỗi hệ thống của SUT** bằng các kiểm tra chuyên sâu (Deep Assertions) trên k6.
* **Tự động hóa CI/CD**: Xây dựng workflow GitHub Actions tự động kiểm soát cổng chất lượng SLA và đóng gói Agent Skill tái sử dụng theo chuẩn Antigravity.

---

## 2. CÂY THƯ MỤC TOÀN DIỆN CỦA REPOSITORY

```text
KTPM-HW05/
├── .agents/
│   └── skills/
│       └── performance-testing/
│           ├── SKILL.md                          # Đặc tả năng lực Agent Skill & Hướng dẫn sử dụng
│           ├── scripts/
│           │   └── extract_metrics.js            # CLI tool tự động phân tích p95 & SLA gate
│           ├── references/
│           │   └── sla_matrix.json               # Ma trận ngưỡng SLA chuẩn cho từng endpoint
│           └── examples/
│               └── sample_pr_comment.md          # Mẫu comment tự động gửi vào Pull Request
├── .github/
│   └── workflows/
│       └── performance-regression.yml            # GitHub Actions CI/CD phát hiện hồi quy hiệu năng
├── data/
│   ├── users.csv                                 # 52 tài khoản test (admin, user1..50, lockout test)
│   ├── products.csv                              # 15 sản phẩm đa dạng dải giá
│   └── orders.csv                                # 20 bản ghi đơn hàng mẫu và coupon
├── evidence/
│   ├── load_test_metrics.txt                     # Bằng chứng định lượng bài Load Test
│   ├── stress_breaking_point.txt                 # Bằng chứng điểm gãy bài Stress Test
│   ├── spike_recovery_evidence.txt               # Bằng chứng thời gian hồi phục bài Spike Test
│   ├── endurance_hardware_threshold.txt          # Bằng chứng độ bền & ngưỡng phần cứng máy trạm
│   └── resource_monitor_log.csv                  # 576 mẫu đo liên tục CPU & RAM của node.exe (PID 13212)
├── reports/
│   ├── AI_Audit_Report.md                        # Nhật ký kiểm toán AI minh bạch 5 phiên làm việc
│   ├── Human_Review_Report.md                    # Báo cáo phản biện 6 lỗi kịch bản của AI (Task 1)
│   ├── bug_reports.md                            # Mô tả chi tiết 7 lỗi SUT phát hiện được kèm GitHub Issues
│   ├── test_cases.md                             # Ma trận và đặc tả toàn bộ ca kiểm thử chức năng & hiệu năng
│   ├── Task2_AI_Analysis_Critique.md             # Phản biện lỗi suy diễn AI & 4 giải pháp tối ưu (Task 2)
│   ├── Self_Assessment_Rubric.md                 # Bảng tự chấm điểm chi tiết 100/100
│   └── Video_Demo_Script.md                      # Kịch bản chi tiết quay video demo nộp bài
├── results/
│   ├── load/
│   │   ├── summary.html                          # Dashboard HTML tương tác kết quả Load Test
│   │   ├── metrics.json                          # Dữ liệu JSON phân tích trễ p90, p95, p99
│   │   ├── raw_metrics.csv                       # Mẫu đo chi tiết từng request
│   │   └── raw_load.jtl                          # File log tương thích listener JMeter
│   ├── stress/
│   │   ├── summary.html                          # Dashboard HTML tương tác kết quả Stress Test
│   │   ├── metrics.json                          # Dữ liệu JSON phân tích trễ p90, p95, p99
│   │   ├── raw_metrics.csv                       # Mẫu đo chi tiết từng request
│   │   └── raw_stress.jtl                        # File log tương thích listener JMeter
│   ├── spike/
│   │   ├── summary.html                          # Dashboard HTML tương tác kết quả Spike Test
│   │   ├── metrics.json                          # Dữ liệu JSON phân tích trễ p90, p95, p99
│   │   ├── raw_metrics.csv                       # Mẫu đo chi tiết từng request
│   │   └── raw_spike.jtl                         # File log tương thích listener JMeter
│   └── endurance/
│       ├── summary.html                          # Dashboard HTML tương tác kết quả Endurance Test
│       ├── metrics.json                          # Dữ liệu JSON phân tích trễ p90, p95, p99
│       ├── raw_metrics.csv                       # Mẫu đo chi tiết từng request
│       └── raw_endurance.jtl                     # File log tương thích listener JMeter
├── scripts/
│   ├── 23127327_Load_20260902.js                 # Kịch bản k6 Load Test (Peak 50 VUs)
│   ├── 23127327_Load_20260902.jmx                # Kịch bản JMeter Load Test (View Results Tree)
│   ├── 23127327_Stress_20260902.js               # Kịch bản k6 Stress Test (Stepped 200 VUs)
│   ├── 23127327_Stress_20260902.jmx              # Kịch bản JMeter Stress Test (Summary Report)
│   ├── 23127327_Spike_20260902.js                # Kịch bản k6 Spike Test (Flash Sale 150 VUs)
│   ├── 23127327_Spike_20260902.jmx               # Kịch bản JMeter Spike Test (Aggregate Report)
│   ├── 23127327_Endurance_20260902.js            # Kịch bản k6 Endurance Test (30 VUs, 15 phút)
│   ├── k6-reporter.js                            # Thư viện offline tạo HTML Dashboard cao cấp
│   ├── k6-summary.js                             # Thư viện offline format text summary
│   ├── papaparse.js                              # Thư viện offline nạp CSV tham số hóa trong k6
│   ├── extract_metrics.js                        # CLI tool trích xuất metrics & SLA gate
│   ├── convert_to_jtl.js                         # Tiện ích chuyển đổi metrics sang format JMeter .jtl
│   ├── monitor_resources.ps1                     # Script PowerShell giám sát CPU/RAM PID 3000 liên tục
│   ├── seed_test_users.js                        # Tiện ích nạp tự động 50 users test vào SQLite
│   ├── reset_lockout.js                          # Tiện ích mở khóa tài khoản dính FR-02 lockout
│   └── reset_database.js                         # Tiện ích khôi phục toàn diện CSDL sạch
├── .gitignore                                    # Cô lập repo nộp bài khỏi eshop-sut và node_modules
└── README.md                                     # Tài liệu tổng quan toàn bộ đồ án
```

---

## 3. HƯỚNG DẪN KHỞI CHẠY & TÁI HIỆN KẾT QUẢ (QUICK START)

### 3.1 Yêu Cầu Môi Trường (Prerequisites)
* **Node.js**: v18+ (Đã kiểm thử trên v24.11.0 và v20 LTS).
* **k6**: v0.40+ (Đã kiểm thử trên Grafana k6 v2.1.0 tại `C:\Program Files\k6\k6.exe`).
* **PowerShell**: Chạy trên Windows hoặc Terminal trên Linux/macOS.

### 3.2 Khởi Động SUT Backend
```bash
# 1. Di chuyển vào thư mục backend của SUT
cd eshop-sut/backend

# 2. Cài đặt các gói phụ thuộc
npm install

# 3. Khởi chạy máy chủ Express trên cổng 3000
node server.js
```
*Kiểm tra sức khỏe:* Mở trình duyệt truy cập `http://localhost:3000/api/products` nhận về mảng JSON sản phẩm.

### 3.3 Nạp Dữ Liệu Test & Reset Trạng Thái Sạch
```bash
# Nạp 50 user test và reset lockout
node scripts/reset_lockout.js
node scripts/seed_test_users.js
```

### 3.4 Bật Giám Sát Tài Nguyên Hệ Thống
Mở một cửa sổ PowerShell mới và chạy:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\monitor_resources.ps1
```
Script sẽ tự động tìm đúng PID của `node.exe` đang lắng nghe port 3000 và ghi log CPU %, Working Set RAM mỗi 3 giây vào `evidence/resource_monitor_log.csv`.

### 3.5 Thực Thi 4 Bài Kiểm Thử Bằng k6
```bash
# 1. Chạy Load Test (Peak 50 VUs - 8 phút)
k6 run --out csv=results/load/raw_metrics.csv scripts/23127327_Load_20260902.js

# 2. Chạy Stress Test (Bậc thang 10..200 VUs - ~4 phút)
k6 run --out csv=results/stress/raw_metrics.csv scripts/23127327_Stress_20260902.js

# 3. Chạy Spike Test (Đột biến 150 VUs trong 10s - ~2 phút)
k6 run --out csv=results/spike/raw_metrics.csv scripts/23127327_Spike_20260902.js

# 4. Chạy Endurance Test (Duy trì 30 VUs trong 15 phút)
k6 run --out csv=results/endurance/raw_metrics.csv scripts/23127327_Endurance_20260902.js
```
*Sau khi chạy, mở trực tiếp các file `summary.html` trong `results/{scenario}/` bằng trình duyệt để xem Dashboard đồ họa tương tác!*

### 3.6 Chạy Công Cụ Kiểm Tra Hồi Quy Hiệu Năng & SLA Gate
```bash
node scripts/extract_metrics.js results/load/metrics.json
```

### 3.7 Kiểm Tra Tính Toàn Vẹn Báo Cáo (Zero-Omission Integrity Linter)
```bash
# Tự động quét đối chiếu 1:1, bảo đảm không có bất kỳ lỗi hay mục nào bị bỏ sót
node scripts/verify_report_integrity.js
```

---

## 4. BẢNG TỔNG HỢP KẾT QUẢ ĐO TẢI THỰC NGHIỆM (TASK 1)

| Thông Số Đo Đạc Thực Tế | Load Test (Tải Đỉnh) | Stress Test (Điểm Gãy) | Spike Test (Đột Biến) | Endurance Test (Độ Bền) |
| :--- | :---: | :---: | :---: | :---: |
| **Cấu hình Virtual Users (VUs)** | Peak **50 VUs** | Bậc thang **10 $\rightarrow$ 200 VUs** | Đột biến **150 VUs** (10s) | Duy trì **30 VUs** liên tục |
| **Thời lượng thực thi** | **8m13.6s** | **4m19.5s** | **1m54.5s** | **15m03.4s** |
| **Tổng số Iterations hoàn tất** | **1.420** | **3.058** | **910** | **2.814** |
| **Tổng số HTTP Requests** | **5.235** | **17.279** | **5.068** | **15.736** |
| **Thông lượng trung bình (Throughput)**| **10.61 req/s** | **66.59 req/s** (đỉnh ~135) | **44.27 req/s** | **17.42 req/s** |
| **Dung lượng truyền nhận** | 3.1 MB / 869 kB | 24 MB / 4.9 MB | 12 MB / 1.4 MB | **66 MB / 4.5 MB** |
| **Thời gian trễ trung bình (Mean)** | 1.16 ms | 1.70 ms | 1.75 ms | 1.91 ms |
| **Trễ phân vị đuôi $p95$ toàn kịch bản**| **1.74 ms** (SLA < 1500ms) | **4.93 ms** | **5.02 ms** | **5.73 ms** |
| **Trễ $p95$ Login / Checkout** | 1.84 ms / 6.95 ms | 2.04 ms / 6.20 ms | 2.28 ms / 6.29 ms | 1.80 ms / 6.30 ms |
| **Tỷ lệ lỗi ($Error\text{ Rate}$)** | 42.8% (bẫy negative coupon) | 10.72% (dưới tải 200 VU) | 11.99% (dưới sốc tải) | 11.70% (ổn định) |
| **Số lỗi SUT bắt được** | 1.084 BUG-03, 6 BUG-01 | 2.329 BUG-03, 53 BUG-01 | 686 BUG-03 | Bắt liên tục BUG-03 |
| **Hiện tượng & Đánh giá kỹ thuật**| Đạt chuẩn SLA toàn diện | **Điểm gãy: 120 - 150 VUs** | **Hồi phục sau: ~14 - 16s** | **Không rò rỉ RAM** (drift +10.7MB) |

---

## 5. TỔNG HỢP 7 LỖI HỆ THỐNG SUT ĐƯỢC CÀI BẪY BẮT TRỌN

Chi tiết xem tại tài liệu chuyên khảo: [reports/bug_reports.md](file:///d:/Documents/%C4%90%E1%BA%A1i%20h%E1%BB%8Dc/N%C4%83m%203-HCMUS/K%C3%AC%203/Ki%E1%BB%83m%20th%E1%BB%AD%20ph%E1%BA%A7n%20m%E1%BB%81m/HW05/KTPM-HW05/reports/bug_reports.md).

| Mã Lỗi | Tên Lỗi & Vị Trí Code | Hành Vi Sai Lệch Nghiêm Trọng | Bẫy Assertions & Số Lần Bắt |
| :---: | :--- | :--- | :---: |
| **BUG-01** | **Sai công thức tính mã giảm giá phần trăm**<br>`server.js:398` | Áp dụng `total_amount * (1 - coupon.discount_value)` khiến số tiền giảm bị âm và tổng thanh toán bị đội giá gấp 10 lần. | Bắt **59 lần** trong các bài đo tải (`total_discount >= 0`). |
| **BUG-02** | **Lỗ hổng SQL Injection tại tìm kiếm**<br>`server.js:144` | Ghép chuỗi trực tiếp `${search}` vào câu lệnh SQL thay vì dùng Prepared Statement `?`. | Bẫy chuỗi `test' OR '1'='1` vạch trần lỗ hổng SQLi. |
| **BUG-03** | **Ép kiểu giá thành chuỗi ở ID chẵn**<br>`server.js:162` | Ép kiểu `String(product.price)` nếu `id % 2 === 0`, phá vỡ hợp đồng API JSON. | Bắt **4.099 lần** (`typeof price === 'number'`). |
| **BUG-04** | **Khóa tài khoản sai logic FR-02**<br>`server.js:54-62` | Tăng số lần thử sai `+2` thay vì `+1` và khóa tới 3 phút thay vì 30 giây. | Bẫy login mật khẩu sai và kiểm tra phản hồi 403. |
| **BUG-05** | **Checkout không tính lại giỏ hàng**<br>`server.js:296` | Lấy trực tiếp `total_amount` từ client gửi lên mà không xác minh lại với CSDL, cho phép khách hàng sửa giá về 0đ. | Bẫy gian lận giá đơn hàng phát hiện lỗ hổng logic. |
| **BUG-06** | **Chuyển trạng thái đơn hàng phi lý**<br>`server.js:342` | Cho phép cập nhật đơn hàng đã bị hủy (`canceled`) chuyển thẳng thành đã giao (`delivered`). | Bẫy cập nhật trạng thái đơn hàng phát hiện sai luồng. |
| **BUG-07** | **Lỗ hổng Race Condition khi dùng mã**<br>`server.js:425` | Không bọc Transaction hoặc mutex lock, cho phép 1 user dùng vượt quá `max_uses_per_user` khi gửi đồng thời. | Bắt trong bài Stress Test 200 VUs. |

---

## 6. PHẢN BIỆN LỖI SUY DIỄN AI & 4 GIẢI PHÁP TỐI ƯU KIẾN TRÚC (TASK 2)

Chi tiết xem tại tài liệu chuyên khảo: [reports/Task2_AI_Analysis_Critique.md](file:///d:/Documents/%C4%90%E1%BA%A1i%20h%E1%BB%8Dc/N%C4%83m%203-HCMUS/K%C3%AC%203/Ki%E1%BB%83m%20th%E1%BB%AD%20ph%E1%BA%A7n%20m%E1%BB%81m/HW05/KTPM-HW05/reports/Task2_AI_Analysis_Critique.md).

### 6.1 Bắt 5 Lỗi Suy Diễn Ngụy Tạo Của AI Khi Đọc Log
1. **Ngụy biện giá trị trung bình (The Mean Fallacy)**: AI khen nức nở Average Latency ~1.16ms mà bỏ qua phân vị trôi đuôi $p95$ ở bước ghi Checkout bị chậm gấp 6 lần bước đọc.
2. **Ngộ nhận tỷ lệ lỗi Load Test 42.8% là "server quá tải bị sập"**: Thực tế là do kịch bản cố tình gửi các ca kiểm thử negative coupon để test logic nghiệp vụ (trả về HTTP 400 đúng thiết kế), hoàn toàn không phải server crash.
3. **Hiểu sai mã lỗi 403 Forbidden & Bỏ sót 7 Bug SUT**: Mã 403 là do cơ chế bảo mật tự động khóa tài khoản FR-02 hoạt động; AI bỏ sót hoàn toàn hơn 3.400 lỗi sai kiểu dữ liệu BUG-03 và lỗi tính giảm giá âm BUG-01.
4. **Chẩn đoán sai "Rò rỉ bộ nhớ" (Memory Leak False Positive)**: AI chỉ thấy RAM tăng từ 59MB lên 96MB rồi phán rò rỉ; thực tế 576 mẫu đo chứng minh V8 Garbage Collection đã thu hồi RAM về 70MB sau tải (drift chỉ +10.7MB sau 32 phút, hệ thống an toàn tuyệt đối).
5. **Vạch trần lời khuyên sáo rỗng**: AI khuyên "nâng cấp phần cứng, dùng Kubernetes, viết lại bằng Rust/Go" mà không hiểu rằng điểm nghẽn cốt lõi nằm ở cơ chế khóa tập tin độc quyền của SQLite.

### 6.2 Bốn Đề Xuất Tối Ưu Hóa Kiến Trúc Dựa Trên Bằng Chứng Thực Nghiệm
1. **Kích hoạt SQLite WAL Mode & Cấu hình Busy Timeout**: Cấu hình `PRAGMA journal_mode = WAL;` và `PRAGMA busy_timeout = 5000;` để Đọc và Ghi diễn ra đồng thời không chặn nhau, giải quyết dứt điểm điểm gãy 120-150 VUs.
2. **Đánh chỉ mục (Indexing) các cột tìm kiếm và khóa ngoại**: Tạo B-Tree Indexes trên `products(name)`, `orders(user_id)`, `coupon_usage(coupon_id, user_id)` để giảm độ phức tạp từ $O(N)$ xuống $O(\log N)$.
3. **Sửa lỗi công thức BUG-01 & Giao dịch nguyên tử (Atomic Transactions)**: Sửa công thức tính giảm giá phần trăm và bọc `db.serialize()` với `BEGIN IMMEDIATE TRANSACTION` triệt tiêu hoàn toàn Race condition BUG-07.
4. **Bộ nhớ đệm tầng ứng dụng (In-Memory / Redis Caching)**: Cache in-memory danh mục sản phẩm (`GET /api/products`) với TTL 60 giây, giảm 80% tải đọc trực tiếp vào SQLite và giữ trễ đọc $< 0.5\text{ms}$.

---

## 7. TỰ ĐỘNG HÓA CI/CD GITHUB ACTIONS & ĐÓNG GÓI AGENT SKILL (TASK 3)

### 7.1 Workflow CI/CD GitHub Actions (`.github/workflows/performance-regression.yml`)
- Tự động chạy khi có `push`, `pull_request` hoặc `workflow_dispatch`.
- Tự động dựng môi trường Node.js, clone SUT, khởi chạy backend và vòng lặp thăm dò sức khỏe bằng `curl`.
- Tự động chạy k6 regression test và kiểm tra cổng chất lượng SLA (SLA Quality Gate); tự động đánh rớt build nếu độ trễ thoái hóa vượt ngưỡng dung sai 20%.

### 7.2 Đóng Gói Trọn Bộ Agent Skill Tái Sử Dụng (`.agents/skills/performance-testing/`)
- Tuân thủ đặc tả Agentic Testing chuẩn Antigravity với `SKILL.md` chứa YAML metadata.
- Đi kèm CLI tool `scripts/extract_metrics.js` phân tích độ trễ $p95$, ma trận SLA `references/sla_matrix.json`, và mẫu comment PR `examples/sample_pr_comment.md`.

---

## 8. CÁC BÁO CÁO BÀN GIAO CHÍNH THỨC

1. 🏆 **[report.md](file:///d:/Documents/%C4%90%E1%BA%A1i%20h%E1%BB%8Dc/N%C4%83m%203-HCMUS/K%C3%AC%203/Ki%E1%BB%83m%20th%E1%BB%AD%20ph%E1%BA%A7n%20m%E1%BB%81m/HW05/KTPM-HW05/report.md)**: **BÁO CÁO CHÍNH TOÀN DIỆN (MAIN REPORT)** hợp nhất 10 mục của toàn bộ đồ án theo Mục 14 đề bài.
2. [reports/AI_Audit_Report.md](file:///d:/Documents/%C4%90%E1%BA%A1i%20h%E1%BB%8Dc/N%C4%83m%203-HCMUS/K%C3%AC%203/Ki%E1%BB%83m%20th%E1%BB%AD%20ph%E1%BA%A7n%20m%E1%BB%81m/HW05/KTPM-HW05/reports/AI_Audit_Report.md): Nhật ký kiểm toán tương tác AI minh bạch 6 phiên làm việc với 4-5 điểm con người bắt sửa cho mỗi phần.
3. [reports/Human_Review_Report.md](file:///d:/Documents/%C4%90%E1%BA%A1i%20h%E1%BB%8Dc/N%C4%83m%203-HCMUS/K%C3%AC%203/Ki%E1%BB%83m%20th%E1%BB%AD%20ph%E1%BA%A7n%20m%E1%BB%81m/HW05/KTPM-HW05/reports/Human_Review_Report.md): Báo cáo phản biện Task 1 phân tích 6 nhóm lỗi AI theo 3 chiều kích kèm khối so sánh Diff Before/After.
4. [reports/bug_reports.md](file:///d:/Documents/%C4%90%E1%BA%A1i%20h%E1%BB%8Dc/N%C4%83m%203-HCMUS/K%C3%AC%203/Ki%E1%BB%83m%20th%E1%BB%AD%20ph%E1%BA%A7n%20m%E1%BB%81m/HW05/KTPM-HW05/reports/bug_reports.md): Chi tiết 7 lỗi SUT phát hiện được kèm mẫu GitHub Issues.
5. [reports/test_cases.md](file:///d:/Documents/%C4%90%E1%BA%A1i%20h%E1%BB%8Dc/N%C4%83m%203-HCMUS/K%C3%AC%203/Ki%E1%BB%83m%20th%E1%BB%AD%20ph%E1%BA%A7n%20m%E1%BB%81m/HW05/KTPM-HW05/reports/test_cases.md): Đặc tả toàn bộ ca kiểm thử chức năng, biên và ma trận kiểm thử tải.
6. [reports/Task2_AI_Analysis_Critique.md](file:///d:/Documents/%C4%90%E1%BA%A1i%20h%E1%BB%8Dc/N%C4%83m%203-HCMUS/K%C3%AC%203/Ki%E1%BB%83m%20th%E1%BB%AD%20ph%E1%BA%A7n%20m%E1%BB%81m/HW05/KTPM-HW05/reports/Task2_AI_Analysis_Critique.md): Phân tích phản biện lỗi suy diễn của AI và 4 đề xuất tối ưu hóa kiến trúc.
7. [reports/Self_Assessment_Rubric.md](file:///d:/Documents/%C4%90%E1%BA%A1i%20h%E1%BB%8Dc/N%C4%83m%203-HCMUS/K%C3%AC%203/Ki%E1%BB%83m%20th%E1%BB%AD%20ph%E1%BA%A7n%20m%E1%BB%81m/HW05/KTPM-HW05/reports/Self_Assessment_Rubric.md): Bảng tự đánh giá chi tiết đạt điểm số 100/100.
8. [reports/Video_Demo_Script.md](file:///d:/Documents/%C4%90%E1%BA%A1i%20h%E1%BB%8Dc/N%C4%83m%203-HCMUS/K%C3%AC%203/Ki%E1%BB%83m%20th%E1%BB%AD%20ph%E1%BA%A7n%20m%E1%BB%81m/HW05/KTPM-HW05/reports/Video_Demo_Script.md): Kịch bản quay video demo nộp bài chi tiết từng giây.
9. [evidence/git_commit_log.txt](file:///d:/Documents/%C4%90%E1%BA%A1i%20h%E1%BB%8Dc/N%C4%83m%203-HCMUS/K%C3%AC%203/Ki%E1%BB%83m%20th%E1%BB%AD%20ph%E1%BA%A7n%20m%E1%BB%81m/HW05/KTPM-HW05/evidence/git_commit_log.txt): Trích lục toàn bộ lịch sử Git commit dạng text.

