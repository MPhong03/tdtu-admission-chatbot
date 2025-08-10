# CƠ CHẾ VERIFICATION CẢI TIẾN

## TỔNG QUAN

Hệ thống verification đã được cải tiến để hỗ trợ **3 chế độ hoạt động linh hoạt**:
- **Pre-response**: Verification trước khi trả lời người dùng (blocking)
- **Post-async**: Verification ngay sau khi trả lời (non-blocking)
- **Background**: Verification trong background với delay

## CÁC CHẾ ĐỘ VERIFICATION

### 1. Pre-response Verification (Blocking)

**Đặc điểm:**
- Chạy **trước khi trả lời** cho người dùng
- **Blocking** - người dùng phải chờ verification hoàn thành
- Có **timeout** để tránh chờ quá lâu
- Phù hợp cho câu hỏi **quan trọng** hoặc **độ tin cậy cao**

**Cấu hình:**
```javascript
VERIFICATION_MODE=pre_response
VERIFICATION_PRE_TIMEOUT=5000  // 5 giây timeout
```

**Luồng xử lý:**
```
User Question → Generate Answer → Pre-response Verification → Return Answer to User
```

### 2. Post-async Verification (Non-blocking)

**Đặc điểm:**
- Chạy **ngay sau khi trả lời** cho người dùng
- **Non-blocking** - người dùng nhận câu trả lời ngay lập tức
- Verification chạy trong background
- Phù hợp cho câu hỏi **phức tạp** cần thời gian xử lý

**Cấu hình:**
```javascript
VERIFICATION_MODE=post_async
```

**Luồng xử lý:**
```
User Question → Generate Answer → Return Answer to User → Async Verification → Update Database
```

### 3. Background Verification (Delayed)

**Đặc điểm:**
- Chạy **sau một khoảng thời gian** (10-40 giây)
- **Hoàn toàn không ảnh hưởng** đến response time
- Tiết kiệm tài nguyên trong giờ cao điểm
- Phù hợp cho câu hỏi **đơn giản** hoặc **không khẩn cấp**

**Cấu hình:**
```javascript
VERIFICATION_MODE=background
```

**Luồng xử lý:**
```
User Question → Generate Answer → Return Answer to User → Schedule Background Verification → Execute Later
```

## SMART VERIFICATION DECISION

Hệ thống tự động quyết định chế độ verification dựa trên:

### 1. Context Score (Độ tin cậy context)
```javascript
if (contextScore > 0.8) {
    mode = 'pre_response';  // High confidence → verify immediately
}
```

### 2. Question Type (Loại câu hỏi)
```javascript
if (category === 'complex_admission') {
    mode = 'post_async';    // Complex → verify after response
} else if (category === 'simple_admission') {
    mode = 'background';    // Simple → verify in background
}
```

### 3. Cấu hình mặc định
```javascript
mode = config.mode;  // Fallback to configured mode
```

## CẤU HÌNH MÔI TRƯỜNG

### Environment Variables
```bash
# Chế độ verification
VERIFICATION_MODE=post_async          # pre_response, post_async, background

# Tỷ lệ sample verification
VERIFICATION_SAMPLE_RATE=0.3          # Verify 30% answers

# Timeout cho pre-response
VERIFICATION_PRE_TIMEOUT=5000         # 5 giây

# Ngưỡng độ tin cậy cao
VERIFICATION_HIGH_PRIORITY_THRESHOLD=0.8

# Độ dài tối thiểu answer để verify
MIN_ANSWER_LENGTH_VERIFY=50

# Bật/tắt verification
ENABLE_VERIFICATION=true
```

### Cấu hình theo môi trường

**Development:**
```bash
VERIFICATION_MODE=pre_response
VERIFICATION_SAMPLE_RATE=1.0          # Verify 100% để test
VERIFICATION_PRE_TIMEOUT=10000        # 10 giây timeout
```

**Production:**
```bash
VERIFICATION_MODE=post_async
VERIFICATION_SAMPLE_RATE=0.3          # Verify 30% để tiết kiệm
VERIFICATION_PRE_TIMEOUT=5000         # 5 giây timeout
```

**High Traffic:**
```bash
VERIFICATION_MODE=background
VERIFICATION_SAMPLE_RATE=0.1          # Verify 10% để giảm tải
```

## API ENDPOINTS

### 1. Thay đổi chế độ verification
```javascript
// Thay đổi mode
verificationService.setMode('pre_response');

// Thay đổi sample rate
verificationService.setSampleRate(0.5);

// Thay đổi timeout
verificationService.setPreResponseTimeout(3000);
```

### 2. Batch verification
```javascript
// Verify nhiều history cùng lúc
const results = await verificationService.verifyHistoryBatch(
    historyIds, 
    { mode: 'background', limit: 50 }
);
```

### 3. Thống kê verification
```javascript
// Lấy thống kê verification
const stats = await verificationService.getVerificationStats('7d');
```

## LỢI ÍCH CỦA CƠ CHẾ MỚI

### 1. Linh Hoạt
- **Tùy chỉnh** theo loại câu hỏi và độ tin cậy
- **Adaptive** - tự động chọn chế độ phù hợp
- **Configurable** - dễ dàng thay đổi theo nhu cầu

### 2. Hiệu Suất
- **Pre-response**: Đảm bảo chất lượng cho câu hỏi quan trọng
- **Post-async**: Cân bằng giữa tốc độ và chất lượng
- **Background**: Tối ưu hiệu suất trong giờ cao điểm

### 3. Monitoring
- **Theo dõi** hiệu suất từng chế độ
- **Phân tích** pattern sử dụng
- **Tối ưu** cấu hình dựa trên dữ liệu thực tế

## VÍ DỤ SỬ DỤNG

### 1. Câu hỏi đơn giản với context score cao
```javascript
// Input
question: "Học phí ngành CNTT là bao nhiêu?"
contextScore: 0.9
category: "simple_admission"

// Decision
mode: "pre_response"  // High confidence → verify immediately
```

### 2. Câu hỏi phức tạp
```javascript
// Input
question: "So sánh học phí và điều kiện xét tuyển giữa các ngành CNTT, Kinh tế và Ngoại ngữ"
contextScore: 0.7
category: "complex_admission"

// Decision
mode: "post_async"  // Complex → verify after response
```

### 3. Câu hỏi đơn giản với context score thấp
```javascript
// Input
question: "Trường có mấy cơ sở?"
contextScore: 0.5
category: "simple_admission"

// Decision
mode: "background"  // Simple + low confidence → verify in background
```

## MIGRATION TỪ HỆ THỐNG CŨ

### 1. Cập nhật cấu hình
```bash
# Thay thế
VERIFICATION_ASYNC=true

# Bằng
VERIFICATION_MODE=post_async
```

### 2. Cập nhật code
```javascript
// Cũ
if (verification.config.asyncMode) {
    // async logic
}

// Mới
const decision = verification.shouldVerifyWithMode(question, answer, category, contextScore);
if (decision.shouldVerify) {
    // use decision.mode
}
```

### 3. Monitoring
- Theo dõi hiệu suất của từng chế độ
- Điều chỉnh cấu hình dựa trên metrics
- Tối ưu hóa decision logic