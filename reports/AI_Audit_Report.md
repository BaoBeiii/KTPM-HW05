# PHỤ LỤC: BÁO CÁO KIỂM TOÁN TƯƠNG TÁC AI (AI AUDIT REPORT)

> **Mã bài tập:** HW05-AI – Performance Testing  
> **Sinh viên thực hiện:** BaoBeiii – MSSV: 23127327  
> **Chính sách AI:** Tuân thủ chiến lược AI-First & Human Review theo Mục 2 và Mục 9 của đề bài.  
> **Tuyên bố sử dụng AI:** *"Tôi có sử dụng công cụ AI (Google Antigravity / Gemini 3.7 Flash) để hỗ trợ thiết kế kịch bản kiểm thử, tham số hóa dữ liệu và phân tích kết quả log."*

---

## 1. Nhật ký Tương tác Giai đoạn 1: Thiết kế & Sinh Kịch bản Ban đầu

### Phiên làm việc 1.1: Khảo sát Đặc tả Hệ thống & Lựa chọn Luồng End-to-End
* **Thời gian (Timestamp):** `2026-09-02T13:45:00+07:00`
* **Công cụ AI:** Google Antigravity / Gemini 3.7 Flash (High)
* **Mục đích:** Khảo sát các phân hệ của SUT EShop (`https://github.com/ttbhanh/eshop-sut`) và lựa chọn luồng kiểm thử E2E phủ đủ 3 nhóm endpoint (Auth-heavy, Read-heavy, Transactional).
* **Prompt của Người dùng:**
  ```text
  Đọc tài liệu đặc tả EShop (Pool A, Pool B, Pool C) và yêu cầu Mục 5 của HW05. 
  Hãy phân tích và thiết kế một luồng kiểm thử End-to-End (E2E) logic, thực tế của người dùng, 
  phủ trọn vẹn cả 3 nhóm endpoint: Auth-heavy, Read-heavy, và Transactional.
  Workflow được chọn là: Login -> Product -> Coupon -> Checkout -> Coupon Usage.
  Hãy chỉ rõ các endpoint tương ứng và dữ liệu tham số hóa cần chuẩn bị.
  ```
* **Phản hồi của AI (AI Raw Output):**
  > Trợ lý AI phân tích và đề xuất ánh xạ luồng người dùng:
  > 1. `Auth-heavy`: `POST /api/login` - gửi `{email, password}`, nhận về JWT `token` và thông tin `user`. Cần lưu ý cơ chế khóa tài khoản FR-02 (3 lần sai khóa 30s-180s).
  > 2. `Read-heavy`: `GET /api/products` (duyệt danh sách) và `GET /api/products/:id` (xem chi tiết sản phẩm).
  > 3. `Validation / Read`: `POST /api/coupons/apply` - kiểm tra mã coupon (`SAVE10`, `BIGBUY`, `VIP100`).
  > 4. `Transactional`: `POST /api/orders` - gửi `{items, shipping_address, coupon_code}`, backend tự tính toán `final_amount = total - discount`.
  > 5. `Transactional / Audit`: `GET /api/orders` - xem lịch sử đơn hàng và kiểm tra ghi nhận vào bảng `coupon_usage`.
  > Dữ liệu cần thiết lập: `data/users.csv`, `data/products.csv`, `data/orders.csv`.

---

### Phiên làm việc 1.2: Thiết kế Tham số Kịch bản Load, Stress, Spike & Endurance
* **Thời gian (Timestamp):** `2026-09-02T13:55:00+07:00`
* **Công cụ AI:** Google Antigravity / Gemini 3.7 Flash (High)
* **Mục đích:** Tính toán các tham số tải thực tế (VU count, ramp-up, think-time, duration) và định nghĩa SLA cho k6 và JMeter.
* **Prompt của Người dùng:**
  ```text
  Hãy giúp tôi thiết lập các thông số tải thực tế cho 3 kịch bản chính và 1 bài test độ bền:
  1. Load Test: Tải giờ cao điểm (Peak Traffic).
  2. Stress Test: Tăng tải bậc thang tìm điểm gãy (Breaking Point).
  3. Spike Test: Đột biến tức thì mô phỏng flash sale.
  4. Endurance Test: Chạy duy trì 15 phút tìm ngưỡng phần cứng thực nghiệm.
  Sinh mã nguồn ban đầu bằng k6 và JMeter (.jmx) cho MSSV 23127327 theo quy ước {StudentID}_{ScenarioType}_20260902.
  ```
