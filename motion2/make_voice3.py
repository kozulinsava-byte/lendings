"""
Голос v3: произношение + интонация + мягкость.

Что изменилось против v2:
  1. Каждый сегент разбит на ФРАЗЫ, у каждой свои темп/высота/громкость —
     так получается настоящий интонационный контур, а не ровное бубнение.
  2. Орфография для произношения: «2ГИС» → «два ГИС», числа прописью.
     (SSML phoneme/break сервер Edge отклоняет — только чистый текст.)
  3. Стыки фраз — 45–80 мс, почти без пауз.
  4. Радиообработка: highpass + presence + срез верха + компрессор +
     limiter + loudnorm (нормализация громкости по EBU R128).
"""
import asyncio, json, os, re, subprocess, shutil, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from voice_engine import synth, FFMPEG, dur, trim_silence, silence, concat

PROJECT = r"Z:\лендинги\motion2"
WORK    = r"C:\Users\user\AppData\Local\Temp\opencode\motion2"
VOICE   = "ru-RU-DmitryNeural"

# ─────────────────────────────────────────────────────────────
# СЕГМЕНТЫ
# caption — текст на экране
# speech  — как произносить ( орфография для TTS )
# phrases — [(текст фразы, rate, pitch, volume)]
# ─────────────────────────────────────────────────────────────
SEG = [
    dict(id="s01", cap="Человек находит тебя в 2ГИС, видит карточку.", mood="neutral",
         phrases=[("Человек находит тебя в два ГИС,", "+12%", "+0Hz", "+2%"),
                  ("видит карточку.", "+10%", "+0Hz", "+1%")]),

    dict(id="s03", cap="А дальше ему некуда идти.", mood="тяжело",
         phrases=[("А дальше ему некуда идти.", "+0%", "-6Hz", "-3%")]),

    dict(id="s04", cap="В карточке — адрес и телефон.", mood="буднично",
         phrases=[("В карточке — адрес и телефон.", "+10%", "-2Hz", "+0%")]),

    dict(id="s05", cap="Но он не видит, какие услуги ты оказываешь, сколько они стоят и есть ли свободное окно.", mood="перечисление",
         phrases=[("Но он не видит,", "+16%", "+0Hz", "+2%"),
                  ("какие услуги ты оказываешь,", "+16%", "+1Hz", "+1%"),
                  ("сколько они стоят", "+16%", "+1Hz", "+1%"),
                  ("и есть ли свободное окно.", "+14%", "+0Hz", "+0%")]),

    dict(id="s06", cap="Звонить он не хочет.", mood="нетерпеливо",
         phrases=[("Звонить он не хочет.", "+16%", "+3Hz", "+1%")]),

    dict(id="s07", cap="Он хочет просто посмотреть.", mood="спокойно",
         phrases=[("Он хочет просто посмотреть.", "+12%", "+1Hz", "+0%")]),

    dict(id="s08", cap="И в итоге уходит к конкуренту, у которого в карточке есть ссылка на сайт.", mood="neutral",
         phrases=[("И в итоге уходит к конкуренту,", "+12%", "+0Hz", "+0%"),
                  ("у которого в карточке есть ссылка на сайт.", "+12%", "+0Hz", "+0%")]),

    dict(id="s09", cap="А теперь смотри, что меняется.", mood="смена",
         phrases=[("А теперь смотри,", "+6%", "+7Hz", "+5%"),
                  ("что меняется.", "+6%", "+8Hz", "+6%")]),

    dict(id="s10", cap="Ты прикрепляешь к своей карточке в 2ГИС нормальный сайт.", mood="уверенно",
         phrases=[("Ты прикрепляешь к своей карточке в два ГИС", "+6%", "+5Hz", "+4%"),
                  ("нормальный сайт.", "+6%", "+6Hz", "+5%")]),

    dict(id="s11", cap="Человек заходит и сразу видит услуги, цены, фотографии работ.", mood="уверенно",
         phrases=[("Человек заходит и сразу видит", "+10%", "+3Hz", "+2%"),
                  ("услуги, цены, фотографии работ.", "+10%", "+4Hz", "+3%")]),

    dict(id="s12", cap="Понимает, что ты серьёзная компания, которой можно доверять.", mood="уверенно",
         phrases=[("Понимает, что ты серьёзная компания,", "+8%", "+2Hz", "+1%"),
                  ("которой можно доверять.", "+8%", "+3Hz", "+2%")]),

    dict(id="s13", cap="И звонит уже практически готовым клиентом.", mood="уверенно",
         phrases=[("И звонит уже практически готовым клиентом.", "+8%", "+4Hz", "+2%")]),

    dict(id="s14", cap="По данным самого 2ГИС, одна только ссылка на сайт в карточке повышает конверсию в звонок или запись почти на двадцать три процента.", mood="весомо",
         phrases=[("По данным самого два ГИС,", "+16%", "+4Hz", "+3%"),
                  ("одна только ссылка на сайт в карточке", "+16%", "+5Hz", "+3%"),
                  ("повышает конверсию в звонок или запись", "+16%", "+6Hz", "+4%"),
                  ("почти на двадцать три процента.", "+16%", "+7Hz", "+5%")]),

    dict(id="s15", cap="Я делаю такие сайты.", mood="уверенно",
         phrases=[("Я делаю такие сайты.", "+2%", "+4Hz", "+4%")]),

    dict(id="s16", cap="Стоимость — восемь тысяч рублей, половина оплачивается вперёд.", mood="уверенно",
         phrases=[("Стоимость — восемь тысяч рублей,", "+2%", "+3Hz", "+4%"),
                  ("половина оплачивается вперёд.", "+2%", "+3Hz", "+3%")]),

    dict(id="s17", cap="Всё просто и красиво: услуги, цены, фотографии работ.", mood="спокойно",
         phrases=[("Всё просто и красиво:", "+8%", "+2Hz", "+1%"),
                  ("услуги, цены, фотографии работ.", "+8%", "+3Hz", "+2%")]),

    dict(id="s18", cap="Чтобы твоя карточка в 2ГИС наконец-то работала как надо.", mood="спокойно",
         phrases=[("Чтобы твоя карточка в два ГИС", "+6%", "+1Hz", "+1%"),
                  ("наконец-то работала как надо.", "+6%", "+2Hz", "+2%")]),

    dict(id="s19", cap="Хочешь посмотреть примеры?", mood="дружелюбно",
         phrases=[("Хочешь посмотреть примеры?", "+4%", "+7Hz", "+3%")]),

    dict(id="s20", cap="Напиши слово «сайт» — и я скину тебе портфолио.", mood="дружелюбно",
         phrases=[("Напиши слово «сайт»", "+2%", "+9Hz", "+4%"),
                  ("— и я скину тебе портфолио.", "+2%", "+8Hz", "+4%")]),

    dict(id="s21", cap="У меня уже много довольных клиентов!", mood="восторг",
         phrases=[("У меня уже много довольных клиентов!", "+8%", "+9Hz", "+6%")]),
]


