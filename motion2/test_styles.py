"""Проверка эмоциональных стилей Edge TTS на русском."""
import asyncio, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from voice_engine import synth, FFMPEG, dur, trim_silence

VOICE = "ru-RU-DmitryNeural"
OUT = r"C:\Users\user\AppData\Local\Temp\opencode\voice_test"
os.makedirs(OUT, exist_ok=True)

TESTS = [
    ("plain", "+0%", "+0Hz", "+0%", None, "Обычный голос без эмоций, нейтральная подача."),
    ("cheerful", "+6%", "+4Hz", "+0%", "cheerful", "Дружелюбно, с улыбкой, как в рекламе."),
    ("serious", "-8%", "-4Hz", "+0%", "serious", "Уверенно и весомо, как в серьёзном заявлении."),
    ("friendly", "+4%", "+2Hz", "+0%", "friendly", "Тепло и по-человечески, как разговор."),
]

async def main():
    for name, rate, pitch, vol, style, text in TESTS:
        raw = os.path.join(OUT, name + "_raw.mp3")
        cut = os.path.join(OUT, name + ".mp3")
        try:
            comm = None
            await synth(text, VOICE, rate=rate, pitch=pitch, volume=vol, style=style, dest=raw)
            trim_silence(raw, cut)
            print(f"  {name:10} стиль={str(style):16} длительность {dur(cut):5.2f}s  {'OK' if dur(cut) > 0 else 'ПУСТО'}")
        except Exception as e:
            print(f"  {name:10} стиль={str(style):16} ОШИБКА: {str(e)[:90]}")

asyncio.run(main())