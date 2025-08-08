# KỊCH BẢN DEMO SẢN PHẨM CHATBOT HỖ TRỢ TUYỂN SINH TDTU

## 🎯 TỔNG QUAN DEMO

**Thời gian**: 8-10 phút  
**Mục tiêu**: Chứng minh khả năng hoạt động của hệ thống với các tình huống thực tế  
**Thiết bị**: Laptop + projector, kết nối internet ổn định  

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

### PHẦN 5: DEMO REAL-TIME & FEATURES (1.5 phút)

#### 5.1 Demo tính năng thực tế

**[Thực hiện nhanh các tính năng]**:

1. **Chat History**: 
   - Click vào sidebar, hiển thị các cuộc hội thoại trước
   - 📢 "Hệ thống lưu trữ lịch sử chat để người dùng có thể tham khảo lại"

2. **Folder Organization**:
   - Tạo folder mới "Tư vấn ngành học"
   - 📢 "Sinh viên có thể tổ chức các cuộc hội thoại theo chủ đề"

3. **Responsive Design**:
   - Thu nhỏ browser để demo mobile view
   - 📢 "Giao diện responsive, hoạt động tốt trên mọi thiết bị"

4. **Real-time Features**:
   - Hiển thị typing indicator khi chatbot đang xử lý
   - 📢 "Real-time messaging với Socket.io cho trải nghiệm mượt mà"

---

### PHẦN 6: DEMO DASHBOARD ADMIN (1 phút)

**[Chuyển tab sang dashboard admin]**

📢 **Thuyết minh**:
> "Cuối cùng, em sẽ demo nhanh dashboard admin để quản lý hệ thống."

**[Truy cập `http://localhost:3001/dashboard`]**

**Hiển thị các tính năng**:

1. **Analytics Dashboard**:
   - Biểu đồ số lượng câu hỏi theo ngày
   - Top câu hỏi thường gặp
   - User engagement metrics

2. **Content Management**:
   - Danh sách ngành học trong hệ thống
   - Quản lý tài liệu tuyển sinh
   - Cập nhật thông tin học phí

3. **System Monitoring**:
   - Health check status
   - Response time metrics
   - Error rate monitoring

📢 **Kết thúc**:
> "Dashboard giúp admin theo dõi hiệu suất và quản lý nội dung một cách hiệu quả."

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

**Thời gian thực tế**: 8-10 phút  
**Key messages đã truyền tải**:
- ✅ Classification system thông minh
- ✅ RAG với Knowledge Graph  
- ✅ AI Agent cho câu hỏi phức tạp
- ✅ Real-time features và UX tốt
- ✅ Admin dashboard đầy đủ
- ✅ Production-ready system

**Impact**: Demo thuyết phục được tính khả thi và giá trị thực tiễn của hệ thống cho TDTU và có thể mở rộng cho các trường khác.