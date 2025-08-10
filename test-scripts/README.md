# TEST SCRIPTS CHO HỆ THỐNG CHATBOT TDTU

## TỔNG QUAN

Thư mục này chứa các script để chạy testcase tự động cho hệ thống chatbot tuyển sinh TDTU. Các testcase được thiết kế để kiểm tra toàn diện các chức năng của hệ thống.

## CÀI ĐẶT

### 1. Cài đặt dependencies
```bash
cd test-scripts
npm install
```

### 2. Cấu hình môi trường
```bash
# Tạo file .env
cp .env.example .env

# Cập nhật thông tin API
API_BASE_URL=http://localhost:3000/api
```

## SỬ DỤNG

### 1. Chạy tất cả testcase
```bash
npm run test:all
```

### 2. Chạy testcase theo nhóm
```bash
# Test phân loại câu hỏi
npm run test:classification

# Test câu hỏi đơn giản
npm run test:simple

# Test câu hỏi phức tạp
npm run test:complex

# Test cơ chế verification
npm run test:verification

# Test xử lý lỗi
npm run test:error

# Test edge cases
npm run test:edge
```

### 3. Chạy trực tiếp với Node.js
```bash
# Chạy tất cả testcase
node run-testcases.js all

# Chạy testcase theo category
node run-testcases.js category classification
node run-testcases.js category simple_admission
node run-testcases.js category complex_admission
node run-testcases.js category verification
node run-testcases.js category error_handling
node run-testcases.js category edge_cases
```

## CÁC LOẠI TESTCASE

### 1. Classification Testcases
Kiểm tra khả năng phân loại câu hỏi của hệ thống:
- **Simple Admission**: Câu hỏi đơn giản về tuyển sinh
- **Complex Admission**: Câu hỏi phức tạp cần nhiều bước xử lý
- **Off-topic**: Câu hỏi ngoài chủ đề tuyển sinh
- **Inappropriate**: Câu hỏi không phù hợp

### 2. Simple Admission Testcases
Kiểm tra xử lý câu hỏi đơn giản:
- Câu hỏi về học phí
- Câu hỏi về ngành học
- Câu hỏi về điều kiện xét tuyển
- Câu hỏi về học bổng

### 3. Complex Admission Testcases
Kiểm tra xử lý câu hỏi phức tạp:
- So sánh nhiều ngành
- Tư vấn chọn ngành
- Tính toán chi phí

### 4. Verification Testcases
Kiểm tra cơ chế verification:
- **Pre-response**: Verification trước khi trả lời
- **Post-async**: Verification sau khi trả lời
- **Background**: Verification trong background

### 5. Error Handling Testcases
Kiểm tra xử lý lỗi:
- Lỗi API (rate limit, timeout)
- Lỗi hệ thống (database, network)
- Lỗi context không tìm thấy

### 6. Edge Cases Testcases
Kiểm tra các trường hợp đặc biệt:
- Câu hỏi rất ngắn/dài
- Câu hỏi có ký tự đặc biệt
- Câu hỏi có emoji/Unicode

## BÁO CÁO KẾT QUẢ

### 1. JSON Report
Kết quả test được lưu trong file `reports/test-results.json`:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "summary": {
    "totalTests": 25,
    "successCount": 23,
    "failureCount": 2,
    "successRate": "92.00",
    "totalTime": 45000
  },
  "results": [
    {
      "id": "TC001",
      "category": "classification",
      "question": "Học phí ngành CNTT là bao nhiêu?",
      "success": true,
      "processingTime": 1200,
      "verification": {
        "questionType": "simple_admission",
        "processingMethod": "rag_simple",
        "contextScore": 0.85,
        "processingTime": 1.2
      }
    }
  ]
}
```

### 2. HTML Report
Báo cáo HTML được tạo tại `reports/test-results.html` với giao diện trực quan.

### 3. Console Output
Kết quả được hiển thị trực tiếp trên console:
```
🚀 Starting TestCase Runner...
📊 Total test cases: 25
🌐 API Base URL: http://localhost:3000/api

🔄 Running TC001: Câu hỏi trực tiếp về học phí
   Question: "Học phí ngành CNTT là bao nhiêu?"
   ✅ Success (1200ms)

📈 Test Results Summary:
   Total Tests: 25
   Successful: 23
   Failed: 2
   Success Rate: 92.00%
   Total Time: 45000ms
   Average Time: 1800.00ms
```

## METRICS ĐÁNH GIÁ

### 1. Accuracy Metrics
- **Classification Accuracy**: > 95%
- **Answer Accuracy**: > 90%
- **Verification Accuracy**: > 85%

### 2. Performance Metrics
- **Response Time**: < 3s (normal), < 5s (peak)
- **Throughput**: > 100 requests/minute
- **Error Rate**: < 5%

### 3. User Experience Metrics
- **User Satisfaction**: > 4.0/5.0
- **Task Completion Rate**: > 90%
- **Fallback Usage**: < 10%

## TROUBLESHOOTING

### 1. Lỗi kết nối API
```bash
# Kiểm tra API server có đang chạy không
curl http://localhost:3000/api/health

# Kiểm tra cấu hình API_BASE_URL
echo $API_BASE_URL
```

### 2. Lỗi timeout
```bash
# Tăng timeout trong script
# Trong run-testcases.js, thay đổi timeout: 30000 thành timeout: 60000
```

### 3. Lỗi database
```bash
# Kiểm tra kết nối database
# Đảm bảo Neo4j và MongoDB đang chạy
```

### 4. Lỗi rate limit
```bash
# Giảm số lượng request đồng thời
# Tăng delay giữa các request
```

## TÙY CHỈNH TESTCASE

### 1. Thêm testcase mới
Chỉnh sửa file `run-testcases.js`, thêm vào mảng `testCases`:
```javascript
{
    id: 'TC101',
    category: 'custom',
    question: 'Câu hỏi mới',
    expectedCategory: 'simple_admission',
    description: 'Mô tả testcase'
}
```

### 2. Thay đổi validation logic
Chỉnh sửa phương thức `validateResponse()` trong `run-testcases.js`.

### 3. Thay đổi cấu hình
Cập nhật các biến trong constructor của `TestCaseRunner`.

## INTEGRATION VỚI CI/CD

### 1. GitHub Actions
```yaml
name: Run Chatbot Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd test-scripts
          npm install
      - name: Run tests
        run: |
          cd test-scripts
          npm run test:all
      - name: Upload test results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: test-scripts/reports/
```

### 2. Jenkins Pipeline
```groovy
pipeline {
    agent any
    stages {
        stage('Test') {
            steps {
                dir('test-scripts') {
                    sh 'npm install'
                    sh 'npm run test:all'
                }
            }
        }
        stage('Report') {
            steps {
                publishHTML([
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'test-scripts/reports',
                    reportFiles: 'test-results.html',
                    reportName: 'Chatbot Test Results'
                ])
            }
        }
    }
}
```

## KẾT LUẬN

Bộ testcase này cung cấp một cách tiếp cận toàn diện để kiểm tra chất lượng hệ thống chatbot tuyển sinh TDTU. Việc chạy đều đặn các testcase này sẽ giúp:

- **Đảm bảo chất lượng** của hệ thống
- **Phát hiện sớm** các vấn đề
- **Theo dõi hiệu suất** theo thời gian
- **Cải thiện trải nghiệm** người dùng

Hãy chạy testcase thường xuyên và cập nhật theo yêu cầu mới của hệ thống.