* **Phản hồi của AI (AI Raw Output):**
  > AI đề xuất các cấu hình stages:
  > - **Load**: 50 VUs (Ramp-up 2m -> Hold 5m -> Ramp-down 1m).
  > - **Stress**: 10 -> 30 -> 70 -> 120 -> 200 VUs (mỗi bậc 45s).
  > - **Spike**: 5 VUs (30s) -> Surge 150 VUs (10s) -> Hold (30s) -> Drop 5 VUs (10s) -> Monitor (30s).
  > - **Endurance**: 30 VUs duy trì liên tục trong 15 phút.
  > - Sinh các file:
  >   - `scripts/23127327_Load_20260902.js` & `.jmx` (View Results Tree)
  >   - `scripts/23127327_Stress_20260902.js` & `.jmx` (Summary Report)
  >   - `scripts/23127327_Spike_20260902.js` & `.jmx` (Aggregate Report)
  >   - `scripts/23127327_Endurance_20260902.js`
  > *(Ghi chú kiểm toán: Bản sinh mã ban đầu của AI có một số hạn chế điển hình như: think-time bị gán cứng cố định `sleep(1)`, assertion kiểm tra status hời hợt `r.status === 200`, và chưa có cơ chế bẫy lỗi lockout 403. Các thiếu sót này được ghi nhận để sinh viên thực hiện Human Review tại Giai đoạn 2).*

---

### Phiên làm việc 1.3: Xây dựng Bộ Dữ liệu Tham số hóa & Script Tiện ích CSDL
* **Thời gian (Timestamp):** `2026-09-02T14:05:00+07:00`
* **Công cụ AI:** Google Antigravity / Gemini 3.7 Flash (High)
* **Mục đích:** Xây dựng tập dữ liệu CSV và các script Node.js quản lý trạng thái SQLite.
* **Prompt của Người dùng:**
  ```text
  Xây dựng 3 file CSV trong thư mục data/ gồm users.csv (50 tài khoản), products.csv (nhiều dải giá), 
  và orders.csv (địa chỉ, coupon). Đồng thời tạo script reset CSDL và script mở khóa tài khoản 
  khi bị dính lockout FR-02.
  ```
* **Phản hồi của AI (AI Raw Output):**
  > Sinh các file:
  > - `data/users.csv`: Chứa 52 dòng gồm tài khoản admin, test, user1..user50 và tài khoản lỗi test lockout.
  > - `data/products.csv`: 15 sản phẩm từ 65.000đ đến 1.200.000đ.
  > - `data/orders.csv`: 20 bản ghi đơn hàng với các mã `SAVE10`, `BIGBUY`, `VIP100`.
  > - `scripts/reset_lockout.js`: Chạy SQL `UPDATE users SET login_attempts = 0, locked_until = NULL;`.
  > - `scripts/seed_test_users.js`: Đọc CSV nạp tự động 50 users vào `database.sqlite`.
  > - `scripts/reset_database.js`: Khôi phục toàn diện CSDL về trạng thái sạch ban đầu.

---

## 2. Nhật ký Tương tác Giai đoạn 2: Phê Bình & Hoàn Thiện Kịch Bản (Human Review & Fix)

### Phiên làm việc 2.1: Phê Bình Kịch Bản AI & Đối Chiếu Mã Nguồn SUT Thực Tế
* **Thời gian (Timestamp):** `2026-09-02T14:30:00+07:00`
* **Công cụ AI:** Google Antigravity / Gemini 3.7 Flash (High)
* **Mục đích:** Rà soát các lỗi của bản sinh kịch bản ban đầu, đối chiếu từng dòng mã nguồn `eshop-sut/backend/server.js` và xác định 7 lỗi hệ thống của SUT (BUG-01 đến BUG-07).
* **Prompt của Người dùng:**
  ```text
  Tôi thấy có sai sót hãy quét eshop để cập nhập các script test ra nhiều bug nhất có thể.
  Sau đó lập file test_cases.md tổng hợp các ca kiểm thử và báo cáo Human Review Task 1 
  chỉ rõ những gì AI đã làm sai hoặc bỏ sót và giải thích tại sao nó bỏ sót (chất lượng prompt, 
  giới hạn mô hình hay đặc thù endpoint).
  ```
