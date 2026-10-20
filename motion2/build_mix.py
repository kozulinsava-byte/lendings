"""
Финальный микс: голос + два музыкальных слоя + саунддизайн.

Структура музыки (почему «разнообразие»):
  слой A — спокойный бед, тише в первом акте, ровнее к финалу;
  слой B — энергичный трек, входит на «переломе» (0:23) и держит до конца;
  между слоями — разные текстуры, разная фильтрация и разные точки входа.

Дакинг: ключевой сигнал по карте битов (1 кГц ровно в момент речи) →
sidechaincompress. Ratio 7, чтобы музыка не исчезала, а проседала.
"""
import json, os, re, subprocess, sys
import numpy as np

LAB = r"Z:\лендинги\motion2\.work"
FFMPEG = os.path.join(LAB, "ffmpeg2.exe")
SFX = r"Z:\лендинги\motion2\.work\sfx"
TOTAL = json.load(open(os.path.join(LAB, "timeline.json"), encoding="utf-8"))["total"]


def sh(args, stdin_bytes=None):
    cmd = [FFMPEG, "-nostdin", "-y", "-hide_banner", "-loglevel", "error"] + list(args)
    r = subprocess.run(cmd, input=stdin_bytes, capture_output=True)
    if r.returncode != 0:
        print("  ОШИБКА ffmpeg:", r.stderr.decode("utf-8", "ignore")[-500:])
        sys.exit(1)
    return r.stdout


def find(group, prefer=None):
    d = os.path.join(SFX, group)
    if not os.path.isdir(d):
        return None
    fs = [os.path.join(d, f) for f in sorted(os.listdir(d)) if f.endswith(".mp3")]
    if not fs:
        return None
    if prefer:
        for f in fs:
            if prefer.lower() in os.path.basename(f).lower():
                return f
    return fs[0]


