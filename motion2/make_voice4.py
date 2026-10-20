"""
Голос v4: Piper (VITS, офлайн, полностью локально).

Почему Piper, а не Edge TTS: измеренный разброс высоты тона у ruslan — 83 Гц
против 27–43 у остальных голосов и 39 у Edge. Это и есть «живая» подача.
Плюс синтез локальный: интернет и сервисы не нужны.

Параметры Piper:
  length_scale — темп (больше = медленнее)
  noise_scale  — вариативность тембра (больше = живее)
  noise_w     — «дыхание» голоса
"""
import json, os, re, subprocess, shutil, sys, wave
import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig

PROJECT = r"Z:\лендинги\motion2"
WORK    = r"Z:\лендинги\motion2\.work"
PIPER   = r"C:\Users\user\AppData\Local\Temp\opencode\piper"
FFMPEG  = r"Z:\лендинги\motion2\.work\ffmpeg2.exe"
VOICE   = os.environ.get("PIPER_VOICE", "ruslan")

TARGET = 59.0          # целевая длительность ролика, сек

# caption — на экран, speech — как произносить, cfg — параметры подачи
SEG = [
    dict(id="s01", cap="Человек находит тебя в 2ГИС, видит карточку.",
         speech="Человек находит тебя в два ГИС, видит карточку.",
         rate=1.00, noise=0.70, gap=0.09),
    dict(id="s03", cap="А дальше ему некуда идти.",
         speech="А дальше ему некуда идти.",
         rate=1.06, noise=0.62, gap=0.10),
    dict(id="s04", cap="В карточке — адрес и телефон.",
         speech="В карточке — адрес и телефон.",
         rate=0.98, noise=0.66, gap=0.09),
    dict(id="s05", cap="Но он не видит, какие услуги ты оказываешь, сколько они стоят и есть ли свободное окно.",
         speech="Но он не видит, какие услуги ты оказываешь, сколько они стоят и есть ли свободное окно.",
         rate=1.02, noise=0.70, gap=0.10),
    dict(id="s06", cap="Звонить он не хочет.",
         speech="Звонить он не хочет.",
         rate=0.94, noise=0.72, gap=0.08),
    dict(id="s07", cap="Он хочет просто посмотреть.",
         speech="Он хочет просто посмотреть.",
         rate=0.98, noise=0.68, gap=0.10),
    dict(id="s08", cap="И в итоге уходит к конкуренту, у которого в карточке есть ссылка на сайт.",
         speech="И в итоге уходит к конкуренту, у которого в карточке есть ссылка на сайт.",
         rate=1.00, noise=0.68, gap=0.12),
    dict(id="s09", cap="А теперь смотри, что меняется.",
         speech="А теперь смотри, что меняется.",
         rate=0.96, noise=0.78, gap=0.12),
    dict(id="s10", cap="Ты прикрепляешь к своей карточке в 2ГИС нормальный сайт.",
         speech="Ты прикрепляешь к своей карточке в два ГИС нормальный сайт.",
         rate=1.00, noise=0.74, gap=0.12),
    dict(id="s11", cap="Человек заходит и сразу видит услуги, цены, фотографии работ.",
         speech="Человек заходит и сразу видит услуги, цены, фотографии работ.",
         rate=0.98, noise=0.74, gap=0.10),
    dict(id="s12", cap="Понимает, что ты серьёзная компания, которой можно доверять.",
         speech="Понимает, что ты серьёзная компания, которой можно доверять.",
         rate=1.02, noise=0.70, gap=0.12),
    dict(id="s13", cap="И звонит уже практически готовым клиентом.",
         speech="И звонит уже практически готовым клиентом.",
         rate=0.98, noise=0.72, gap=0.12),
    dict(id="s14", cap="По данным самого 2ГИС, одна только ссылка на сайт в карточке повышает конверсию в звонок или запись почти на двадцать три процента.",
         speech="По данным самого два ГИС, одна только ссылка на сайт в карточке повышает конверсию в звонок или запись почти на двадцать три процента.",
         rate=1.08, noise=0.76, gap=0.16),
    dict(id="s15", cap="Я делаю такие сайты.",
         speech="Я делаю такие сайты.",
         rate=0.96, noise=0.74, gap=0.08),
    dict(id="s16", cap="Стоимость — восемь тысяч рублей, половина оплачивается вперёд.",
         speech="Стоимость — восемь тысяч рублей, половина оплачивается вперёд.",
         rate=1.00, noise=0.72, gap=0.14),
    dict(id="s17", cap="Всё просто и красиво: услуги, цены, фотографии работ.",
         speech="Всё просто и красиво: услуги, цены, фотографии работ.",
         rate=0.98, noise=0.70, gap=0.10),
    dict(id="s18", cap="Чтобы твоя карточка в 2ГИС наконец-то работала как надо.",
         speech="Чтобы твоя карточка в два ГИС наконец-то работала как надо.",
         rate=1.00, noise=0.70, gap=0.14),
    dict(id="s19", cap="Хочешь посмотреть примеры?",
         speech="Хочешь посмотреть примеры?",
         rate=0.94, noise=0.76, gap=0.08),
    dict(id="s20", cap="Напиши слово «сайт» — и я скину тебе портфолио.",
         speech="Напиши слово «сайт» — и я скину тебе портфолио.",
         rate=0.96, noise=0.80, gap=0.12),
    dict(id="s21", cap="У меня уже много довольных клиентов!",
         speech="У меня уже много довольных клиентов!",
         rate=0.92, noise=0.84, gap=0.05),
]


