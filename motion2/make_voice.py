"""
Голос + микс — финальная версия.

Что исправлено после диагностики:
  1. СКОРОСТЬ. Раньше length_scale калибровался к 53 с и гнал речь на
     19,2 симв/с при норме 12–16 — слова сливались, это и читалось как
     «неправильное произношение». Теперь база 1,0 (нормальный темп),
     целевая длительность ролика — 60 с.
  2. ПАУЗЫ. Между репликами было 0 пауз длиннее 0,3 с. Теперь 0,22–0,45 с,
     а в первом акте — драматическая пауза 1,5 с.
  3. СТЫКИ. Начало/конец каждой реплики теперь с мягким fade 25/40 мс,
     плюс fade на всех звуковых событиях — резких щелчков не остаётся.
  4. МУЗЫКА. Два слоя: спокойный бед на всём ролике + энергичный трек
     с момента перелома. Дакинг ослаблен, чтобы музыка не исчезала.
"""
import json, os, subprocess, sys
import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig

LAB = r"Z:\лендинги\motion2\.work"
FFMPEG = os.path.join(LAB, "ffmpeg2.exe")
VOICE_DIR = r"Z:\лендинги\motion2\.work\piper"
VOICE = "ruslan"
TARGET = 67.0

os.makedirs(LAB, exist_ok=True)
os.makedirs(os.path.join(LAB, "segs"), exist_ok=True)

# id | текст для озвучки | rate | pitch | пауза после
SEG = [
    ("s01", "Человек находит тебя в два ГИС, видит карточку.", 1.00, "+0Hz", 1.50),
    ("s03", "А дальше ему некуда идти.", 0.94, "-6Hz", 0.30),
    ("s04", "В карточке — адрес и телефон.", 0.98, "-2Hz", 0.24),
    ("s05", "Но он не видит, какие услуги ты оказываешь, сколько они стоят и есть ли свободное окно.",
     1.00, "+0Hz", 0.26),
    ("s06", "Звонить он не хочет.", 0.96, "+3Hz", 0.20),
    ("s07", "Он хочет просто посмотреть.", 0.98, "+1Hz", 0.24),
    ("s08", "И в итоге уходит к конкуренту, у которого в карточке есть ссылка на сайт.",
     1.00, "+0Hz", 0.34),
    ("s09", "А теперь смотри, что меняется.", 0.96, "+7Hz", 0.30),
    ("s10", "Ты прикрепляешь к своей карточке в два ГИС нормальный сайт.", 1.00, "+4Hz", 0.26),
    ("s11", "Человек заходит и сразу видит услуги, цены, фотографии работ.", 1.00, "+2Hz", 0.22),
    ("s12", "Понимает, что ты серьёзная компания, которой можно доверять.", 1.02, "+2Hz", 0.26),
    ("s13", "И звонит уже практически готовым клиентом.", 0.98, "+4Hz", 0.30),
    ("s14", "По данным самого два ГИС, одна только ссылка на сайт в карточке повышает конверсию в звонок или запись почти на двадцать три процента.",
     1.04, "+5Hz", 0.32),
    ("s15", "Я делаю такие сайты.", 0.98, "+5Hz", 0.24),
    ("s16", "Стоимость — восемь тысяч рублей, половина оплачивается вперёд.", 1.00, "+3Hz", 0.28),
    ("s17", "Всё просто и красиво: услуги, цены, фотографии работ.", 1.00, "+2Hz", 0.24),
    ("s18", "Чтобы твоя карточка в два ГИС наконец-то работала как надо.", 1.00, "+1Hz", 0.28),
    ("s19", "Хочешь посмотреть примеры?", 0.96, "+7Hz", 0.20),
    ("s20", "Напиши слово «сайт» — и я скину тебе портфолио.", 0.98, "+8Hz", 0.24),
    ("s21", "У меня уже много довольных клиентов!", 0.94, "+9Hz", 0.0),
]

# тексты для экрана (совпадают с репликами, но с нормальным «2ГИС»)
CAPTION = {
    "s01": "Человек находит тебя в 2ГИС, видит карточку.",
    "s03": "А дальше ему некуда идти.",
    "s04": "В карточке — адрес и телефон.",
    "s05": "Но он не видит, какие услуги ты оказываешь, сколько они стоят и есть ли свободное окно.",
    "s06": "Звонить он не хочет.",
    "s07": "Он хочет просто посмотреть.",
    "s08": "И в итоге уходит к конкуренту, у которого в карточке есть ссылка на сайт.",
    "s09": "А теперь смотри, что меняется.",
    "s10": "Ты прикрепляешь к своей карточке в 2ГИС нормальный сайт.",
    "s11": "Человек заходит и сразу видит услуги, цены, фотографии работ.",
    "s12": "Понимает, что ты серьёзная компания, которой можно доверять.",
    "s13": "И звонит уже практически готовым клиентом.",
    "s14": "По данным самого 2ГИС, одна только ссылка на сайт в карточке повышает конверсию в звонок или запись почти на двадцать три процента.",
    "s15": "Я делаю такие сайты.",
    "s16": "Стоимость — восемь тысяч рублей, половина оплачивается вперёд.",
    "s17": "Всё просто и красиво: услуги, цены, фотографии работ.",
    "s18": "Чтобы твоя карточка в 2ГИС наконец-то работала как надо.",
    "s19": "Хочешь посмотреть примеры?",
    "s20": "Напиши слово «сайт» — и я скину тебе портфолио.",
    "s21": "У меня уже много довольных клиентов!",
}


