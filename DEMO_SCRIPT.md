# KỊCH BẢN DEMO SẢN PHẨM CHATBOT HỖ TRỢ TUYỂN SINH TDTU

## 🎯 TỔNG QUAN DEMO

**Thời gian**: 10-12 phút  
**Mục tiêu**: Chứng minh khả năng hoạt động toàn diện của hệ thống enterprise-grade  
**Thiết bị**: Laptop + projector, kết nối internet ổn định, backup video demo  
**Focus**: Thể hiện 50+ tính năng từ basic đến advanced  

## 🎬 KỊCH BẢN CHI TIẾT

### PHẦN 1: MỞ ĐẦU DEMO (1 phút)

**[Mở trình duyệt, truy cập giao diện chính]**

📢 **Lời thuyết minh**:
> "Bây giờ em sẽ demo trực tiếp hệ thống chatbot. Đây là giao diện chính mà sinh viên sẽ tương tác để được tư vấn tuyển sinh."

**Hành động**:
- Mở browser, truy cập `http://localhost:3000` (hoặc URL deploy)
- Hiển thị trang chủ với giao diện chatbot

📢 **Giới thiệu giao diện**:
> "Giao diện được thiết kế đơn giản, thân thiện với người dùng. Ở đây có khu vực chat chính, sidebar để quản lý các cuộc hội thoại, và phần gợi ý câu hỏi thường gặp."

---

### PHẦN 2: DEMO CLASSIFICATION SYSTEM (2.5 phút)

#### 2.1 Test với câu hỏi INAPPROPRIATE (30 giây)

**[Nhập câu hỏi]**: "Mày có biết gì không?"

📢 **Thuyết minh**:
> "Đầu tiên em sẽ test khả năng phát hiện nội dung không phù hợp của hệ thống."

**Kết quả mong đợi**: 
```
🤖 "Xin lỗi, tôi nhận thấy câu hỏi có thể không phù hợp. Tôi là chatbot hỗ trợ tuyển sinh TDTU. Bạn có thể hỏi tôi về thông tin ngành học, học phí, thủ tục xét tuyển nhé!"
```

📢 **Giải thích**:
> "Hệ thống đã tự động phát hiện và xử lý nội dung không phù hợp một cách lịch sự."

#### 2.2 Test với câu hỏi OFF_TOPIC (45 giây)

**[Nhập câu hỏi]**: "Hôm nay thời tiết thế nào?"

📢 **Thuyết minh**:
> "Tiếp theo em test với câu hỏi ngoài chủ đề tuyển sinh."

**Kết quả mong đợi**:
```
🤖 "Tôi hiểu bạn quan tâm đến thời tiết, nhưng tôi là chatbot chuyên hỗ trợ tuyển sinh TDTU. Tôi có thể giúp bạn về thông tin ngành học, học phí, điều kiện xét tuyển, hay bất kỳ thắc mắc nào về việc học tại TDTU. Bạn muốn hỏi gì về TDTU nhé?"
```

📢 **Giải thích**:
> "Hệ thống nhận diện được câu hỏi ngoài chủ đề và chuyển hướng người dùng về các topic liên quan tuyển sinh."

#### 2.3 Test với câu hỏi SIMPLE_ADMISSION (75 giây)

**[Nhập câu hỏi]**: "Học phí ngành CNTT là bao nhiêu?"

📢 **Thuyết minh**:
> "Bây giờ em test với câu hỏi đơn giản về tuyển sinh - đây là loại câu hỏi chiếm đa số."

**Kết quả mong đợi**:
```
🤖 "Dựa trên thông tin mới nhất của TDTU, học phí ngành Công nghệ Thông tin như sau:

📚 **Chương trình Tiêu chuẩn**: 1.080.000 VNĐ/tín chỉ
📚 **Chương trình Chất lượng cao**: 1.620.000 VNĐ/tín chỉ  
📚 **Chương trình Liên kết Quốc tế**: 2.430.000 VNĐ/tín chỉ

💡 Tổng số tín chỉ của ngành CNTT là 120 tín chỉ, bạn có thể tính toán chi phí tổng theo từng chương trình.

Bạn còn thắc mắc gì khác về ngành CNTT không?"
```