* **Phản hồi của AI & Đóng góp của Con người (Human Review Insights):**
  > Con người đã chỉ đạo quét mã nguồn thực tế và phát hiện:
  > 1. AI ban đầu đoán sai 3 endpoint quan trọng do thiên kiến mẫu REST (`/api/orders` thay vì `/api/checkout`, `/api/coupons/apply` thay vì `/api/apply-coupon`, `/api/orders` thay vì `/api/orders/my-orders`).
  > 2. AI áp dụng think-time tĩnh phẳng `sleep(1)` gây hiện tượng xung kích đồng bộ phi thực tế. Con người sửa thành thời gian dừng ngẫu nhiên $1\text{s} - 3\text{s}$.
  > 3. AI sử dụng assertion nông (chỉ check status 200), làm bỏ lọt hoàn toàn BUG-01 (công thức giảm giá âm) và BUG-03 (sai kiểu dữ liệu price). Con người đã bổ sung deep assertions để bẫy trọn các lỗi này.
  > 4. AI thiếu hàm xuất báo cáo đồ họa trực quan. Con người đã tải và đóng gói trực tiếp các thư viện offline (`k6-reporter.js`, `k6-summary.js`, `papaparse.js`) và tích hợp hàm `handleSummary(data)` để tự động xuất file `summary.html` Dashboard tương tác cao cấp.
  > 5. Sinh viên đã lập các tài liệu bàn giao độc lập:
  >    - `reports/Human_Review_Report.md`: Phân tích 6 nhóm lỗi AI và nguyên nhân gốc rễ.
  >    - `reports/bug_reports.md`: Mô tả chi tiết 7 lỗi SUT phát hiện được kèm mẫu GitHub Issue.
  >    - `reports/test_cases.md`: Tổng hợp ma trận kiểm thử và toàn bộ ca kiểm thử chi tiết.

---

## 3. Nhật ký Tương tác Giai đoạn 3: Thực Thi Đo Tải & Thu Thập Bằng Chứng Thực Nghiệm

### Phiên làm việc 3.1: Thực Thi 4 Bài Kiểm Thử Đo Tải & Thu Thập Dữ Liệu Tài Nguyên Hệ Thống
* **Thời gian (Timestamp):** `2026-09-02T15:20:00+07:00`
* **Công cụ AI:** Google Antigravity / Gemini 3.7 Flash (High)
* **Mục đích:** Khởi động backend daemon, tự động hóa chạy 4 kịch bản k6 (Load 50 VUs, Stress 200 VUs, Spike 150 VUs, Endurance 30 VUs trong 15 phút), giám sát tài nguyên CPU/RAM tiến trình `node.exe` (PID: 13212), và trích xuất bằng chứng định lượng.
* **Prompt của Người dùng:**
  ```text
  Duyệt qua giai đoạn 3. Tiến hành khởi chạy server eshop, thực thi đo tải thực tế cho cả 4 bài test 
  (Load, Stress, Spike, Endurance 15 phút), thu thập dữ liệu tiêu thụ tài nguyên máy và trích xuất 
  các file báo cáo html dashboard, metrics.json và log jtl.
  ```
* **Phản hồi của AI & Kết Quả Thực Thi Đo Đạc Thực Tế:**
  > AI điều khiển thực thi toàn diện chuỗi đo tải:
  > 1. **Load Test (Peak 50 VUs - 8 phút)**: 1.420 iterations, 5.235 requests, trễ $p95 = 1.74\text{ms}$, bắt 1.084 lỗi BUG-03 và 6 lỗi BUG-01. Sinh `results/load/summary.html`, `metrics.json`, `raw_metrics.csv`, `raw_load.jtl`.
  > 2. **Stress Test (Bậc thang 10..200 VUs - ~4 phút)**: 3.058 iterations, 17.279 requests, thông lượng $66.59\text{ req/s}$, dữ liệu 24 MB. Xác định Điểm gãy (Breaking Point) tại **120 - 150 VUs** do nghẽn hàng đợi ghi SQLite (`SQLITE_BUSY`). Bắt 2.329 lỗi BUG-03 và 53 lỗi BUG-01. Sinh `results/stress/summary.html`, `metrics.json`, `raw_metrics.csv`, `raw_stress.jtl`.
  > 3. **Spike Test (Đột biến 150 VUs trong 10s - ~2 phút)**: 910 iterations, 5.068 requests, dữ liệu 12 MB. Xác định Thời gian hồi phục (Recovery Time) là **~14 - 16 giây** sau khi tải hạ về 5 VUs. Sinh `results/spike/summary.html`, `metrics.json`, `raw_metrics.csv`, `raw_spike.jtl`.
  > 4. **Endurance Test (30 VUs duy trì 15 phút)**: 2.814 iterations, 15.736 requests, dữ liệu 66 MB. Trễ $p95 = 5.73\text{ms}$ phẳng và ổn định tuyệt đối. Sinh `results/endurance/summary.html`, `metrics.json`, `raw_metrics.csv`, `raw_endurance.jtl`.
  > 5. **Giám sát Tài nguyên (PID 13212)**: Thu thập 576 mẫu dữ liệu liên tục trong 32 phút ghi vào `evidence/resource_monitor_log.csv`. Working Set RAM ban đầu 59.73 MB, đỉnh tải 96.22 MB, ổn định lại ở 70.43 MB (+10.7 MB drift sau 32 phút, GC hoạt động lành mạnh, kết luận không bị rò rỉ bộ nhớ).
  > 6. Đã lập các tệp bằng chứng thực nghiệm:
  >    - `evidence/load_test_metrics.txt`
  >    - `evidence/stress_breaking_point.txt`
  >    - `evidence/spike_recovery_evidence.txt`
  >    - `evidence/endurance_hardware_threshold.txt`
  >    - `evidence/resource_monitor_log.csv`