def broadcast(src, dst):
    """Финальная обработка: ровный уровень без резкостей."""
    subprocess.run([
        FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-i", src,
        "-af",
        "highpass=f=80,"
        "equalizer=f=200:t=q:w=1.0:g=-2,"
        "equalizer=f=3200:t=q:w=1.3:g=2.2,"
        "equalizer=f=9000:t=h:g=-3.5,"
        "equalizer=f=12000:t=h:g=1.5,"
        "acompressor=threshold=-16dB:ratio=2.4:attack=6:release=170:makeup=1.4,"
        "alimiter=limit=0.85:level=disabled",
        "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", dst,
    ], check=True)


def normalize_loudness(path):
    """Два прохода loudnorm (EBU R128) — одинаковая громкость во всех сегментах."""
    p = subprocess.run([FFMPEG, "-hide_banner", "-i", path, "-af", "loudnorm=print_format=json",
                        "-f", "null", "NUL"], capture_output=True, text=True, errors="ignore")
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", p.stderr, re.S)
    if not m:
        return
    try:
        j = json.loads(m.group(0))
    except Exception:
        return
    filt = (f"loudnorm=I=-16:TP=-1.5:LRA=9:measured_I={j['input_i']}:"
            f"measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
            f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    tmp = path + ".n.wav"
    subprocess.run([FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-i", path,
                    "-af", filt, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", tmp], check=True)
    os.replace(tmp, path)


async def main():
    raw_dir = os.path.join(WORK, "v3")
    os.makedirs(raw_dir, exist_ok=True)
    parts, manifest, t = [], [], 0.0

    for seg in SEG:
        seg_parts = []
        for i, (text, rate, pitch, vol) in enumerate(seg["phrases"]):
            raw = os.path.join(raw_dir, f"{seg['id']}_{i}_raw.mp3")
            cut = os.path.join(raw_dir, f"{seg['id']}_{i}_cut.wav")
            fin = os.path.join(raw_dir, f"{seg['id']}_{i}.wav")
            if not os.path.exists(fin) or os.path.getsize(fin) < 2000:
                await synth(text, VOICE, rate, pitch, vol, None, raw)
                trim_silence(raw, cut)
                broadcast(cut, fin)
                normalize_loudness(fin)
            seg_parts.append(fin)

        # склейка фраз внутри сегмента: зазор 60 мс
        seq = []
        for j, f in enumerate(seg_parts):
            seq.append(f)
            if j < len(seg_parts) - 1:
                sp = os.path.join(raw_dir, f"{seg['id']}_{j}_gap.wav")
                if not os.path.exists(sp):
                    silence(sp, 0.06)
                seq.append(sp)
        joined = os.path.join(raw_dir, f"{seg['id']}_joined.wav")
        if not os.path.exists(joined):
            concat(seq, joined)

        d = dur(joined)
        parts.append(joined)
        manifest.append({"id": seg["id"], "text": seg["cap"], "start": round(t, 3),
                         "dur": round(d, 3), "gap": 0.1, "mood": seg["mood"]})
        t += d + 0.1
        print(f"  {seg['id']}  {t:6.2f}s  аудио {d:5.2f}s  {seg['mood']}")

    voice = os.path.join(WORK, "voice_v3.wav")
    concat(parts, voice)
    shutil.copy2(voice, os.path.join(PROJECT, "voice_v3.wav"))

    with open(os.path.join(PROJECT, "src", "timeline_v3.json"), "w", encoding="utf-8") as f:
        json.dump({"fps": 60, "total": round(t, 3), "segments": manifest}, f, ensure_ascii=False, indent=2)

    print(f"\nГОЛОС v3: {t:.2f}s")


asyncio.run(main())