📢 **Giải thích**:
> "Với câu hỏi đơn giản, hệ thống sử dụng RAG truyền thống - một query Cypher để lấy thông tin chính xác từ Neo4j và trả lời trực tiếp."

---

### PHẦN 3: DEMO AI AGENT CHO CÂU HỎI PHỨC TẠP (3 phút)

#### 3.1 Câu hỏi so sánh và tư vấn

**[Nhập câu hỏi]**: "So sánh học phí và cơ hội việc làm giữa ngành CNTT và KTPM, em nên chọn ngành nào?"

📢 **Thuyết minh**:
> "Đây là câu hỏi phức tạp cần phân tích và so sánh nhiều yếu tố. Hệ thống sẽ sử dụng AI Agent với multi-step reasoning."

**[Trong khi chờ phản hồi]**:
> "Các bạn có thể thấy thời gian xử lý lâu hơn vì hệ thống đang:
> 1. Phân tích câu hỏi để xác định entities (CNTT, KTPM)
> 2. Thực hiện multiple queries để thu thập dữ liệu đầy đủ
> 3. So sánh và phân tích để đưa ra tư vấn"

**Kết quả mong đợi**:
```
🤖 "Tôi sẽ so sánh chi tiết 2 ngành này cho bạn:

## 📊 SO SÁNH HỌC PHÍ

**Ngành Công nghệ Thông tin (CNTT):**
- Tiêu chuẩn: 1.080.000 VNĐ/tín chỉ
- Chất lượng cao: 1.620.000 VNĐ/tín chỉ
- Liên kết QT: 2.430.000 VNĐ/tín chỉ

**Ngành Kỹ thuật Phần mềm (KTPM):**
- Tiêu chuẩn: 1.080.000 VNĐ/tín chỉ  
- Chất lượng cao: 1.620.000 VNĐ/tín chỉ
- Liên kết QT: 2.430.000 VNĐ/tín chỉ

➡️ **Kết luận**: Học phí 2 ngành tương đương nhau.

## 🎯 SO SÁNH CƠ HỘI VIỆC LÀM

**CNTT** - Rộng và đa dạng:
- Lập trình viên, System Admin, Network Engineer
- Data Analyst, Cybersecurity Specialist
- IT Consultant, Project Manager

**KTPM** - Chuyên sâu về phần mềm:
- Software Developer, Software Architect  
- DevOps Engineer, Quality Assurance
- Product Manager, Technical Lead

## 💡 TƯ VẤN CÁ NHÂN HÓA

**Nên chọn CNTT nếu bạn:**
- Thích khám phá nhiều lĩnh vực IT
- Muốn có nhiều lựa chọn nghề nghiệp
- Quan tâm đến hệ thống, mạng, bảo mật

**Nên chọn KTPM nếu bạn:**
- Đam mê lập trình và phát triển phần mềm
- Thích làm việc với quy trình phát triển sản phẩm
- Muốn chuyên sâu về kỹ thuật phần mềm

Bạn có thể chia sẻ thêm về sở thích để tôi tư vấn cụ thể hơn không?"
```

📢 **Giải thích**:
> "Đây là điểm mạnh của AI Agent - không chỉ trả lời thông tin mà còn phân tích, so sánh và đưa ra tư vấn cá nhân hóa dựa trên multiple data points."

---

### PHẦN 4: DEMO KNOWLEDGE GRAPH POWER (2 phút)

#### 4.1 Câu hỏi liên quan đến relationships

**[Nhập câu hỏi]**: "Ngành nào có học bổng và học phí rẻ nhất năm 2024?"

📢 **Thuyết minh**:
> "Câu hỏi này cần kết hợp nhiều loại thông tin từ Knowledge Graph: ngành học, học phí, học bổng, và năm."