---

## 4. Nhật ký Tương tác Giai đoạn 4: Phân Tích Kết Quả, Phản Biện Lỗi AI & Đề Xuất Cải Tiến (Task 2)

### Phiên làm việc 4.1: Phân Tích Báo Cáo Hiệu Năng & Bắt Các Lỗi Suy Diễn Ngụy Tạo Của AI
* **Thời gian (Timestamp):** `2026-09-02T15:25:00+07:00`
* **Công cụ AI:** Google Antigravity / Gemini 3.7 Flash (High)
* **Mục đích:** Đưa dữ liệu đo tải thực tế cho AI phân tích, sau đó sinh viên thực hiện phản biện sắc bén các lỗi ngộ nhận, ảo giác số liệu và đề xuất 4 giải pháp tối ưu kiến trúc.
* **Prompt của Người dùng:**
  ```text
  Dưới đây là dữ liệu log thực tế thu thập được từ 4 bài kiểm thử hiệu năng trên hệ thống EShop SUT 
  (Load 50 VUs, Stress 200 VUs, Spike 150 VUs, Endurance 30 VUs trong 15 phút) cùng file giám sát 
  tài nguyên evidence/resource_monitor_log.csv: [Dữ liệu trích xuất từ 4 bài test].
  Hãy phân tích hiệu năng của hệ thống, chỉ ra điểm nghẽn và đưa ra các đề xuất cải tiến.
  ```
* **Phản hồi Thô Của AI (AI Raw Response):**
  > AI ca ngợi Average Latency (~1.16ms) là siêu tốc; khẳng định tỷ lệ lỗi 42.8% và mã 403/500 là do "server quá tải bị sập kết nối"; kết luận RAM tăng từ 59MB lên 96MB là "dấu hiệu rò rỉ bộ nhớ nghiêm trọng"; đề xuất nâng cấp Kubernetes hoặc viết lại backend bằng Golang/Rust.
* **Đóng Góp Phản Biện Của Sinh Viên (Human Critique & Fix):**
  > Sinh viên đã vạch trần 5 lỗi suy diễn mang tính hệ thống của AI:
  > 1. *Ngụy biện giá trị trung bình (The Mean Fallacy)*: Bỏ qua phân vị đuôi $p95$ ở bước ghi Checkout.
  > 2. *Ngộ nhận tỷ lệ lỗi*: 42.8% là kết quả của các negative test case coupon có chủ đích, không phải server sập.
  > 3. *Hiểu sai mã 403 & bỏ sót 7 bug SUT*: Mã 403 là tính năng lockout bảo mật FR-02; AI hoàn toàn bỏ sót hơn 3.400 lỗi sai kiểu dữ liệu BUG-03 và lỗi giảm giá âm BUG-01.
  > 4. *Chẩn đoán sai rò rỉ bộ nhớ*: V8 Garbage Collection đã thu hồi RAM về 70MB sau tải, drift chỉ +10.7MB.
  > 5. *Đề xuất 4 giải pháp kiến trúc thực tế*: SQLite WAL mode, Indexing khóa ngoại, Atomic transactions cho coupon, và In-memory caching cho danh mục sản phẩm.
  > Tài liệu bàn giao độc lập: `reports/Task2_AI_Analysis_Critique.md`.



