# Visitor Rate Limit System

## Tổng quan

Hệ thống Visitor Rate Limit được thiết kế để hạn chế số lượng request của khách vãng lai (visitor) khi sử dụng API `chatWithBot`, trong khi vẫn cho phép người dùng đã đăng nhập sử dụng không giới hạn.

## Tính năng chính

### 1. Rate Limit Policy
- **Visitor (khách vãng lai)**: 20 câu hỏi mỗi 5 giờ
- **User đã đăng nhập**: Không giới hạn
- **Reset tự động**: Sau 5 giờ kể từ câu hỏi đầu tiên

### 2. Cơ chế hoạt động
- Sử dụng Redis để lưu trữ counter và TTL
- Tự động tạo visitor ID nếu không được cung cấp
- Middleware kiểm tra rate limit trước khi xử lý request
- Tăng counter sau khi chat thành công

## API Endpoints

### Chat với Bot
```
POST /api/chatbot/chat
Headers: 
  - Authorization: Bearer <token> (optional)
  - X-Visitor-Id: <visitor-id> (required for visitors)
Body: { "question": "Câu hỏi của bạn", "chatId": "optional" }
```

### Kiểm tra Rate Limit (Visitor)
```
GET /api/visitor/rate-limit/check?visitorId=<visitor-id>
Headers: X-Visitor-Id: <visitor-id>
```

### Xem Policy
```
GET /api/visitor/rate-limit/policy
```

### Admin Management

#### Thống kê tổng quan
```
GET /api/admin/visitor-rate-limit/stats
Headers: Authorization: Bearer <admin-token>
```

#### Reset Rate Limit cho Visitor
```
POST /api/admin/visitor-rate-limit/reset
Headers: Authorization: Bearer <admin-token>
Body: { "visitorId": "visitor-id", "type": "chat" }
```

#### Cleanup Expired Keys
```
POST /api/admin/visitor-rate-limit/cleanup
Headers: Authorization: Bearer <admin-token>
```

#### Xem thông tin Visitor cụ thể
```
GET /api/admin/visitor-rate-limit/:visitorId?type=chat
Headers: Authorization: Bearer <admin-token>
```

## Response Headers

Khi gọi API chat, response sẽ bao gồm các headers sau:

```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1640995200
```

## Error Response

Khi visitor đạt giới hạn:

```json
{
  "Code": -1,
  "Message": "Bạn đã đạt giới hạn 20 câu hỏi. Giới hạn sẽ được reset vào 15/01/2024, 14:30. Vui lòng đăng ký tài khoản để chat không giới hạn.",
  "Data": {
    "remaining": 0,
    "resetIn": 1800,
    "resetTime": "15/01/2024, 14:30",
    "limit": 20,
    "window": 18000
  }
}
```

## Cách sử dụng

### 1. Frontend Implementation

#### Tạo Visitor ID
```javascript
// Tạo visitor ID duy nhất cho mỗi session
const visitorId = localStorage.getItem('visitorId') || generateUUID();
localStorage.setItem('visitorId', visitorId);

// Gửi request với visitor ID
const response = await fetch('/api/chatbot/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Visitor-Id': visitorId
  },
  body: JSON.stringify({ question: 'Câu hỏi của bạn' })
});

// Kiểm tra rate limit headers
const remaining = response.headers.get('X-RateLimit-Remaining');
const resetTime = response.headers.get('X-RateLimit-Reset');
```

#### Kiểm tra Rate Limit trước khi gửi
```javascript
async function checkRateLimit() {
  const response = await fetch(`/api/visitor/rate-limit/check?visitorId=${visitorId}`);
  const data = await response.json();
  
  if (data.Code === 1) {
    const { remaining, resetTime, isLimited } = data.Data;
    
    if (isLimited) {
      alert(`Bạn đã đạt giới hạn. Reset vào: ${resetTime}`);
      return false;
    }
    
    console.log(`Còn lại ${remaining} câu hỏi`);
    return true;
  }
  
  return true;
}
```

### 2. Backend Integration

#### Middleware tự động
```javascript
// Middleware đã được tích hợp sẵn
router.post("/chat", optionalAuth, visitorChatRateLimit, ChatbotController.chatWithBot);
```

#### Kiểm tra trong Controller
```javascript
// Tự động tăng counter cho visitor
if (req.isVisitor && req.visitorId) {
  await this.visitorRateLimitService.incrementCounter(req.visitorId, 'chat');
}
```

## Cấu hình

### Environment Variables
```bash
REDIS_URL=redis://localhost:6379
```

### Rate Limit Settings
```javascript
// Trong VisitorRateLimitService
this.config = {
  chatLimit: 20,           // Số câu hỏi tối đa
  chatWindow: 5 * 60 * 60, // Thời gian window (5 giờ)
  keyPrefix: 'visitor-chat' // Prefix cho Redis keys
};
```

## Monitoring & Analytics

### Redis Keys Pattern
```
visitor-chat:chat:visitor-id-1
visitor-chat:chat:visitor-id-2
```

### Metrics có sẵn
- Tổng số visitors
- Số visitors bị limit
- Số visitors đang active
- Tổng số requests

## Troubleshooting

### 1. Redis Connection Error
- Hệ thống sẽ fallback và không áp dụng rate limit
- Log error để debug

### 2. Visitor ID Missing
- Tự động tạo UUID mới
- Log warning để track

### 3. Rate Limit Bypass
- Chỉ áp dụng cho visitor (không có user ID)
- Admin có thể reset manual

## Best Practices

1. **Frontend**: Luôn gửi visitor ID trong header
2. **Backend**: Kiểm tra rate limit trước khi xử lý request
3. **Monitoring**: Theo dõi Redis performance và error logs
4. **Cleanup**: Chạy cleanup job định kỳ để dọn expired keys
5. **Testing**: Test với nhiều visitor ID khác nhau

## Future Enhancements

- [ ] Rate limit theo IP address
- [ ] Dynamic rate limit dựa trên user behavior
- [ ] Rate limit cho các API khác
- [ ] Analytics dashboard
- [ ] Email notification khi gần đạt limit