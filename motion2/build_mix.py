"""
Финальный микс: голос + музыка + саунддизайн, с точным дакингом по карте битов.

  key.wav  — ключевой сигнал (1 кГц): ровный в моменты речи, тихий в паузах.
             Подаётся в sidechaincompress как боковой сигнал → музыка проваливается
             точно под голос, с мягкими атакой и релизом.
  События  — 34 штуки по таймлайну: ризеры, импакты, ктоши, клики, саб-бумы.
"""
import json, os, subprocess, sys
import numpy as np

PROJ = r"Z:\лендинги\motion2"
WORK = os.path.join(PROJ, ".work")
FFMPEG = os.environ.get("FFMPEG_BIN", r"C:\Users\user\AppData\Local\Temp\ffmpeg2.exe")
VOICE = os.environ.get("BEST_VOICE", "ruslan")


def sh(args, stdin_bytes=None):
    """Запуск без ожидания stdin — ffmpeg больше не зависает."""
    cmd = [a for a in args if a != "-nostdin"]
    cmd = [FFMPEG, "-nostdin", "-y", "-hide_banner", "-loglevel", "error"] + cmd
    data = stdin_bytes
    r = subprocess.run(cmd, input=data, capture_output=True)
    if r.returncode != 0:
        err = r.stderr.decode("utf-8", "ignore") if r.stderr else ""
        print("  ОШИБКА:", " ".join(str(a) for a in cmd[:6]), "→", err[-500:])
        sys.exit(1)
    return r.stdout.decode("utf-8", "ignore")


def find(group, prefer=None):
    d = os.path.join(WORK, "sfx", group)
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
        ramp = min(int(0.14 * sr), (b - a) // 2)
        env = np.ones(b - a, dtype=np.float32)
        if ramp > 1:
            env[:ramp] = np.linspace(0, 1, ramp)
            env[-ramp:] = np.linspace(1, 0, ramp)
        key[a:b] = np.maximum(key[a:b], env)
    wave = (0.30 * key * np.sin(2 * np.pi * 1000 * t)).astype(np.float32)
    pcm = (wave * 32767).astype(np.int16)
    sh(["-f", "s16le", "-ar", str(sr), "-ac", "1", "-i", "-", "-c:a", "pcm_s16le", path],
       stdin_bytes=pcm.tobytes())
    return path


def main():
    tl = json.load(open(os.path.join(WORK, f"timeline_{VOICE}.json"), encoding="utf-8"))
    segs = tl["segments"]
    total = tl["total"]
    print(f"  таймлайн: {len(segs)} битов, {total:.2f} с", flush=True)

    key = build_key(segs, total, os.path.join(WORK, "key.wav"))
    print("  key.wav собран", flush=True)

    voice = os.path.join(WORK, f"voice_{VOICE}.wav")
    music = os.path.join(WORK, "sfx", "music", "03_Laid_Back_Electronic_Beat.mp3")
    if not os.path.exists(music):
        md = os.path.join(WORK, "sfx", "music")
        music = os.path.join(md, sorted(os.listdir(md))[0])

    riser = find("riser", "riser_2")
    impact = find("impact", "Hit_Impact")
    whoosh = find("whoosh", "Whoosh_wav")
    click = find("click", "Interface3")
    sub = find("sub", "thick_stamp")

    T = {s["id"]: s["start"] for s in segs}
    events = []
    for t in [T["s09"] - 1.0, T["s14"] - 1.1, T["s15"] - 0.8, T["s19"] - 0.8, T["s21"] - 1.4]:
        if t > 0.2:
            events.append((riser, t, 0.55, "afade=t=in:st=0:d=0.08,afade=t=out:st=1.3:d=0.45"))
    for t in [T["s09"], T["s14"], T["s15"], T["s21"]]:
        events.append((impact, t, 0.95, None))
    for s in segs[:-1]:
        events.append((whoosh, max(0, s["start"] - 0.12), 1.4, None))
    for t in [T["s06"], T["s10"], T["s11"], T["s20"]]:
        events.append((click, t, 2.2, None))
    for t in [T["s14"], T["s15"]]:
        events.append((sub, t, 1.6, None))

    inputs, fc, ev = [], [], []
    inputs += ["-stream_loop", "-1", "-i", music, "-i", voice, "-i", key]
    idx = 3
    for path, at, gain, fade in events:
        inputs += ["-i", path]
        ch = f"[{idx}:a]adelay={int(at*1000)}|{int(at*1000)},volume={gain}"
        if fade:
            ch += "," + fade
        ch += f",aresample=48000[e{len(ev)}]"
        fc.append(ch)
        ev.append(f"[e{len(ev)}]")
        idx += 1

    fc.append(f"[0:a]atrim=0:{total},asetpts=N/SR/TB,aresample=48000,"
               f"volume=1.7,afade=t=in:st=0:d=2.2,afade=t=out:st={total-3.5}:d=3.5[mus]")
    fc.append("[mus][2:a]sidechaincompress=threshold=0.006:ratio=18:attack=2:release=170:makeup=1[duck]")
    fc.append("[1:a]volume=1.3[vo]")
    fc.append("[duck][vo]amix=inputs=2:normalize=0:duration=longest[main]")
    if ev:
        fc.append("".join(ev) + f"amix=inputs={len(ev)}:normalize=0:duration=longest[evm]")
        fc.append("[main][evm]amix=inputs=2:normalize=0:duration=longest[out2]")
    else:
        fc.append("[main]anull[out2]")
    fc.append("[out2]alimiter=limit=0.9:level=disabled[fin]")

    out = os.path.join(WORK, "mix_final.wav")
    print(f"  ffmpeg: {len(inputs)} входов, {len(ev)} событий ...", flush=True)
    sh(inputs + ["-filter_complex", ";".join(fc), "-map", "[fin]", "-ac", "2",
                  "-ar", "48000", "-c:a", "pcm_s16le", out])
    print("  микс готов:", out)


main()
