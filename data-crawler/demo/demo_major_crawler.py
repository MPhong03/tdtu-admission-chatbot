import requests
from bs4 import BeautifulSoup
import json

def get_text_safe(element):
    return element.get_text(strip=True) if element else ''

def crawl_major_detail(url):
    res = requests.get(url)
    soup = BeautifulSoup(res.content, 'html.parser')

    data = {}

    # 1. Tên ngành
    data['name'] = get_text_safe(soup.find('h2', class_='title'))

    # 2. Mô tả chung
    description_block = soup.find('div', class_='block-nganh-1-content')
    if description_block:
        data['description'] = '\n'.join(
            get_text_safe(p) for p in description_block.find_all('p')
        )
    else:
        data['description'] = ''

    # 3. Lý do chọn ngành
    reasons = []
    for block in soup.select('div.gsc-column'):
        title = block.select_one('div.highlight_content > div.title')
        if title:
            reasons.append(get_text_safe(title))
    data['reasons'] = reasons

    # 4. Tab chương trình
    data['programs'] = []

    # Tên các tab
    tab_titles = soup.select('div.gsc-tabs ul.nav-tabs li a')
    for tab in tab_titles:
        tab_name = get_text_safe(tab)
        data['programs'].append({
            'tab': tab_name,
            'major_code': '',
            'description': '',
            'content': {}
        })

    tab_contents = soup.select('div.tab-content .tab-pane')
    for i, content in enumerate(tab_contents):
        if i >= len(data['programs']):
            continue  # An toàn nếu tab-content nhiều hơn tiêu đề

        program = data['programs'][i]

        # Tên ngành & mã ngành
        tt_block = content.find('div', class_='tab-chuong-trinh-tt')
        if tt_block:
            strongs = tt_block.find_all('strong')
            if len(strongs) >= 2:
                program['name'] = get_text_safe(strongs[0])
                program['major_code'] = get_text_safe(strongs[1])

        # Mô tả ngành (các thẻ p)
        description_paragraphs = content.find_all('p')
        program['description'] = '\n'.join(
            get_text_safe(p) for p in description_paragraphs if get_text_safe(p)
        )

        # Thông tin chi tiết
        ct_block = content.find('div', class_='tab-chuong-trinh')
        if ct_block:
            ct_sections = ct_block.find_all('div', class_='tab-ct')
            for section in ct_sections:
                for flex in section.find_all('div', class_='tab-ct-flex'):
                    title = get_text_safe(flex.find('div', class_='tab-ct-flex-title'))
                    if title:
                        value = ' '.join(get_text_safe(p) for p in flex.find_all('p'))
                        program['content'][title] = value

    # Lọc bỏ những tab trống hoặc không có nội dung thực sự
    data['programs'] = [
        p for p in data['programs']
        if p.get('tab') and (p.get('description') or p.get('content'))
    ]

    # 5. Ảnh (nếu có)
    data['images'] = [
        img['src'] for img in soup.select('div.gsc-image img') if img.get('src')
    ]

    return data


# --- THỰC THI ---
if __name__ == '__main__':
    url = 'https://admission.tdtu.edu.vn/dai-hoc/nganh-hoc/ky-thuat-phan-mem'
    info = crawl_major_detail(url)
    print(json.dumps(info, indent=2, ensure_ascii=False))