**Kết quả mong đợi**:
```
🤖 "Dựa trên dữ liệu từ hệ thống Knowledge Graph, tôi tìm được thông tin sau:

## 💰 NGÀNH CÓ HỌC PHÍ RẺ NHẤT (2024)

**Top 3 ngành học phí thấp nhất:**
1. **Ngành Kinh tế** - Hệ Tiêu chuẩn: 900.000 VNĐ/tín chỉ
2. **Ngành Quản trị Kinh doanh** - Hệ Tiêu chuẩn: 950.000 VNĐ/tín chỉ  
3. **Ngành Kế toán** - Hệ Tiêu chuẩn: 950.000 VNĐ/tín chỉ

## 🎓 HỌC BỔNG HIỆN CÓ (2024)

**Học bổng chung:**
- Học bổng khuyến khích học tập: 50-100% học phí
- Học bổng hỗ trợ tài chính: 30-70% học phí
- Học bổng tài năng: 100% học phí + phụ cấp

**Đặc biệt:** Ngành Kinh tế hiện có thêm học bổng ngành từ các doanh nghiệp liên kết.

## 🎯 KHUYẾN NGHỊ

**Kết hợp tối ưu:** Ngành Kinh tế với học bổng khuyến khích học tập có thể giảm chi phí xuống còn 450.000 VNĐ/tín chỉ.

Bạn muốn biết thêm về điều kiện xét học bổng không?"
```

📢 **Giải thích**:
> "Graph Database cho phép hệ thống traverse qua multiple relationships để tìm ra insights phức tạp mà SQL database khó thực hiện."

---

### PHẦN 5: DEMO ADVANCED FEATURES (2 phút)

#### 5.1 Demo Chat Management Features (1 phút)

**[Thực hiện các tính năng quản lý chat]**:

1. **Chat History & Search**: 
   - Click vào sidebar, hiển thị các cuộc hội thoại trước
   - Search trong chat history
   - 📢 "Hệ thống lưu trữ và tìm kiếm lịch sử chat hiệu quả"

2. **Folder Organization**:
   - Tạo folder mới "Tư vấn ngành học" 
   - Di chuyển chat vào folder
   - Rename folder và chat
   - 📢 "Sinh viên có thể organize conversations theo chủ đề"

3. **Real-time Features**:
   - Hiển thị typing indicator khi chatbot đang xử lý
   - Socket.io connection status
   - 📢 "Real-time messaging với notification system"

#### 5.2 Demo Feedback System (1 phút)

**[Demo tính năng feedback]**:

1. **User Feedback**:
   - Rate một câu trả lời của chatbot (thumbs up/down)
   - Viết detailed feedback
   - 📢 "Hệ thống feedback giúp improve chatbot quality"

2. **Responsive Design**:
   - Thu nhỏ browser để demo mobile view
   - Test trên tablet view
   - 📢 "Mobile-first design, accessible trên mọi device"

---

### PHẦN 6: DEMO DASHBOARD ADMIN (2 phút)

**[Chuyển tab sang dashboard admin]**

📢 **Thuyết minh**:
> "Cuối cùng, em sẽ demo dashboard admin - đây là hệ thống quản trị hoàn chỉnh cho việc vận hành chatbot."

**[Truy cập `http://localhost:3001/dashboard`]**

#### 6.1 Demo Analytics Dashboard (45 giây)

**[Navigate to Analytics section]**
- **Real-time Metrics**: Hiển thị số user online, total conversations
- **Usage Statistics**: Biểu đồ số câu hỏi theo ngày với ApexCharts
- **Q&A Analysis**: Thống kê theo classification (simple/complex/off-topic)
- **Word Cloud**: Top keywords người dùng quan tâm nhất

📢 **Giải thích**:
> "Dashboard cung cấp insights real-time về việc sử dụng hệ thống. Admin có thể track engagement và identify trending topics."

#### 6.2 Demo Content Management (45 giây)

**[Navigate to Content Management]**
1. **Majors Management**: 
   - Hiển thị danh sách ngành học có phân trang
   - Demo tạo/edit một ngành học mới
   
2. **Documents Management**:
   - Upload tài liệu tuyển sinh mới
   - Preview và edit existing documents

