import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

def generate_newspaper_fixtures():
    fixtures_dir = Path(__file__).resolve().parent
    fixtures_dir.mkdir(parents=True, exist_ok=True)

    # 1. English clip: 1000 x 1400, cream newspaper background
    img_en = Image.new("RGB", (1000, 1400), color=(248, 246, 240))
    draw_en = ImageDraw.Draw(img_en)

    # Load system or default font
    try:
        font_masthead = ImageFont.truetype("arial.ttf", 48)
        font_date = ImageFont.truetype("arial.ttf", 22)
        font_headline = ImageFont.truetype("arialbd.ttf", 36)
        font_body = ImageFont.truetype("arial.ttf", 20)
    except Exception:
        font_masthead = font_date = font_headline = font_body = ImageFont.load_default()

    # Draw Newspaper Masthead
    draw_en.line([(50, 110), (950, 110)], fill=(40, 40, 40), width=3)
    draw_en.text((50, 50), "THE NATIONAL CHRONICLE", fill=(20, 20, 20), font=font_masthead)
    draw_en.text((50, 120), "New Delhi | 15 March 2026 | Vol. XLII No. 78 | Rs 5.00", fill=(70, 70, 70), font=font_date)
    draw_en.line([(50, 155), (950, 155)], fill=(40, 40, 40), width=1)

    # Main Headline
    draw_en.text((50, 180), "India Achieves 500 GW Renewable Energy Target Ahead of Schedule", fill=(10, 10, 10), font=font_headline)
    draw_en.line([(50, 235), (950, 235)], fill=(180, 180, 180), width=1)

    # Columns / Paragraphs
    body_en = (
        "NEW DELHI: India has officially reached its landmark milestone of 500 gigawatts (GW) of installed\n"
        "non-fossil fuel electricity capacity, achieving the ambitious target well ahead of the 2030 deadline.\n\n"
        "The Ministry of New and Renewable Energy announced on Sunday that accelerated solar park expansion\n"
        "across Rajasthan and Gujarat, combined with massive offshore wind installations along the Tamil Nadu\n"
        "coastline, drove the unprecedented surge in clean energy generation.\n\n"
        "According to official figures released by the Central Electricity Authority, solar power accounts for\n"
        "nearly 280 GW of the total clean energy mix, while wind energy contributes 120 GW. Nuclear and large\n"
        "hydroelectric projects constitute the remaining portion of the clean power generation matrix.\n\n"
        "Industry stakeholders and environmental think tanks lauded the development as a monumental leap for\n"
        "global climate commitments. Speaking at a press conference in the capital, the Renewable Energy Minister\n"
        "emphasized that grid stability and energy storage systems will be prioritized in the next phase of national\n"
        "infrastructure expansion.\n\n"
        "Global leaders and international energy agencies have congratulated India on the historic transition,\n"
        "noting that the nation's rapid transition serves as a viable blueprint for developing economies worldwide.\n"
        "Special investments in battery energy storage systems (BESS) and green hydrogen hubs are already underway\n"
        "to ensure round-the-clock clean electricity for industrial corridors and urban centers.\n"
    )

    draw_en.text((50, 260), body_en, fill=(30, 30, 30), font=font_body, spacing=10)

    en_path = fixtures_dir / "sample_english_clip.jpg"
    img_en.save(en_path, "JPEG", quality=92)
    print(f"Generated {en_path} ({img_en.size})")

    # 2. Hindi clip: 1000 x 1400
    img_hi = Image.new("RGB", (1000, 1400), color=(248, 246, 240))
    draw_hi = ImageDraw.Draw(img_hi)

    try:
        font_masthead_hi = ImageFont.truetype("mangal.ttf", 46)
        font_date_hi = ImageFont.truetype("mangal.ttf", 20)
        font_headline_hi = ImageFont.truetype("mangal.ttf", 34)
        font_body_hi = ImageFont.truetype("mangal.ttf", 20)
    except Exception:
        try:
            font_masthead_hi = ImageFont.truetype("arial.ttf", 40)
            font_date_hi = ImageFont.truetype("arial.ttf", 20)
            font_headline_hi = ImageFont.truetype("arial.ttf", 30)
            font_body_hi = ImageFont.truetype("arial.ttf", 18)
        except Exception:
            font_masthead_hi = font_date_hi = font_headline_hi = font_body_hi = ImageFont.load_default()

    draw_hi.line([(50, 110), (950, 110)], fill=(40, 40, 40), width=3)
    draw_hi.text((50, 50), "दैनिक नवभारत", fill=(20, 20, 20), font=font_masthead_hi)
    draw_hi.text((50, 120), "नई दिल्ली | 15 मार्च 2026 | वर्ष 54 अंक 112 | मूल्य ₹5.00", fill=(70, 70, 70), font=font_date_hi)
    draw_hi.line([(50, 155), (950, 155)], fill=(40, 40, 40), width=1)

    draw_hi.text((50, 180), "भारत ने तय समय से पहले 500 गीगावाट स्वच्छ ऊर्जा का लक्ष्य किया हासिल", fill=(10, 10, 10), font=font_headline_hi)
    draw_hi.line([(50, 240), (950, 240)], fill=(180, 180, 180), width=1)

    body_hi = (
        "नई दिल्ली: भारत ने निर्धारित समय से काफी पहले 500 गीगावाट गैर-जीवाश्म ईंधन आधारित\n"
        "बिजली क्षमता हासिल कर एक ऐतिहासिक उपलब्धि अपने नाम कर ली है।\n\n"
        "नवीन एवं नवीकरणीय ऊर्जा मंत्रालय द्वारा रविवार को जारी आधिकारिक बयान के अनुसार,\n"
        "राजस्थान और गुजरात में सौर पार्कों के तीव्र विस्तार और तमिलनाडु तट पर पवन ऊर्जा\n"
        "परियोजनाओं की सफलता से यह संभव हुआ है।\n\n"
        "केंद्रीय विद्युत प्राधिकरण के आंकड़ों के अनुसार, कुल क्षमता में सौर ऊर्जा की हिस्सेदारी\n"
        "लगभग 280 गीगावाट और पवन ऊर्जा की 120 गीगावाट है। शेष भाग में जलविद्युत और परमाणु ऊर्जा शामिल हैं।\n\n"
        "ऊर्जा मंत्री ने नई दिल्ली में आयोजित संवाददाता सम्मेलन में कहा कि देश अब चौबीसों घंटे\n"
        "स्वच्छ ऊर्जा आपूर्ति के लिए बैटरी स्टोरेज और ग्रीन हाइड्रोजन बुनियादी ढांचे पर ध्यान केंद्रित करेगा।\n"
    )

    draw_hi.text((50, 270), body_hi, fill=(30, 30, 30), font=font_body_hi, spacing=10)

    hi_path = fixtures_dir / "sample_hindi_clip.jpg"
    img_hi.save(hi_path, "JPEG", quality=92)
    print(f"Generated {hi_path} ({img_hi.size})")

if __name__ == "__main__":
    generate_newspaper_fixtures()
