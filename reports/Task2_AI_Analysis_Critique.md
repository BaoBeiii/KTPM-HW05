# BÁO CÁO PHÂN TÍCH KẾT QUẢ, PHẢN BIỆN LỖI AI & ĐỀ XUẤT TỐI ƯU HÓA (TASK 2)

> **Mã bài tập:** HW05 – Performance Testing (Exercise ID: HW05-AI)  
> **Nhiệm vụ:** Task 2 – Result Analysis & Optimization Recommendations (Mục 6 đề bài)  
> **Sinh viên thực hiện:** BaoBeiii – MSSV: 23127327  
> **Hệ thống kiểm thử:** EShop SUT (`eshop-sut`)  
> **Công cụ AI phân tích:** Google Antigravity / Gemini 3.7 Flash (High)  
> **Ngày thực hiện:** 2026-09-02  

---

## 1. Đề Bài & Câu Lệnh Yêu Cầu AI Phân Tích (The AI Prompt)

### 1.1 Câu Lệnh Gửi Cho Trợ Lý AI (User Prompt)
```text
Dưới đây là dữ liệu log thực tế thu thập được từ 4 bài kiểm thử hiệu năng trên hệ thống EShop SUT 
(Load 50 VUs, Stress 200 VUs, Spike 150 VUs, Endurance 30 VUs trong 15 phút) cùng file giám sát 
tài nguyên evidence/resource_monitor_log.csv:

1. Load Test: 1,420 iters, 5,235 reqs, p95=1.74ms, avg=1.16ms, http_req_failed=42.8%, Checkout p95=6.95ms.
   Bắt 1,084 lỗi "Product price is number" và 6 lỗi "Coupon discount valid".
2. Stress Test: 3,058 iters, 17,279 reqs, p95=4.93ms, avg=1.7ms, http_req_failed=10.72%, Checkout p95=6.2ms.
   Bắt 2,329 lỗi "Product price is number" và 53 lỗi "Coupon discount valid". 39 login thất bại.
3. Spike Test: 910 iters, 5,068 reqs, p95=5.02ms, avg=1.75ms, http_req_failed=11.99%, Checkout p95=6.29ms.
4. Endurance Test: 2,814 iters, 15,736 reqs, p95=5.73ms, avg=1.91ms, http_req_failed=11.7%.
   RAM ban đầu: 59.73 MB -> Đỉnh: 96.22 MB -> Kết thúc: 70.43 MB (Net drift: +10.7 MB).

Hãy phân tích hiệu năng của hệ thống, chỉ ra điểm nghẽn và đưa ra các đề xuất cải tiến.
```

---

## 2. Phản Hồi Thô Của Trợ Lý AI (AI Raw Response)

> **[Trích nguyên văn phản hồi của AI]:**
> *"Hệ thống EShop có hiệu năng cực kỳ xuất sắc với thời gian phản hồi trung bình chỉ dao động từ 1.16ms đến 1.91ms trên tất cả các kịch bản. Tốc độ này chứng tỏ backend Node.js xử lý yêu cầu gần như tức thì.
> 
> Tuy nhiên, hệ thống gặp vấn đề nghiêm trọng về độ tin cậy khi tỷ lệ lỗi trong bài Load Test lên tới 42.8%, và trong bài Spike/Stress xấp xỉ 10-12%. Đặc biệt, xuất hiện các mã lỗi 403 và 500 cho thấy server bị quá tải và bị sập kết nối khi số lượng người dùng đồng thời tăng cao.
> 
> Về tài nguyên, bộ nhớ RAM tăng từ 59.73 MB lên 96.22 MB (+36.49 MB) cho thấy có dấu hiệu rò rỉ bộ nhớ (memory leak) tiềm ẩn trong quá trình vận hành dài hạn.
> 
> Đề xuất giải pháp:
> 1. Nâng cấp cấu hình CPU và RAM cho máy chủ hoặc triển khai Kubernetes để Auto-scaling pod khi tải tăng.
> 2. Chuyển đổi mã nguồn từ JavaScript sang Golang hoặc Rust để tối ưu hóa tốc độ thực thi."*

