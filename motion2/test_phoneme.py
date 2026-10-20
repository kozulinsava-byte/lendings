"""
Проверка произношения: SSML <phoneme> и <break>.
Если работает — задаём ударения для «2ГИС», «лендинг», «процента» и т.п.
"""
import asyncio, os, sys, re, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import edge_tts.communicate as ec
import voice_engine as ve

FFMPEG = ve.FFMPEG
OUT = r"C:\Users\user\AppData\Local\Temp\opencode\voice_test"
os.makedirs(OUT, exist_ok=True)
VOICE = "ru-RU-DmitryNeural"

# патч: разрешаем произвольный SSML-контент
_RAW = [None]


def mkssml(tc, escaped_text):
    if isinstance(escaped_text, bytes):
        escaped_text = escaped_text.decode("utf-8")
    inner = _RAW[0] if _RAW[0] is not None else escaped_text
    return (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' "
        "xmlns:mstts='https://www.w3.org/2001/mstts' xml:lang='ru-RU'>"
        f"<voice name='{tc.voice}'>"
        f"<prosody pitch='{tc.pitch}' rate='{tc.rate}' volume='{tc.volume}'>"
        f"{inner}</prosody></voice></speak>"
    )


ec.mkssml = mkssml

TESTS = [
    ("base", "А теперь смотри, что меняется.", None),
    ("phoneme", "А теперь смотри, что меняется.",
     '<phoneme alphabet="ipa" ph="dʲɪsʲɪs">2ГИС</phoneme>'),
    ("break", "А теперь смотри, что меняется.",
     'А теперь смотри<break time="220ms"/>, что меняется.'),
    ("both", "А теперь смотри, что меняется.",
     'А теперь смотри<break time="200ms"/>, что меняется. '
     '<phoneme alphabet="ipa" ph="dʲɪsʲɪs">2ГИС</phoneme>'),
    ("mark", "Ссылка на сайт в карточке 2ГИС.",
     'Ссылка на сайт в карточке <mark name="x"/>2ГИС.'),
]


async def main():
    for name, text, raw in TESTS:
        dest = os.path.join(OUT, "ph_" + name + ".mp3")
        _RAW[0] = raw
        try:
            comm = ec.Communicate(text, VOICE, rate="+0%", pitch="+0Hz", volume="+0%")
            await comm.save(dest)
            d = ve.dur(dest)
            print(f"  {name:10} {d:5.2f}s  {'OK' if d > 0.5 else 'ПУСТО'}")
        except Exception as e:
            print(f"  {name:10} ОШИБКА: {str(e)[:80]}")
    _RAW[0] = None


asyncio.run(main())