3. **Tuition Management**:
   - Cập nhật học phí theo chương trình/năm
   - Import từ Excel file

📢 **Giải thích**:
> "Admin có thể quản lý toàn bộ content mà chatbot sử dụng. Mọi thay đổi sẽ được sync ngay vào Neo4j và chatbot có thể trả lời với thông tin mới."

#### 6.3 Demo System Monitoring (30 giây)

**[Navigate to System section]**
- **Health Checks**: Neo4j connection, Gemini API status
- **Performance Metrics**: Response times, error rates
- **User Feedback**: Recent feedback và admin responses

📢 **Kết thúc**:
> "Hệ thống monitoring giúp admin đảm bảo chatbot hoạt động stable và continuously improve based on user feedback."

---

## 🎯 BACKUP PLANS & TROUBLESHOOTING

### Nếu hệ thống lỗi:

1. **Plan B - Video Demo**:
   - Chuẩn bị sẵn video recording demo đầy đủ
   - Thời lượng 5-7 phút, quality HD

2. **Plan C - Screenshots**:
   - Slide deck với screenshots key features
   - Kèm theo explanation cho từng tính năng

### Nếu API Gemini lỗi:

```javascript
// Fallback response đã được code sẵn
"Xin lỗi, hệ thống AI đang bảo trì. Nhưng tôi vẫn có thể trả lời các câu hỏi cơ bản từ database. Bạn có thể hỏi về thông tin ngành học, học phí, điều kiện xét tuyển..."
```

### Nếu Neo4j connection lỗi:

- Demo bằng cached data
- Explain về architecture và fallback mechanisms

---

## 📋 CHECKLIST CHUẨN BỊ DEMO

### Trước demo 30 phút:

- [ ] Kiểm tra kết nối internet
- [ ] Test đầy đủ flow demo
- [ ] Chuẩn bị sample data trong Neo4j
- [ ] Clear browser cache và cookies
- [ ] Setup projector và audio

### Trước demo 10 phút:

- [ ] Mở sẵn all required tabs
- [ ] Test microphone và volume
- [ ] Backup video demo sẵn sàng
- [ ] Kiểm tra Gemini API quota
- [ ] Neo4j database running

### Câu hỏi demo backup:

1. **Simple**: "TDTU có mấy ngành?"
2. **Complex**: "Tư vấn ngành phù hợp với người thích toán và công nghệ"
3. **Comparison**: "So sánh chương trình tiêu chuẩn và chất lượng cao"
4. **Inappropriate**: Test content filtering
5. **Off-topic**: "Cách nấu phở ngon"

---

## 💬 CÂU THOẠI MẪU CHO CÁC TÌNH HUỐNG

### Khi demo chạy smooth:
> "Như các thầy cô thấy, hệ thống đã xử lý câu hỏi một cách thông minh và chính xác..."

### Khi có delay:
> "Hệ thống đang thực hiện multi-step analysis để đưa ra câu trả lời toàn diện nhất..."

### Khi có lỗi nhỏ:
> "Đây là môi trường development, trong production sẽ có error handling tốt hơn..."

### Kết thúc demo:
> "Demo cho thấy hệ thống có thể xử lý đầy đủ các loại câu hỏi từ đơn giản đến phức tạp, giúp sinh viên có được thông tin tuyển sinh chính xác và kịp thời 24/7."

---

## 🎬 TỔNG KẾT DEMO

**Thời gian thực tế**: 10-12 phút  
**Key messages đã truyền tải**:
- ✅ **AI Layer**: Classification system + RAG + AI Agent
- ✅ **User Experience**: Real-time chat + folder management + feedback
- ✅ **Admin Features**: Content management + analytics + monitoring
- ✅ **Enterprise Features**: Authentication + import/export + notifications
- ✅ **Technical Excellence**: Performance + scalability + error handling
- ✅ **Production Ready**: 50+ APIs + monitoring + security

**Impact**: Demo comprehensive thể hiện đây là một **enterprise-grade system** có thể deploy ngay cho TDTU và scale cho các trường đại học khác, không chỉ là prototype mà là production-ready solution.