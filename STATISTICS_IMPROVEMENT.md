# CẢI TIẾN HỆ THỐNG THỐNG KÊ CHATBOT

## TỔNG QUAN

Hệ thống thống kê đã được cải tiến để cung cấp phân loại chi tiết hơn về:
- **Tỷ lệ trả lời đúng/sai** dựa trên LLM verification
- **Phân loại lỗi chi tiết** (lỗi hệ thống vs lỗi API)
- **Theo dõi chất lượng** câu trả lời theo thời gian

## CÁC THAY ĐỔI CHÍNH

### 1. Model History - Bổ sung trường mới

#### Trường `errorType` - Phân loại lỗi chi tiết:
```javascript
errorType: {
    type: String,
    enum: [
        'none',                    // Không có lỗi
        'system_error',            // Lỗi hệ thống (database, network...)
        'api_rate_limit',          // Lỗi rate limit từ Gemini API (429)
        'api_timeout',             // Lỗi timeout từ Gemini API
        'api_quota_exceeded',      // Lỗi quota exceeded
        'api_authentication',      // Lỗi authentication với API
        'cypher_error',            // Lỗi truy vấn Cypher
        'context_not_found',       // Không tìm thấy context phù hợp
        'validation_error',        // Lỗi validation
        'unknown'                  // Lỗi không xác định
    ],
    default: 'none'
}
```

#### Trường `errorDetails` - Chi tiết lỗi:
```javascript
errorDetails: {
    message: { type: String, default: '' },
    code: { type: String, default: '' },
    stack: { type: String, default: '' },
    retryCount: { type: Number, default: 0 },
    lastRetryAt: { type: Date, default: null }
}
```

#### Trường `verificationResult` - Kết quả verification:
```javascript
verificationResult: {
    type: String,
    enum: ['correct', 'incorrect', 'pending', 'skipped'],
    default: 'pending'
}
```

### 2. API Endpoints Mới

#### `/api/statistics/detailed-summary`
Thống kê tổng hợp mới với phân loại chi tiết:
```json
{
    "totalUsers": 150,
    "totalInteractions": 1250,
    "verificationStats": {
        "total": 1250,
        "correct": 980,
        "incorrect": 120,
        "pending": 100,
        "skipped": 50,
        "correctRate": 0.784,
        "incorrectRate": 0.096,
        "pendingRate": 0.08,
        "skippedRate": 0.04
    },
    "errorTypeStats": {
        "totalErrors": 150,
        "errorTypes": [
            {"errorType": "api_rate_limit", "count": 80, "rate": 0.533},
            {"errorType": "system_error", "count": 45, "rate": 0.3},
            {"errorType": "cypher_error", "count": 25, "rate": 0.167}
        ],
        "systemErrors": [...],
        "apiErrors": [...]
    },
    "overallAccuracy": 0.784,
    "overallErrorRate": 0.12,
    "systemErrorRate": 0.036,
    "apiErrorRate": 0.064
}
```

#### `/api/statistics/verification`
Thống kê verification (tỷ lệ trả lời đúng/sai):
```json
{
    "total": 1250,
    "correct": 980,
    "incorrect": 120,
    "pending": 100,
    "skipped": 50,
    "correctRate": 0.784,
    "incorrectRate": 0.096,
    "pendingRate": 0.08,
    "skippedRate": 0.04
}
```

#### `/api/statistics/error-types`
Thống kê phân loại lỗi chi tiết:
```json
{
    "totalErrors": 150,
    "errorTypes": [
        {"errorType": "api_rate_limit", "count": 80, "rate": 0.533},
        {"errorType": "system_error", "count": 45, "rate": 0.3},
        {"errorType": "cypher_error", "count": 25, "rate": 0.167}
    ],
    "systemErrors": [
        {"errorType": "system_error", "count": 45, "rate": 0.3},
        {"errorType": "cypher_error", "count": 25, "rate": 0.167}
    ],
    "apiErrors": [
        {"errorType": "api_rate_limit", "count": 80, "rate": 0.533}
    ]
}
```

