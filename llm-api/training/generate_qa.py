# === Step 1: Generate clean training data for NER and Classifier ===
import json
import random
from pathlib import Path
from tqdm import tqdm

with open("data/tdtu_majors.json", "r", encoding="utf-8") as f:
    majors_data = json.load(f)

with open("data/programme_types.json", "r", encoding="utf-8") as f:
    programme_types = json.load(f)

question_templates = {
    "IS_INSTANCE_OF": [ # Programme -> MajorProgramme
        "{major} {programme}",
        "ngành {major} hệ {programme}",
        "ngành {major} chương trình {programme}",
        "{major} hệ {programme}",
        "{major} chương trình {programme}",
        "Ngành {major} chương trình {programme} học phí bao nhiêu",
        "{major} chương trình {programme} học phí bao nhiêu",
        "Ngành {major} hệ {programme} học phí bao nhiêu",
        "{major} hệ {programme} học phí bao nhiêu",
        "{major} chương trình {programme} mất bao lâu",
        "Hệ {programme} của {major} học như thế nào",
        "{major} chương trình {programme} học phí bao nhiêu",
        "{major} hệ {programme} mất bao lâu",
        "Chương trình {programme} của {major} học như thế nào",
    ],
    "BELONGS_TO": [ # MajorProgramme -> Major
        "Chương trình {programme} thuộc ngành {major}",
        "Ngành {major} có chương trình {programme} không",
        "Tôi muốn hỏi {programme} nằm trong ngành {major} phải không",
        "Thông tin về {major} {programme}",
        "Thông tin về ngành {major} hệ {programme}",
        "Thông tin về ngành {major} chương trình {programme}",
    ],
    "HAS_PROGRAMME": [ # Major -> Programme
        "Ngành {major} có chương trình {programme} không",
        "{major} cung cấp chương trình {programme} không",
        "Sinh viên ngành {major} học được chương trình {programme} không"
        "Vê {major}",
        "{major}",
        "Thông tin vê {major}",
        "{major} có"
    ],
    "HAS_MAJOR": [ # Group -> Major
        "Nhóm {group} có ngành {major} không",
        "Ngành {major} có thuộc nhóm {group} không",
        "Tôi muốn biết ngành {major} thuộc nhóm nào, có phải {group} không",
        "Nhóm {group} có những ngành nào",
        "Nhóm {group}",
        "Nhông tin vê nhóm {group}",
        "Nhóm {group} có bao nhiêu"
    ]
}

ner_data = []
cls_data = []
sample_count = 0

for group in majors_data:
    group_name = group["group_name"]
    for major in group["majors"]:
        major_name = major["name"]
        programme = random.choice(programme_types)

        for relation, templates in question_templates.items():
            for template in templates:
                text = template.format(major=major_name, programme=programme, group=group_name)
                text_lower = text.lower()

                entities = []
                if major_name.lower() in text_lower:
                    start = text_lower.find(major_name.lower())
                    entities.append({"start": start, "end": start + len(major_name), "label": "Major"})
                if programme.lower() in text_lower:
                    start = text_lower.find(programme.lower())
                    entities.append({"start": start, "end": start + len(programme), "label": "Programme"})
                if group_name.lower() in text_lower:
                    start = text_lower.find(group_name.lower())
                    entities.append({"start": start, "end": start + len(group_name), "label": "Group"})

                ner_data.append({"text": text, "entities": entities})
                cls_data.append({"text": text, "label": relation})
                sample_count += 1

# Save outputs
Path("generated").mkdir(exist_ok=True)
with open("generated/ner_data.json", "w", encoding="utf-8") as f:
    json.dump(ner_data, f, ensure_ascii=False, indent=2)
with open("generated/cls_data.json", "w", encoding="utf-8") as f:
    json.dump(cls_data, f, ensure_ascii=False, indent=2)
print(f"Generated {sample_count} samples.")
