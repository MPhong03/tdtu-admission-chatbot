import requests
import glob
import os

# API URL
url = "http://localhost:5000/api/import"

# Đường dẫn file tổng ngành
tdtu_majors_path = "output/tdtu_majors.json"

# Tìm tất cả file JSON trong thư mục details/
detail_dir = "output/details"
detail_files = glob.glob(os.path.join(detail_dir, "*.json"))

# Chuẩn bị files gửi lên
files = [
    ("tdtu_majors", ("tdtu_majors.json", open(tdtu_majors_path, "rb"), "application/json")),
]

# Gửi mỗi detail file với cùng key: "details"
for fpath in detail_files:
    filename = os.path.basename(fpath)
    files.append(("details", (filename, open(fpath, "rb"), "application/json")))

# Gửi request POST
response = requests.post(url, files=files)

# In kết quả
print("Status:", response.status_code)
print("Response:", response.json())