#### `/api/statistics/qa-by-error-type`
Thống kê số câu hỏi theo loại lỗi:
```json
[
    {"_id": "api_rate_limit", "count": 80},
    {"_id": "system_error", "count": 45},
    {"_id": "cypher_error", "count": 25}
]
```

#### `/api/statistics/qa-by-verification-result`
Thống kê số câu hỏi theo kết quả verification:
```json
[
    {"_id": "correct", "count": 980},
    {"_id": "incorrect", "count": 120},
    {"_id": "pending", "count": 100},
    {"_id": "skipped", "count": 50}
]
```

#### `/api/statistics/verification-score-by-day`
Thống kê verification score trung bình theo ngày:
```json
[
    {
        "_id": "2024-01-15",
        "avgScore": 0.85,
        "count": 45
    },
    {
        "_id": "2024-01-16", 
        "avgScore": 0.78,
        "count": 52
    }
]
```

### 3. Logic Phân Loại Lỗi Tự Động

#### Trong GeminiService:
- **429**: `api_rate_limit`
- **401/403**: `api_authentication`
- **402**: `api_quota_exceeded`
- **408/timeout**: `api_timeout`
- **Network errors**: `system_error`

#### Trong HistoryService:
- Tự động detect lỗi dựa trên nội dung answer
- Phân loại dựa trên keywords trong error message

### 4. Cập Nhật Verification Service

- Cập nhật `verificationResult` thay vì chỉ `status`
- Tự động set `status = 'incorrect_answer'` khi verification fail

## CÁCH SỬ DỤNG

### 1. Lấy thống kê tổng hợp mới:
```javascript
const response = await fetch('/api/statistics/detailed-summary?startDate=2024-01-01&endDate=2024-01-31');
const data = await response.json();
console.log('Tỷ lệ trả lời đúng:', data.verificationStats.correctRate);
console.log('Tỷ lệ lỗi hệ thống:', data.systemErrorRate);
console.log('Tỷ lệ lỗi API:', data.apiErrorRate);
```

### 2. Theo dõi chất lượng theo thời gian:
```javascript
const response = await fetch('/api/statistics/verification-score-by-day?startDate=2024-01-01&endDate=2024-01-31');
const data = await response.json();
// Vẽ biểu đồ trend của verification score
```

### 3. Phân tích lỗi chi tiết:
```javascript
const response = await fetch('/api/statistics/error-types?startDate=2024-01-01&endDate=2024-01-31');
const data = await response.json();
console.log('Lỗi API chiếm:', data.apiErrors.reduce((sum, item) => sum + item.count, 0));
console.log('Lỗi hệ thống chiếm:', data.systemErrors.reduce((sum, item) => sum + item.count, 0));
```

## LỢI ÍCH

### 1. Phân Loại Chính Xác
- **Tỷ lệ trả lời đúng**: Dựa trên LLM verification thay vì chỉ "trả lời được"
- **Tỷ lệ trả lời sai**: Phát hiện câu trả lời không chính xác
- **Phân biệt lỗi**: Lỗi hệ thống vs lỗi API bên ngoài

### 2. Monitoring Tốt Hơn
- Theo dõi chất lượng câu trả lời theo thời gian
- Phát hiện sớm các vấn đề về API hoặc hệ thống
- Đánh giá hiệu quả của các cải tiến

### 3. Debugging Hiệu Quả
- Biết chính xác loại lỗi để có hướng xử lý phù hợp
- Theo dõi retry count và thời gian retry
- Phân tích pattern lỗi theo thời gian

## MIGRATION

### 1. Database Migration
```javascript
// Cập nhật các record cũ
db.histories.updateMany(
    { errorType: { $exists: false } },
    { $set: { errorType: 'none', verificationResult: 'pending' } }
);
```

### 2. Frontend Updates
- Cập nhật dashboard để hiển thị thống kê mới
- Thêm biểu đồ phân loại lỗi
- Hiển thị trend verification score

### 3. Monitoring Alerts
- Alert khi tỷ lệ lỗi API > 10%
- Alert khi verification score < 0.7
- Alert khi có nhiều lỗi system_error liên tiếp