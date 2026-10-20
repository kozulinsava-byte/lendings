"""
Голос для ролика: Edge Neural TTS с эмоциональными стилями (SSML mstts:express-as).

Фишки:
  • настоящие эмоции (cheerful / serious / friendly / customerservice), а не только pitch;
  • автоматическая подрезка тишины по краям каждого дубля — паузы становятся плотными;
  • отдельный «дубль» на каждую реплику: свой стиль, темп, высота, громкость;
  • нормализация громкости под общую дорожку.
"""
import asyncio, json, os, re, subprocess, shutil
import edge_tts
import edge_tts.communicate as ec

FFMPEG = r"C:\Users\user\AppData\Local\Temp\opencode\ffmpeg2.exe"

# ---- патч SSML: добавляем namespace mstts и поддержку express-as ----
# stream() в edge_tts вызывает mkssml() как глобальную функцию модуля,
# поэтому подменяем её в module namespace. Стиль передаём через _CURRENT_STYLE.
_CURRENT_STYLE = [None]


def mkssml(tc, escaped_text):
    if isinstance(escaped_text, bytes):
        escaped_text = escaped_text.decode("utf-8")
    style = _CURRENT_STYLE[0]
    inner = (
        f"<mstts:express-as style='{style}'>{escaped_text}</mstts:express-as>"
        if style
        else escaped_text
    )
    return (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' "
        "xmlns:mstts='https://www.w3.org/2001/mstts' xml:lang='ru-RU'>"
        f"<voice name='{tc.voice}'>"
        f"<prosody pitch='{tc.pitch}' rate='{tc.rate}' volume='{tc.volume}'>"
        f"{inner}"
        "</prosody>"
        "</voice>"
        "</speak>"
    )


ec.mkssml = mkssml


async def synth(text, voice, rate, pitch, volume, style, dest):
    _CURRENT_STYLE[0] = style
    try:
        comm = ec.Communicate(text, voice, rate=rate, pitch=pitch, volume=volume)
        await comm.save(dest)
    finally:
        _CURRENT_STYLE[0] = None


def dur(path):
    p = subprocess.run([FFMPEG, "-hide_banner", "-i", path], capture_output=True, text=True, errors="ignore")
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", p.stderr)
    if not m:
        return 0.0
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


def trim_silence(src, dst):
    """Убирает тишину в начале/конце и сжатые паузы внутри."""
    subprocess.run([
        FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
        "-i", src,
        "-af", "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-45dB:"
               "detection=peak:stop_periods=-1:stop_duration=0.06:stop_threshold=-45dB",
        "-ar", "48000", "-ac", "1", dst,
    ], check=True)


def silence(path, seconds):
    # WAV (pcm_s16le) — чтобы concat-демуксер не терял время на стыках
    subprocess.run([
        FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
        "-f", "lavfi", "-t", f"{seconds:.3f}",
        "-i", "anullsrc=channel_layout=mono:sample_rate=48000",
        "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "1", path,
    ], check=True)


def concat(parts, out):
    lst = out + ".txt"
    with open(lst, "w", encoding="utf-8") as f:
        for p in parts:
            f.write("file '" + p.replace("'", "'\\''") + "'\n")
    subprocess.run([FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
                    "-f", "concat", "-safe", "0", "-i", lst, "-c:a", "pcm_s16le",
                    "-ar", "48000", "-ac", "1", out], check=True)
    os.remove(lst)