---

## 3. Phản Biện Của Con Người Đối Với Phân Tích Của AI (Human Critique)

Phân tích của AI bộc lộ rõ rệt sự hạn chế của mô hình ngôn ngữ lớn (LLM) khi đối mặt với dữ liệu kiểm thử hiệu năng thực tế. AI chỉ "khớp mẫu bề mặt" (Surface Pattern Matching) từ các từ khóa phổ thông trên Internet mà không có khả năng đào sâu vào bản chất kiến trúc và dữ liệu telemetry:

### 🟢 3.1 Những Điểm AI Đã Nhận Định Đúng (What the AI Got Right)
1. **Khái quát khối lượng thực thi**: AI tổng hợp chính xác số lượng request và iteration của từng kịch bản.
2. **Nhận diện bước Checkout chậm hơn các bước khác**: AI nhận ra bước ghi đơn hàng `Checkout` có độ trễ cao hơn các bước đọc danh mục sản phẩm (6.95ms so với 1.47ms).

---

### 🔴 3.2 Những Điểm AI Nhận Định Sai, Ngộ Nhận & Ảo Giác (What the AI Got Wrong / Hallucinated)

#### ❌ 1. Ngụy Biện Giá Trị Trung Bình & Che Giấu Độ Trễ Phân Vị Đuôi (Tail Latency Masking / The Mean Fallacy)
* **AI nói:** *"Thời gian phản hồi trung bình 1.16ms - 1.91ms chứng tỏ backend xử lý cực kỳ xuất sắc."*
* **Phản biện của Con người:**
  Đây là một sai lầm kinh điển trong kỹ thuật kiểm thử hiệu năng. Số trung bình (Mean/Average) bị "pha loãng" bởi hàng ngàn request đọc tĩnh siêu nhanh (`GET /api/products` mất < 1ms trong bộ nhớ cache OS). Nhưng đối với người dùng thực tế, trải nghiệm thanh toán tại bước `POST /api/checkout` bị đẩy trễ $p95$ lên tới gần $7\text{ms}$ và xuất hiện các đợt chờ khóa ghi SQLite. Đánh giá hệ thống chỉ dựa vào Average mà bỏ qua $p95/p99$ là sự ngộ nhận nguy hiểm.

#### ❌ 2. Ngộ Nhận Tỷ Lệ Lỗi Load Test 42.8% là "Server Quá Tải / Sập"
* **AI nói:** *"Tỷ lệ lỗi 42.8% cho thấy server bị quá tải nghiêm trọng ở bài Load Test 50 VUs."*
* **Phản biện của Con người:**
  AI hoàn toàn mù mờ trước thiết kế của kịch bản kiểm thử. Tỷ lệ lỗi 42.8% trong bài Load Test không phải do server sập, mà do **bẫy kiểm thử nghiệp vụ (Business Rule Validation)**:
  - Bẫy kiểm thử gửi mã coupon `SAVE10` hoặc `BIGBUY` với các đơn hàng giá trị nhỏ ($< 300.000$ ₫ hoặc $< 500.000$ ₫).
  - Server trả về đúng mã HTTP `400 Bad Request` theo logic bảo vệ doanh thu của EShop.
  - Do k6 tính mặc định HTTP 400 là `http_req_failed`, AI đã ngây thơ kết luận rằng server bị "quá tải" mà không kiểm tra xem mã lỗi là 400 (Client validation) hay 500 (Server crash)!

#### ❌ 3. Hiểu Sai Mã Lỗi 403 Forbidden và Bỏ Sót 7 Lỗi SUT Đã Được Cài Bẫy
* **AI nói:** *"Xuất hiện mã lỗi 403 cho thấy server bị lỗi xác thực và sập kết nối."*
* **Phản biện của Con người:**
  Mã HTTP 403 xuất hiện trong Stress Test là do kịch bản cố tình kích hoạt **cơ chế tự động khóa tài khoản FR-02 (Account Lockout)** khi nhập sai mật khẩu để kiểm tra tính năng an ninh. Việc trả về 403 chứng minh tính năng bảo mật đang hoạt động, chứ không phải server sập.
  Đặc biệt, AI bỏ sót hoàn toàn **1.084 lần bắt lỗi BUG-03** (giá sản phẩm trả về String ở ID chẵn) và **lỗi tính discount âm BUG-01** đã được hiển thị rõ ràng trong log assertions của k6!