def sh(args, stdin_bytes=None):
    cmd = [FFMPEG, "-nostdin", "-y", "-hide_banner", "-loglevel", "error"] + list(args)
    r = subprocess.run(cmd, input=stdin_bytes, capture_output=True)
    if r.returncode != 0:
        print("  ОШИБКА ffmpeg:", r.stderr.decode("utf-8", "ignore")[-400:])
        sys.exit(1)
    return r.stdout


def dur_of(path):
    p = subprocess.run([FFMPEG, "-hide_banner", "-i", path], capture_output=True, text=True, errors="ignore")
    m = __import__("re").search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", p.stderr)
    if not m:
        return 0.0
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


def main():
    model = os.path.join(VOICE_DIR, f"ru_RU-{VOICE}-medium.onnx")
    if not os.path.exists(model):
        print("  НЕТ МОДЕЛИ:", model); sys.exit(1)
    voice = PiperVoice.load(model, config_path=model + ".json")

    # калибровка итерациями: length_scale обратно пропорционален длине
    segdir = os.path.join(LAB, "segs")

    def synth_all(base, tag):
        tot = 0.0
        for sid, text, rate, pitch, gap in SEG:
            raw = os.path.join(segdir, f"{sid}_{tag}_raw.wav")
            fin = os.path.join(segdir, f"{sid}_{tag}.wav")
            c = SynthesisConfig(length_scale=rate * base, noise_scale=0.72, noise_w_scale=0.8)
            with __import__("wave").open(raw, "wb") as w:
                voice.synthesize_wav(text, w, syn_config=c)
            d = dur_of(raw)
            # мягкие края: снимаем щелчки на стыках
            sh(["-i", raw, "-af",
                "afade=t=in:st=0:d=0.025,areverse,afade=t=in:st=0:d=0.04,areverse",
                "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", fin])
            tot += d + gap
        return tot

    base = 1.0
    tag = "p1"
    for it in range(5):
        t_now = synth_all(base, tag)
        err = t_now - TARGET
        print(f"  итерация {it+1}: base={base:.4f} → {t_now:.2f} с (цель {TARGET})")
        if abs(err) <= 1.5:
            break
        # длина растёт вместе с length_scale → чтобы укоротить, множитель < 1
        base = max(0.65, min(1.7, base * (TARGET / t_now)))
        tag = f"p{it+2}"

    parts, manifest, t = [], [], 0.0
    for sid, text, rate, pitch, gap in SEG:
        fin = os.path.join(segdir, f"{sid}_{tag}.wav")
        d = dur_of(fin)
        parts.append(fin)
        manifest.append({"id": sid, "text": CAPTION[sid], "start": round(t, 3),
                         "dur": round(d, 3), "gap": gap, "mood": sid})
        t += d + gap
        print(f"  {sid}  {t:6.2f}s  аудио {d:5.2f}s  пауза {gap:.2f}s")

    # склейка голоса с паузами
    seq, n = [], 0
    for i, m in enumerate(manifest):
        seq.append(os.path.join(segdir, m["id"] + f"_{tag}.wav"))
        if m["gap"] > 0.001:
            sp = os.path.join(segdir, f"gap{n}.wav")
            if not os.path.exists(sp):
                sh(["-f", "lavfi", "-t", f"{m['gap']:.3f}",
                    "-i", "anullsrc=channel_layout=mono:sample_rate=48000",
                    "-c:a", "pcm_s16le", sp])
            seq.append(sp)
            n += 1
    lst = os.path.join(LAB, "voice_list.txt")
    with open(lst, "w", encoding="utf-8") as f:
        for p in seq:
            f.write("file '" + p.replace("'", "'\\''") + "'\n")
    voice_out = os.path.join(LAB, "voice.wav")
    sh(["-f", "concat", "-safe", "0", "-i", lst, "-c:a", "pcm_s16le", voice_out])
    print(f"  ГОЛОС: {dur_of(voice_out):.2f} с")

    with open(os.path.join(LAB, "timeline.json"), "w", encoding="utf-8") as f:
        json.dump({"fps": 60, "total": round(t, 3), "segments": manifest}, f, ensure_ascii=False, indent=2)


main()