def build_key(segments, total, path, sr=48000):
    n = int(total * sr)
    t = np.arange(n) / sr
    key = np.zeros(n, dtype=np.float32)
    for s in segments:
        a = int(max(0, s["start"] * sr))
        b = int(min(n, (s["start"] + s["dur"]) * sr))
        if b - a < 100:
            continue
        ramp = min(int(0.16 * sr), (b - a) // 2)
        env = np.ones(b - a, dtype=np.float32)
        if ramp > 1:
            env[:ramp] = np.linspace(0, 1, ramp)
            env[-ramp:] = np.linspace(1, 0, ramp)
        key[a:b] = np.maximum(key[a:b], env)
    wave = (0.26 * key * np.sin(2 * np.pi * 900 * t)).astype(np.float32)
    pcm = (wave * 32767).astype(np.int16)
    sh(["-f", "s16le", "-ar", str(sr), "-ac", "1", "-i", "-", "-c:a", "pcm_s16le", path],
       stdin_bytes=pcm.tobytes())
    return path


def main():
    tl = json.load(open(os.path.join(LAB, "timeline.json"), encoding="utf-8"))
    segs = tl["segments"]
    total = tl["total"]
    print(f"  таймлайн {len(segs)} битов, {total:.2f} с", flush=True)

    key = build_key(segs, total, os.path.join(LAB, "key.wav"))
    voice = os.path.join(LAB, "voice.wav")

    bed = find("music", "Awesome")
    energy = find("music", "8_bit")
    if not energy or energy == bed:
        d = os.path.join(SFX, "music")
        allm = [os.path.join(d, f) for f in sorted(os.listdir(d)) if f.endswith(".mp3")]
        energy = next((m for m in allm if m != bed), bed)
    print(f"  слой A: {os.path.basename(bed)}")
    print(f"  слой B: {os.path.basename(energy)}")

    riser = find("riser", "riser_2")
    impact = find("impact", "Hit_Impact")
    whoosh = find("whoosh", "Whoosh_wav")
    click = find("click", "Interface3")
    sub = find("sub", "thick_stamp")
    riser2 = find("riser", "reverse_bass")
    impact2 = find("impact", "cinematic_boom")

    T = {s["id"]: s["start"] for s in segs}
    TURN = T["s09"]          # момент перелома
    CLOSE = T["s20"]         # финальный призыв

    events = []
    # ризеры: перед переломом, перед цифрой, перед ценой, перед финалом
    for t, g in [(TURN - 1.2, 0.5), (T["s14"] - 1.2, 0.45), (T["s15"] - 0.9, 0.4),
                 (T["s20"] - 1.0, 0.45), (T["s21"] - 1.3, 0.5)]:
        if t > 0.3:
            events.append((riser if t != TURN - 1.2 else riser2, t, g,
                           "afade=t=in:st=0:d=0.06,afade=t=out:st=1.25:d=0.5"))
    # импакты
    for t, g in [(TURN, 0.85), (T["s14"], 0.8), (T["s15"], 0.9), (T["s21"], 0.95)]:
        events.append((impact, t, g, "afade=t=in:st=0:d=0.004,afade=t=out:st=0.45:d=0.12"))
    # второй, «весомый» импакт на переломе
    events.append((impact2, TURN, 0.7, "afade=t=in:st=0:d=0.004,afade=t=out:st=0.8:d=0.25"))
    # ктоши на каждой смене сцены
    for s in segs[:-1]:
        events.append((whoosh, max(0, s["start"] - 0.14), 1.15,
                       "afade=t=in:st=0:d=0.02,afade=t=out:st=0.4:d=0.2"))
    # клики на UI-моментах
    for t in [T["s06"], T["s10"], T["s11"], T["s20"]]:
        events.append((click, t, 1.9, "afade=t=in:st=0:d=0.003,afade=t=out:st=0.2:d=0.06"))
    # саб-бумы
    for t in [T["s14"], T["s15"]]:
        events.append((sub, t, 1.4, "afade=t=in:st=0:d=0.01,afade=t=out:st=0.9:d=0.25"))

    inputs, fc, ev = [], [], []
    inputs += ["-stream_loop", "-1", "-i", bed,
               "-stream_loop", "-1", "-i", energy,
               "-i", voice, "-i", key]
    idx = 4
    for path, at, gain, fade in events:
        if not path:
            continue
        inputs += ["-i", path]
        ch = f"[{idx}:a]adelay={int(at*1000)}|{int(at*1000)},volume={gain}"
        if fade:
            ch += "," + fade
        ch += f",aresample=48000[e{len(ev)}]"
        fc.append(ch)
        ev.append(f"[e{len(ev)}]")
        idx += 1

    # слой A: ровный бед на весь ролик
    fc.append(f"[0:a]atrim=0:{total},asetpts=N/SR/TB,aresample=48000,"
               f"highpass=f=45,lowpass=f=11000,volume=0.19,"
               f"afade=t=in:st=0:d=1.8,afade=t=out:st={total-3}:d=3[bedA]")
    # слой B: энергичный трек входит на переломе
    fc.append(f"[1:a]atrim=0:{total},asetpts=N/SR/TB,aresample=48000,"
               f"highpass=f=60,lowpass=f=14000,volume=0.0,"
               f"afade=t=in:st={TURN:.2f}:d=2.4,"
               f"afade=t=out:st={total-2.5}:d=2.5[bedB]")
    # оба слоя → один бед
    fc.append("[bedA][bedB]amix=inputs=2:normalize=0[bed]")
    # дакинг: музыка проседает под голос, но не исчезает
    fc.append("[bed][3:a]sidechaincompress=threshold=0.03:ratio=5:attack=8:release=300:makeup=1[duck]")
    fc.append("[2:a]volume=1.45[vo]")
    fc.append("[duck][vo]amix=inputs=2:normalize=0:duration=longest[main]")
    if ev:
        fc.append("".join(ev) + f"amix=inputs={len(ev)}:normalize=0:duration=longest[evm]")
        fc.append("[main][evm]amix=inputs=2:normalize=0:duration=longest[out2]")
    else:
        fc.append("[main]anull[out2]")
    fc.append("[out2]alimiter=limit=0.92:level=disabled[fin]")

    out = os.path.join(LAB, "mix_final.wav")
    print(f"  ffmpeg: {len(inputs)//2} входов, {len(ev)} событий ...", flush=True)
    sh(inputs + ["-filter_complex", ";".join(fc), "-map", "[fin]", "-ac", "2",
                  "-ar", "48000", "-c:a", "pcm_s16le", out])
    print("  микс готов:", out)


main()