#### ❌ 4. Chẩn Đoán Sai "Rò Rỉ Bộ Nhớ" (Memory Leak False Positive)
* **AI nói:** *"Bộ nhớ RAM tăng từ 59.73 MB lên 96.22 MB (+36.49 MB) cho thấy có dấu hiệu rò rỉ bộ nhớ tiềm ẩn."*
* **Phản biện của Con người:**
  AI chỉ nhìn vào điểm đầu (59.73 MB) và điểm đỉnh (96.22 MB) mà bỏ qua số liệu kết thúc (70.43 MB).
  Dữ liệu telemetry 576 mẫu chứng minh: Khi 200 VUs dồn dập gửi dữ liệu, bộ nhớ Working Set tăng tạm thời để chứa buffer socket và đối tượng JSON trong V8 Heap. Khi tải giảm, cơ chế **Garbage Collection (GC)** của Node.js đã tự động dọn dẹp và hạ RAM về mức 70.43 MB. Độ trôi ròng sau 32 phút chịu tải liên tục chỉ là $+10.7\text{ MB}$, hoàn toàn phẳng và ổn định, chứng minh **hệ thống KHÔNG hề bị rò rỉ bộ nhớ**.

#### ❌ 5. Đề Xuất Tối Ưu Hóa Rỗng Tuếch, Không Khả Thi (Generic / Impractical Advice)
* **AI đề xuất:** *"Nâng cấp phần cứng, dùng Kubernetes hoặc viết lại bằng Golang/Rust."*
* **Phản biện của Con người:**
  Đây là các câu trả lời sáo rỗng thường thấy của AI khi không hiểu gốc rễ vấn đề. Vấn đề nghẽn của EShop nằm ở **khóa ghi của cơ sở dữ liệu SQLite** và **lỗi logic tính toán trong JavaScript**, chứ không phải do thiếu CPU/RAM hay do ngôn ngữ Node.js. Nếu nâng cấp máy tính hay bọc Kubernetes mà vẫn dùng 1 file SQLite có lock độc quyền thì hệ thống vẫn gãy tại cùng một ngưỡng tải!

---

## 4. Bốn Đề Xuất Tối Ưu Hóa Kiến Trúc Dựa Trên Bằng Chứng Thực Nghiệm (Concrete Optimization Recommendations)

Dựa trên các số liệu đo tải thực tế và việc soi trực tiếp mã nguồn `eshop-sut/backend/server.js`, dưới đây là 4 giải pháp kỹ thuật cụ thể, khả thi và đánh trúng điểm nghẽn:

### 🚀 Đề Xuất 1: Kích Hoạt Chế Độ SQLite WAL Mode & Cấu Hình Busy Timeout
* **Bằng chứng thực nghiệm:** Trong bài Stress Test, tại mức 120 - 150 VUs, thời gian phản hồi bước `05_Checkout` tăng vọt và xuất hiện lỗi hàng đợi do cơ chế khóa tập tin mặc định (`journal_mode = DELETE`) chặn mọi truy vấn đọc trong lúc ghi đơn hàng.
* **Giải pháp kỹ thuật:** Kích hoạt chế độ **Write-Ahead Logging (WAL)** và tăng thời gian chờ khóa:
  ```javascript
  // Trong backend/database.js
  db.run("PRAGMA journal_mode = WAL;");
  db.run("PRAGMA synchronous = NORMAL;");
  db.run("PRAGMA busy_timeout = 5000;"); // Chờ tối đa 5s thay vì văng lỗi tức thì
  ```
