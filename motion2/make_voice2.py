"""
Голос v2: живая подача + плотные паузы + радиообработка.

Что делаем:
  1) Каждая реплика — отдельный дубль со своим pitch/rate (интонационный контур).
  2) Авто-подрезка тишины по краям дублей (убирает «провалы»).
  3) Стыки реплик — 70–120 мс вместо 300–1100 мс.
  4) Финальная обработка: highpass + presence/air EQ + компрессор + лимитер.
     Голос звучит как в рекламе на радио, а не как чтение с ноутбука.
"""
import asyncio, json, os, re, subprocess, shutil, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from voice_engine import synth, FFMPEG, dur, trim_silence, silence, concat

PROJECT = r"Z:\лендинги\motion2"
WORK    = r"C:\Users\user\AppData\Local\Temp\opencode\motion2"
VOICE   = "ru-RU-DmitryNeural"

# id | текст | rate | pitch | volume | gap_after(с) | настроение
SEG = [
    # --- проблема ---
    ("s01", "Человек находит тебя в 2ГИС, видит карточку.", "+14%", "+0Hz",  "+4%", 0.16, "neutral"),
    ("s03", "А дальше ему некуда идти.",              "+0%",  "-7Hz", "-2%", 0.14, "тяжело, вниз"),
    ("s04", "В карточке — адрес и телефон.",          "+12%", "-2Hz",  "+0%", 0.12, "буднично"),
    ("s05", "Но он не видит, какие услуги ты оказываешь, сколько они стоят и есть ли свободное окно.",
                                                  "+16%", "+1Hz",  "+2%", 0.16, "перечисление"),
    ("s06", "Звонить он не хочет.",                   "+18%", "+4Hz",  "+2%", 0.10, "нетерпеливо"),
    ("s07", "Он хочет просто посмотреть.",           "+16%", "+2Hz",  "+0%", 0.16, "спокойно"),
    ("s08", "И в итоге уходит к конкуренту, у которого в карточке есть ссылка на сайт.",
                                                  "+12%", "+0Hz",  "+0%", 0.20, "neutral"),
    # --- поворот ---
    ("s09", "А теперь смотри, что меняется.",        "+8%",  "+9Hz",  "+6%", 0.16, "смена, бодрее"),
    # --- решение ---
    ("s10", "Ты прикрепляешь к своей карточке в 2ГИС нормальный сайт.",
                                                  "+6%",  "+7Hz",  "+5%", 0.18, "уверенно"),
    ("s11", "Человек заходит и сразу видит услуги, цены, фотографии работ.",
                                                  "+12%", "+3Hz",  "+3%", 0.12, "уверенно, тепло"),
    ("s12", "Понимает, что ты серьёзная компания, которой можно доверять.",
                                                  "+8%",  "+2Hz",  "+2%", 0.20, "уверенно, тепло"),
    ("s13", "И звонит уже практически готовым клиентом.",
                                                  "+8%",  "+5Hz",  "+3%", 0.20, "уверенно"),
    # --- цифра ---
    ("s14", "По данным самого 2ГИС, одна только ссылка на сайт в карточке повышает конверсию в звонок или запись почти на двадцать три процента.",
                                                  "+16%", "+6Hz",  "+4%", 0.22, "весомо"),
    # --- оффер ---
    ("s15", "Я делаю такие сайты.",                  "+2%",  "+6Hz",  "+6%", 0.12, "уверенно"),
    ("s16", "Стоимость — восемь тысяч рублей, половина оплачивается вперёд.",
                                                  "+4%",  "+4Hz",  "+4%", 0.20, "уверенно"),
    ("s17", "Всё просто и красиво: услуги, цены, фотографии работ.",
                                                  "+10%", "+2Hz",  "+2%", 0.14, "спокойно, тепло"),
    ("s18", "Чтобы твоя карточка в 2ГИС наконец-то работала как надо.",
                                                  "+6%",  "+1Hz",  "+2%", 0.20, "спокойно"),
    # --- CTA ---
    ("s19", "Хочешь посмотреть примеры?",            "+6%",  "+10Hz", "+4%", 0.10, "дружелюбно"),
    ("s20", "Напиши слово «сайт» — и я скину тебе портфолио.",
                                                  "+4%",  "+11Hz", "+5%", 0.16, "дружелюбно, улыбка"),
    ("s21", "У меня уже много довольных клиентов!",  "+12%", "+13Hz", "+7%", 0.05, "восторг"),
]


def process(src, dst):
    """Радиообработка: чистка низа, presence + air, компрессия, лимитер."""
    subprocess.run([
        FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-i", src,
        "-af",
        "highpass=f=85,"
        "equalizer=f=240:t=q:w=1.1:g=-2.5,"
        "equalizer=f=3000:t=q:w=1.6:g=3.5,"
        "equalizer=f=11000:t=q:w=1.2:g=2.0,"
        "acompressor=threshold=-19dB:ratio=3.2:attack=8:release=160:makeup=2.2,"
        "alimiter=limit=0.94:level=disabled",
        "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", dst,
    ], check=True)


async def main():
    raw_dir = os.path.join(WORK, "v2")
    os.makedirs(raw_dir, exist_ok=True)
    parts, manifest, t = [], [], 0.0

    for sid, text, rate, pitch, vol, gap, mood in SEG:
        raw = os.path.join(raw_dir, sid + "_raw.mp3")
        cut = os.path.join(raw_dir, sid + "_cut.wav")
        fin = os.path.join(raw_dir, sid + ".wav")
        if not os.path.exists(fin) or os.path.getsize(fin) < 2000:
            await synth(text, VOICE, rate, pitch, vol, None, raw)
            trim_silence(raw, cut)
            process(cut, fin)
        d = dur(fin)
        parts.append(fin)
        manifest.append({"id": sid, "text": text, "start": round(t, 3), "dur": round(d, 3),
                         "gap": gap, "mood": mood})
        t += d + gap
        print(f"  {sid}  {t:6.2f}s  аудио {d:5.2f}s  gap {gap:.2f}  {mood}")

    # склейка через тишины нужной длины
    seq, sil_dir = [], os.path.join(raw_dir, "sil")
    os.makedirs(sil_dir, exist_ok=True)
    for i, m in enumerate(manifest):
        seq.append(m["_file"] if "_file" in m else os.path.join(raw_dir, m["id"] + ".wav"))
        if i < len(manifest) - 1 and m["gap"] > 0.001:
            sp = os.path.join(sil_dir, f"g{i}.wav")
            if not os.path.exists(sp):
                silence(sp, m["gap"])
            seq.append(sp)

    voice = os.path.join(WORK, "voice_v2.wav")
    concat(seq, voice)
    shutil.copy2(voice, os.path.join(PROJECT, "voice_v2.wav"))

    with open(os.path.join(PROJECT, "src", "timeline_v2.json"), "w", encoding="utf-8") as f:
        json.dump({"fps": 60, "total": round(t, 3), "segments": manifest}, f, ensure_ascii=False, indent=2)

    print(f"\nГОЛОС: {t:.2f}s  файл {voice}")


asyncio.run(main())