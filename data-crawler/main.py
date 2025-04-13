import os
import requests
from bs4 import BeautifulSoup
import json
import re
from config import BASE_URL, OUTPUT_DIR, DETAILS_DIR

def get_text_safe(element):
    return element.get_text(strip=True) if element else ''

def crawl_major_detail(url):
    res = requests.get(url)
    soup = BeautifulSoup(res.content, 'html.parser')
    data = {}

    data['name'] = get_text_safe(soup.find('h2', class_='title'))

    description_block = soup.find('div', class_='block-nganh-1-content')
    data['description'] = '\n'.join(get_text_safe(p) for p in description_block.find_all('p')) if description_block else ''

    reasons = []
    for block in soup.select('div.gsc-column'):
        title = block.select_one('div.highlight_content > div.title')
        if title:
            reasons.append(get_text_safe(title))
    data['reasons'] = reasons

    data['programs'] = []

    # Tìm block chứa danh sách tab
    tabs_container = soup.select_one('div.gsc-tabs, div.nganh-link-admission')
    if tabs_container:
        tab_list = tabs_container.find('ul')
        if tab_list:
            for li in tab_list.find_all('li'):
                a = li.find('a')
                if a:
                    data['programs'].append({
                        'tab': get_text_safe(a),
                        'major_code': '',
                        'description': '',
                        'content': {}
                    })

    tab_contents = []
    if soup.select_one('div.gsc-tabs'):
        tab_contents = soup.select('div.gsc-tabs div.tab-content > .tab-pane')
    elif soup.select_one('div.nganh-link-admission'):
        # Tìm tất cả các <div> con trong .nganh-link-admission mà KHÔNG chứa <ul> (chỉ lấy content tab)
        nganh_container = soup.select_one('div.nganh-link-admission')
        tab_contents = [
            div for div in nganh_container.find_all('div', recursive=False)
            if not div.find('ul') and div.get('id')  # thường là #tieu-chuan, #tien-tien, ...
        ]

    for i, content in enumerate(tab_contents):
        if i >= len(data['programs']):
            continue
        program = data['programs'][i]
        tt_block = content.find('div', class_='tab-chuong-trinh-tt')
        if tt_block:
            # Lấy toàn bộ văn bản trong các thẻ <strong> rồi nối lại thành một chuỗi duy nhất
            strongs = [get_text_safe(s) for s in tt_block.find_all('strong') if get_text_safe(s)]
            full_text = ''.join(strongs).strip()

            # Cập nhật regex để tách tên ngành và mã ngành
            match = re.search(r'^(.*?)\s*[-–—]?\s*Mã ngành[:：]?\s*([A-Z]{0,2}\s*\d{5,}[A-Z]?)', full_text, re.IGNORECASE)

            if match:
                program['name'] = match.group(1).strip()
                program['major_code'] = match.group(2).replace(" ", "").strip()
            else:
                program['name'] = full_text
                program['major_code'] = ''

        program['description'] = '\n'.join(get_text_safe(p) for p in content.find_all('p') if get_text_safe(p))
        ct_block = content.find('div', class_='tab-chuong-trinh')
        if ct_block:
            for section in ct_block.find_all('div', class_='tab-ct'):
                for flex in section.find_all('div', class_='tab-ct-flex'):
                    title = get_text_safe(flex.find('div', class_='tab-ct-flex-title'))
                    if title:
                        value = ' '.join(get_text_safe(p) for p in flex.find_all('p'))
                        program['content'][title] = value

    data['programs'] = [p for p in data['programs'] if p['tab'] and (p['description'] or p['content'])]
    data['images'] = [img['src'] for img in soup.select('div.gsc-image img') if img.get('src')]

    return data

# === MAIN ===
def main():
    os.makedirs(DETAILS_DIR, exist_ok=True)

    res = requests.get(BASE_URL)
    soup = BeautifulSoup(res.content, 'html.parser')

    result = []
    program_set = set()
    groups = soup.find_all('div', class_='ts-ng-und')

    for group in groups:
        group_name_tag = group.find(class_='ts-ng-und-td')
        if not group_name_tag:
            continue

        group_name = group_name_tag.get_text(strip=True)
        majors = group.find_all('a')
        major_list = []

        for major in majors:
            major_name = major.get_text(strip=True)
            major_link = major['href'].replace('../../../../dai-hoc/nganh-hoc', '').strip()
            full_url = BASE_URL + major_link

            info = crawl_major_detail(full_url)
            filename = major_link.strip('/').replace('/', '_') + '.json'
            detail_path = os.path.join('details', filename)
            full_detail_path = os.path.join(DETAILS_DIR, filename)

            with open(full_detail_path, 'w', encoding='utf-8') as f:
                json.dump(info, f, ensure_ascii=False, indent=2)

            for p in info.get('programs', []):
                if p.get('tab'):
                    program_set.add(p['tab'])

            major_list.append({
                'name': major_name,
                'link': major_link,
                'detail': detail_path
            })

        result.append({
            'group_name': group_name,
            'majors': major_list
        })

    with open(os.path.join(OUTPUT_DIR, 'tdtu_majors.json'), 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    with open(os.path.join(OUTPUT_DIR, 'programme_types.json'), 'w', encoding='utf-8') as f:
        json.dump(sorted(list(program_set)), f, ensure_ascii=False, indent=2)

    print("Hoàn tất! Đã lưu vào thư mục 'output'")

if __name__ == '__main__':
    main()
