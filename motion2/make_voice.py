"""
Озвучка ролика. Edge Neural TTS, каждый фрагмент — отдельный дубль со своей интонацией.
Таймлайн считается по ФАКТИЧЕСКОЙ длине звука; видео потом подгоняется под него.
Готовим две версии: короткую (30–40 с) и полную (весь текст).
"""
import asyncio, json, os, re, subprocess, shutil
import edge_tts

PROJECT = r"Z:\лендинги\motion2"
WORK    = r"C:\Users\user\AppData\Local\Temp\opencode\motion2"
FFMPEG  = r"C:\Users\user\AppData\Local\Temp\opencode\ffmpeg2.exe"
VOICE   = "ru-RU-DmitryNeural"

# id, текст, rate, pitch, пауза, настроение
SHORT = [
    ("s01", "Человек находит тебя в 2ГИС, видит карточку.", "+14%", "+0Hz", 1.1, "neutral"),
    ("s03", "А дальше ему некуда идти.", "+10%", "-6Hz", 0.3, "медленно, тяжело"),
    ("s04", "Ни услуг, ни цен, ни свободного окна.", "+14%", "-1Hz", 0.3, "буднично"),
    ("s05", "Звонить он не хочет — он хочет просто посмотреть.", "+16%", "+3Hz", 0.3, "нетерпеливо"),
    ("s06", "И уходит к конкуренту, где в карточке есть ссылка на сайт.", "+12%", "+0Hz", 0.35, "neutral"),
    ("s07", "Ты прикрепляешь к своей карточке нормальный сайт.", "+12%", "+5Hz", 0.35, "уверенно"),
    ("s08", "Сразу видно услуги, цены, фотографии работ.", "+14%", "+2Hz", 0.3, "уверенно, тепло"),
    ("s09", "Ссылка на сайт поднимает конверсию в звонок почти на двадцать три процента.", "+16%", "+6Hz", 0.4, "уверенно, весомо"),
    ("s10", "Такие сайты делаю я. Восемь тысяч рублей, половина вперёд.", "+12%", "+5Hz", 0.35, "уверенно"),
    ("s11", "Напиши слово «сайт» — и я скину портфолио.", "+10%", "+9Hz", 0.35, "дружелюбно, улыбка"),
    ("s12", "У меня уже много довольных клиентов!", "+14%", "+11Hz", 0.05, "восторг"),
]

FULL = [
    ("s01", "Человек находит тебя в 2ГИС, видит карточку.", "+8%", "+0Hz", 1.3, "neutral"),
    ("s03", "А дальше ему некуда идти.", "+0%", "-7Hz", 0.4, "медленно, тяжело"),
    ("s04", "В карточке — адрес и телефон. Но он не видит, какие услуги ты оказываешь, сколько они стоят и есть ли свободное окно.",
           "+6%", "-2Hz", 0.4, "буднично"),
    ("s05", "Звонить он не хочет. Он хочет просто посмотреть.", "+8%", "+3Hz", 0.4, "нетерпеливо"),
    ("s06", "И в итоге уходит к конкуренту, у которого в карточке есть ссылка на сайт.", "+2%", "+0Hz", 0.5, "neutral"),
    ("s07", "А теперь смотри, что меняется.", "+6%", "+7Hz", 0.35, "смена, бодрее"),
    ("s08", "Ты прикрепляешь к своей карточке в 2ГИС нормальный сайт.", "+0%", "+5Hz", 0.45, "уверенно"),
    ("s09", "Человек заходит и сразу видит услуги, цены, фотографии работ. Понимает, что ты серьёзная компания, которой можно доверять.",
           "+6%", "+2Hz", 0.3, "уверенно, тепло"),
    ("s10", "И звонит уже практически готовым клиентом.", "+4%", "+4Hz", 0.5, "уверенно"),
    ("s11", "По данных самого 2ГИС, одна только ссылка на сайт в карточке повышает конверсию в звонок или запись почти на двадцать три процента.",
           "+10%", "+6Hz", 0.5, "уверенно, весомо"),
    ("s12", "Я делаю такие сайты. Стоимость — восемь тысяч рублей, половина оплачивается вперёд.",
           "+4%", "+5Hz", 0.45, "уверенно"),
    ("s13", "Всё просто и красиво: услуги, цены, фотографии работ. Чтобы твоя карточка в 2ГИС наконец-то работала как надо.",
           "+6%", "+3Hz", 0.45, "спокойно, тепло"),
    ("s14", "Хочешь посмотреть примеры? Напиши слово «сайт» — и я скину тебе портфолио.",
           "+2%", "+9Hz", 0.45, "дружелюбно, улыбка"),
    ("s15", "У меня уже много довольных клиентов!", "+6%", "+11Hz", 0.1, "восторг"),
]


def duration(path):
    p = subprocess.run([FFMPEG, "-hide_banner", "-i", path], capture_output=True, text=True, errors="ignore")
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", p.stderr)
    if not m:
        return 0.0
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


async def synth(text, rate, pitch, dest):
    comm = edge_tts.Communicate(text, VOICE, rate=rate, pitch=pitch, volume="+0%")
    await comm.save(dest)


async def build(name, segments):
    adir = os.path.join(WORK, "audio_" + name)
    os.makedirs(adir, exist_ok=True)
    manifest, t = [], 0.0
    for sid, text, rate, pitch, pause, mood in segments:
        dest = os.path.join(adir, sid + ".mp3")
        if not os.path.exists(dest) or os.path.getsize(dest) < 1000:
            await synth(text, rate, pitch, dest)
        d = duration(dest)
        manifest.append({"id": sid, "text": text, "start": round(t, 3), "dur": round(d, 3),
                         "pause": pause, "mood": mood, "rate": rate, "pitch": pitch, "file": dest})
        t += d + pause
        print(f"   {sid}  {manifest[-1]['start']:6.2f}s +{d:5.2f}s  {mood}")

    total = t
    n = len(manifest)
    inputs = ["-f", "lavfi", "-t", f"{total:.3f}", "-i", "anullsrc=channel_layout=mono:sample_rate=48000"]
    for m in manifest:
        inputs += ["-i", m["file"]]

    delays, labels = [], []
    for i, m in enumerate(manifest):
        ms = int(round(m["start"] * 1000))
        delays.append(f"[{i+1}:a]adelay={ms}|{ms},aresample=48000[s{i}]")
        labels.append(f"[s{i}]")
    mix = ";".join(delays)
    # в amix обязательно включаем тихую базу (input 0) — она задаёт общую длину дорожки
    concat = "[0]" + "".join(labels) + f"amix=inputs={n + 1}:normalize=0:duration=first[out]"

    out_path = os.path.join(WORK, f"voice_{name}.mp3")
    subprocess.run([FFMPEG, "-y", "-hide_banner", "-loglevel", "error"] + inputs +
                   ["-filter_complex", f"{mix};{concat}", "-map", "[out]",
                    "-ac", "1", "-ar", "48000", "-c:a", "libmp3lame", "-b:a", "160k", out_path], check=True)

    shutil.copy2(out_path, os.path.join(PROJECT, f"voice_{name}.mp3"))
    with open(os.path.join(PROJECT, "src", f"timeline_{name}.json"), "w", encoding="utf-8") as f:
        json.dump({"fps": 60, "total": round(total, 3), "segments": manifest}, f, ensure_ascii=False, indent=2)

    print(f"  → {name}: {total:.2f}s, {os.path.getsize(out_path)//1024} КБ\n")
    return total


async def main():
    await build("short", SHORT)
    await build("full", FULL)


asyncio.run(main())