def wav_dur(path):
    with wave.open(path, "rb") as w:
        return w.getnframes() / w.getframerate()


def trim(path, dst):
    subprocess.run([FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-i", path,
                    "-af", "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-48dB:"
                           "detection=peak:stop_periods=-1:stop_duration=0.08:stop_threshold=-48dB",
                    "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", dst], check=True)


def silence(path, sec):
    subprocess.run([FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
                    "-f", "lavfi", "-t", f"{sec:.3f}",
                    "-i", "anullsrc=channel_layout=mono:sample_rate=48000",
                    "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "1", path], check=True)


def concat(parts, out):
    lst = out + ".txt"
    with open(lst, "w", encoding="utf-8") as f:
        for p in parts:
            f.write("file '" + p.replace("'", "'\\''") + "'\n")
    subprocess.run([FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0",
                    "-i", lst, "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "1", out], check=True)
    os.remove(lst)


def broadcast(src, dst):
    subprocess.run([FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-i", src,
                    "-af",
                    "highpass=f=85,"
                    "equalizer=f=180:t=q:w=1.0:g=-1.5,"
                    "equalizer=f=2800:t=q:w=1.4:g=2.0,"
                    "equalizer=f=8000:t=h:g=-2.0,"
                    "equalizer=f=12000:t=h:g=1.2,"
                    "acompressor=threshold=-18dB:ratio=2.2:attack=6:release=180:makeup=1.2,"
                    "volume=1.65,"
                    "alimiter=limit=0.86:level=disabled",
                    "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", dst], check=True)


def main():
    model = os.path.join(PIPER, f"ru_RU-{VOICE}-medium.onnx")
    voice = PiperVoice.load(model, config_path=model + ".json")
    raw_dir = os.path.join(WORK, "v4_" + VOICE)
    os.makedirs(raw_dir, exist_ok=True)

    # ── калибровка темпа под целевую длительность ──
    probe_txt = SEG[13]["speech"]
    probe = os.path.join(raw_dir, "probe.wav")
    cfg = SynthesisConfig(length_scale=1.0, noise_scale=0.72, noise_w_scale=0.8)
    with wave.open(probe, "wb") as w:
        voice.synthesize_wav(probe_txt, w, syn_config=cfg)
    probe_d = wav_dur(probe)
    total_chars = sum(len(s["speech"]) for s in SEG)
    est = probe_d / len(probe_txt) * total_chars
    scale = 1.0
    if est < TARGET:
        scale = min(1.35, est / TARGET)   # медленнее
    else:
        scale = max(0.78, TARGET / est)   # быстрее
    print(f"  калибровка: проба {probe_d:.2f}с на {len(probe_txt)} симв. → "
          f"оценка {est:.1f}с, length_scale = {scale:.3f}")

    parts, manifest, t = [], [], 0.0
    for s in SEG:
        raw = os.path.join(raw_dir, f"{s['id']}_raw.wav")
        cut = os.path.join(raw_dir, f"{s['id']}_cut.wav")
        fin = os.path.join(raw_dir, f"{s['id']}.wav")
        if not os.path.exists(fin) or os.path.getsize(fin) < 2000:
            c = SynthesisConfig(length_scale=s["rate"] * scale,
                                noise_scale=s["noise"], noise_w_scale=0.8)
            with wave.open(raw, "wb") as w:
                voice.synthesize_wav(s["speech"], w, syn_config=c)
            trim(raw, cut)
            broadcast(cut, fin)
        d = wav_dur(fin)
        parts.append(fin)
        manifest.append({"id": s["id"], "text": s["cap"], "start": round(t, 3),
                         "dur": round(d, 3), "gap": s["gap"], "mood": s["id"]})
        t += d + s["gap"]
        print(f"  {s['id']}  {t:6.2f}s  аудио {d:5.2f}s")

    # ── склейка с паузами ──
    seq = []
    for i, m in enumerate(manifest):
        seq.append(os.path.join(raw_dir, m["id"] + ".wav"))
        if i < len(manifest) - 1 and m["gap"] > 0.001:
            sp = os.path.join(raw_dir, f"g{i}.wav")
            if not os.path.exists(sp):
                silence(sp, m["gap"])
            seq.append(sp)

    voice_out = os.path.join(WORK, "voice_v4.wav")
    concat(seq, voice_out)

    # финальная нормализация по EBU R128 (одинаковая громкость всего ролика)
    norm = os.path.join(WORK, "voice_v4n.wav")
    subprocess.run([FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-i", voice_out,
                    "-af", "loudnorm=I=-16:TP=-1.5:LRA=9:linear=true",
                    "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", norm], check=True)
    os.replace(norm, voice_out)

    shutil.copy2(voice_out, os.path.join(PROJECT, "voice_v4.wav"))

    total = wav_dur(voice_out)
    for m in manifest:
        pass
    with open(os.path.join(PROJECT, "src", "timeline_v4.json"), "w", encoding="utf-8") as f:
        json.dump({"fps": 60, "total": round(total, 3), "segments": manifest}, f, ensure_ascii=False, indent=2)

    print(f"\nГОЛОС v4 ({VOICE}): {total:.2f}s")


main()