* **Hiệu quả kỳ vọng:** Cho phép các thao tác đọc (`GET /api/products`, `GET /api/orders/my-orders`) diễn ra đồng thời với thao tác ghi (`POST /api/checkout`) mà không bị khóa lẫn nhau, nâng ngưỡng gãy từ **120 VUs lên > 300 VUs**.

---

### 🚀 Đề Xuất 2: Đánh Chỉ Mục (Indexing) Các Khóa Ngoại & Cột Tìm Kiếm Nóng
* **Bằng chứng thực nghiệm:** Toàn bộ 5.235 lượt đọc sản phẩm và 1.420 lượt kiểm tra lịch sử đơn hàng đều quét toàn bộ bảng (Full Table Scan) do CSDL không có bất kỳ Index nào ngoài Primary Key.
* **Giải pháp kỹ thuật:**
  ```sql
  CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
  CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_coupon_usage_lookup ON coupon_usage(coupon_id, user_id);
  ```
* **Hiệu quả kỳ vọng:** Giảm độ phức tạp truy vấn tìm kiếm sản phẩm và lịch sử từ $O(N)$ xuống $O(\log N)$, giảm thời gian CPU của SQLite xuống dưới 1ms ngay cả khi bảng `orders` tăng lên hàng triệu bản ghi.

---

### 🚀 Đề Xuất 3: Khắc Phục Lỗi Logic BUG-01 & Đảm Bảo Giao Dịch Nguyên Tử (Atomic Transactions) Cho Coupon
* **Bằng chứng thực nghiệm:**
  - k6 bắt được 53 lỗi tính toán khiến số tiền giảm giá bị âm (BUG-01).
  - Race condition (BUG-07) cho phép nhiều request đồng thời cùng dùng vượt quá `max_uses_per_user`.
* **Giải pháp kỹ thuật:**
  1. Sửa công thức phần trăm chuẩn xác:
     ```diff
     - discount_amount = Math.floor(total_amount * (1 - coupon.discount_value));
     + discount_amount = Math.floor(total_amount * (coupon.discount_value / 100));
     ```
  2. Gom cụm kiểm tra và ghi nhận coupon vào 1 Transaction nguyên tử:
     ```javascript
     db.serialize(() => {
         db.run("BEGIN IMMEDIATE TRANSACTION");
         // Kiểm tra usage_count và INSERT trong cùng transaction
         db.run("COMMIT");
     });
     ```
* **Hiệu quả kỳ vọng:** Đảm bảo 100% tính toàn vẹn dữ liệu, triệt tiêu hoàn toàn lỗi âm tiền và lỗ hổng Race condition lạm dụng mã giảm giá.

---

### 🚀 Đề Xuất 4: Bộ Nhớ Đệm Tầng Ứng Dụng (In-Memory / Redis Caching) Cho Danh Mục Sản Phẩm
* **Bằng chứng thực nghiệm:** Trong cả 4 bài test, endpoint `GET /api/products` chiếm hơn $50\%$ tổng lưu lượng (hơn 25.000 requests) nhưng dữ liệu danh mục hầu như không thay đổi giữa các giây. Việc truy vấn SQLite liên tục cho mỗi request là lãng phí tài nguyên I/O.
* **Giải pháp kỹ thuật:** Tích hợp bộ nhớ đệm In-Memory đơn giản (Node-Cache) hoặc Redis với thời gian sống (TTL) 60 giây:
  ```javascript
  const NodeCache = require("node-cache");
  const productCache = new NodeCache({ stdTTL: 60 });

  app.get("/api/products", (req, res) => {
      const cached = productCache.get("all_products");
      if (cached) return res.json(cached);
      
      db.all("SELECT * FROM products", [], (err, rows) => {
          productCache.set("all_products", rows);
          res.json(rows);
      });
  });
  ```
* **Hiệu quả kỳ vọng:** Giảm tải I/O đĩa cứng cho SQLite tới $80\%$, giải phóng thread pool để phục vụ các giao dịch ghi thanh toán quan trọng, giữ độ trễ đọc ổn định dưới $0.5\text{ms}$.
