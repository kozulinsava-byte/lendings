"""
Финальный пакет для исполнителя ролика.

  assets/voice.wav        — сведенный трек (голос + музыка + саунддизайн), 48 кГц
  assets/voice_clean.wav  — только голос (если исполнитель соберёт звук сам)
  assets/beatmap.json     — карта битов: id / start / end / текст
  assets/*.png            — скриншоты настоящих лендингов
"""
import json, os, shutil, subprocess

PROJ = r"Z:\лендинги\motion2"
WORK = os.path.join(PROJ, ".work")
ASSETS = os.path.join(PROJ, "assets")
FFMPEG = os.path.join(WORK, "ffmpeg2.exe")
VOICE = os.environ.get("BEST_VOICE", "ruslan")

os.makedirs(ASSETS, exist_ok=True)


def sh(args, **kw):
    r = subprocess.run(args, capture_output=True, text=True, errors="ignore", **kw)
    if r.returncode != 0:
        print("  ОШИБКА:", (r.stderr or "")[-400:])
    return r.returncode == 0


# 1. сведенный трек
mix = os.path.join(WORK, "mix_final.wav")
if os.path.exists(mix):
    shutil.copy2(mix, os.path.join(ASSETS, "voice.wav"))
    # mp3 для быстрого прослушивания
    sh([FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-i", mix,
        "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(ASSETS, "voice.mp3")])
    print("  voice.wav + voice.mp3 готовы")

# 2. чистый голос
clean = os.path.join(WORK, f"voice_{VOICE}.wav")
if os.path.exists(clean):
    shutil.copy2(clean, os.path.join(ASSETS, "voice_clean.wav"))

# 3. карта битов
tl_path = os.path.join(WORK, f"timeline_{VOICE}.json")
tl = json.load(open(tl_path, encoding="utf-8"))
beats = [{
    "id": s["id"],
    "start": round(s["start"], 2),
    "end": round(s["start"] + s["dur"], 2),
    "text": s["text"],
} for s in tl["segments"]]

json.dump({
    "total": round(tl["total"], 2),
    "fps": 60,
    "note": "Тайминги точные, взяты из реальной длины озвучки. Ориентироваться на них, а не на регламент.",
    "beats": beats,
}, open(os.path.join(ASSETS, "beatmap.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"  beatmap.json: {len(beats)} битов, {round(tl['total'],2)} с")

# 4. скриншоты сайтов
for n in ["shawarma", "beauty", "auto", "dental"]:
    p = os.path.join(PROJ, "public", n + ".png")
    if os.path.exists(p):
        shutil.copy2(p, os.path.join(ASSETS, n + ".png"))

print("\n  ПАКЕТ:")
for f in sorted(os.listdir(ASSETS)):
    print(f"    {f:20} {round(os.path.getsize(os.path.join(ASSETS, f))/1048576, 2):>7} МБ")
