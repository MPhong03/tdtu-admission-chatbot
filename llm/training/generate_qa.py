import json
import random
from pathlib import Path

# Load data
with open("data/tdtu_majors.json", "r", encoding="utf-8") as f:
    majors_data = json.load(f)

with open("data/programme_types.json", "r", encoding="utf-8") as f:
    programme_types = json.load(f)

# Question templates theo intent
question_templates = {
    "Ask_Major_Detail": [
        "{major} {programme}",
        "{major} {programme} có học phí",
        "{major} {programme} có thông tin gì",
        "{major} {programme} có gì",
        "biết gì về {major} {programme}",
        "tôi muốn hỏi về {major} {programme}",
        "{major} {programme} học mấy năm",
        "{major} {programme} học phí",
        "{programme} của {major} học như thế nào"
    ],
    "Ask_Major": [
        "{major} có gì",
        "{major} có những hệ gì",
        "{major} có những chương trình gì",
        "{major} có bao nhiêu hệ",
        "{major} có bao nhiêu chương trình đào tạo",
    ],
    "Ask_Group": [
        "Nhóm {group} có",
        "Biết gì về {group}",
        "{group} có bao nhiêu ngành",
        "về {group}",
        "Nhóm {group} gồm những ngành nào",
        "Ngành nào thuộc nhóm {group}",
        "{group} có những ngành gì"
    ],
    "Ask_Programme": [
        "Biết gì về {programme}",
        "{programme} có gì",
        "về {programme}",
    ],
    "Ask_Group_Major_Count": [
        "{group} có bao nhiêu ngành",
        "{group} đào tạo bao nhiêu ngành",
        "{group} bao nhiêu ngành",
        "{group} bao nhiêu",
    ]
}

def generate_data():
    ner_data = []
    cls_data = []
    sample_count = 0

    for group in majors_data:
        group_name = group["group_name"]
        for major in group["majors"]:
            major_name = major["name"]
            programme = random.choice(programme_types)

            for intent, templates in question_templates.items():
                for template in templates:
                    text = template.format(major=major_name, programme=programme, group=group_name)
                    text_lower = text.lower()

                    entities = []
                    if major_name.lower() in text_lower:
                        start = text_lower.find(major_name.lower())
                        entities.append({
                            "start": start,
                            "end": start + len(major_name),
                            "label": "Major"
                        })
                    if programme.lower() in text_lower:
                        start = text_lower.find(programme.lower())
                        entities.append({
                            "start": start,
                            "end": start + len(programme),
                            "label": "Programme"
                        })
                    if group_name.lower() in text_lower:
                        start = text_lower.find(group_name.lower())
                        entities.append({
                            "start": start,
                            "end": start + len(group_name),
                            "label": "Group"
                        })

                    ner_data.append({"text": text, "entities": entities})
                    cls_data.append({"text": text, "label": intent})
                    sample_count += 1

    # Save outputs
    output_dir = Path("generated_v2")
    output_dir.mkdir(exist_ok=True)
    with open(output_dir / "ner_data.json", "w", encoding="utf-8") as f:
        json.dump(ner_data, f, ensure_ascii=False, indent=2)
    with open(output_dir / "cls_data.json", "w", encoding="utf-8") as f:
        json.dump(cls_data, f, ensure_ascii=False, indent=2)

    print(f"✅ Generated {sample_count} samples to folder: {output_dir}/")

if __name__ == "__main__":
    generate_data()
