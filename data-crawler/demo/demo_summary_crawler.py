import requests
from bs4 import BeautifulSoup
import json

# URL của trang danh mục ngành học
url = 'https://admission.tdtu.edu.vn/dai-hoc/nganh-hoc'

# Gửi yêu cầu GET đến trang web
response = requests.get(url)
soup = BeautifulSoup(response.content, 'html.parser')

# Danh sách lưu kết quả
result = []

# Tìm tất cả các nhóm ngành
groups = soup.find_all('div', class_='ts-ng-und')

for group in groups:
    # Lấy tên nhóm ngành
    group_name_tag = group.find(class_='ts-ng-und-td')
    if not group_name_tag:
        continue

    group_name = group_name_tag.get_text(strip=True)

    # Tìm tất cả các ngành trong nhóm
    majors = group.find_all('a')
    major_list = []
    for major in majors:
        major_name = major.get_text(strip=True)
        major_link = major['href']
        major_list.append({
            'name': major_name,
            'link': major_link
        })

    result.append({
        'group_name': group_name,
        'majors': major_list
    })

# Ghi ra file JSON
with open('tdtu_majors.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print("✅ Đã xuất ra file tdtu_majors.json")
