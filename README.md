# TDTU Admission Chatbot

**Graduation Thesis - TDTU Admission Chatbot: Khóa luận tốt nghiệp đề tài chatbot hỗ trợ tuyển sinh.**

---

## 🏗️ Kiến trúc tổng quan

- **Crawl, chuẩn hóa & import dữ liệu:** Dùng notebook Python (`main_cleaned.ipynb`) để tự động thu thập, xử lý và chuẩn hóa dữ liệu ngành học, chương trình đào tạo, văn bản tuyển sinh, học phí, học bổng...
- **Backend Node.js:** Xây dựng API phục vụ lưu trữ, truy vấn và xây dựng Knowledge Graph trên Neo4j.
- **Frontend React:** Giao diện hỏi đáp, tra cứu thông tin ngành học, chương trình...
- **Neo4j (Graph Database):** Lưu trữ dữ liệu dạng đồ thị, tối ưu cho truy vấn phức tạp và xây dựng context cho LLM.

---

## 🚀 Hướng dẫn cài đặt & chạy dự án

### 1. Clone repo

```bash
git clone https://github.com/MPhong03/tdtu-admission-chatbot.git
cd tdtu-admission-chatbot
```

> **Lưu ý:**  
> - Các script xử lý dữ liệu nằm trong `data/` hoặc file `main_cleaned.ipynb`.
> - Nếu chưa có đủ thư viện, bạn có thể cài thêm:  
>   ```bash
>   pip install requests beautifulsoup4 unicodedata
>   ```

---

### 2. Cài đặt Neo4j Community (Graph Database)

- Tải Neo4j Community: [https://neo4j.com/download-center/](https://neo4j.com/download-center/)
- Cài đặt và chạy Neo4j Desktop hoặc Neo4j Server:
    - **Default URI:** `bolt://localhost:7687`
    - **Default user:** `neo4j`
    - **Default database:** `neo4j`
    - Đặt mật khẩu (ví dụ: `neo4j123`)
- **Lưu ý:** Đặt mật khẩu và nhớ để cấu hình vào file `.env` của backend.

---

### 3. Cấu hình backend

```bash
cd server/backend
cp .env.example .env
# Chỉnh lại các thông số kết nối Neo4j, ví dụ:
# NEO4J_URI=bolt://localhost:7687
# NEO4J_DB=neo4j
# NEO4J_USER=neo4j
# NEO4J_PASSWORD=neo4j123
npm install
npm run dev
```

---

### 4. Chạy pipeline xử lý dữ liệu (Crawl, chuẩn hóa, import)

**Chạy trong Jupyter Notebook** (khuyến nghị):

```bash
cd data
jupyter notebook
# Mở file main_cleaned.ipynb và chạy từng cell từ trên xuống dưới:
# Giai đoạn 1: Crawl - Chuẩn hóa dữ liệu
# Giai đoạn 2: Import dữ liệu vào hệ thống (Neo4j)
```

---

### 5. Cấu hình frontend (React)

```bash
cd server/frontend
cp .env.example .env
# Chỉnh lại các endpoint API nếu cần
npm install
npm start
```

---

### 6. Kiểm tra dữ liệu đã vào graph

- Truy cập Neo4j Browser tại: [http://localhost:7474](http://localhost:7474)
- Đăng nhập bằng tài khoản đã cấu hình, chạy truy vấn ví dụ:
    ```cypher
    MATCH (m:Major)-[:OF_PROGRAMME]->(p:Programme) RETURN m, p LIMIT 10;
    ```

---

## 📋 Một số lưu ý

- **Cập nhật dữ liệu:** Chỉ cần chạy lại notebook `main_cleaned.ipynb`, mọi dữ liệu mới sẽ tự động được crawl, chuẩn hóa và import vào graph.
- **Khởi tạo index:** Backend sẽ tự động tạo index trên các trường chính (`id`, `name`) để tối ưu tốc độ truy vấn.
- **Lọc context cho LLM:** Các document, văn bản, mô tả ngành... sẽ được backend truy vấn từ graph và gửi lên LLM làm context trả lời.

---
