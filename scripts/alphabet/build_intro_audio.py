"""Записи для вступления курса «Чтение по слогам».

В оригинальном приложении записей для вступления нет, и связки вроде «баба»
читал синтезатор речи. Здесь они собираются из настоящих записей слогов
буквы Ба тем же диктором: слог, короткая пауза, слог — так, как читают
по слогам. Тишина по краям каждого слога срезается по порогу, у краёв —
короткие затухания, чтобы на стыках не щёлкало.

Запуск (нужен ffmpeg; путь можно передать переменной FFMPEG):
    python scripts/alphabet/build_intro_audio.py
"""
import os
import re
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets', 'alphabet')
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')

# Буква Ба — восьмая в учебном порядке: 8-1 «ба», 8-2 «би», 8-3 «бу».
OUTPUTS = {
    'intro-baba': ['8-1', '8-1'],
    'intro-babi': ['8-1', '8-2'],
    'intro-bubi': ['8-3', '8-2'],
}

LEAD = 0.15      # тишина перед первым слогом, как в исходных записях
GAP = 0.16       # пауза между слогами: читаем по слогам, а не слитно
TAIL = 0.20      # тишина после последнего слога
PAD = 0.03       # запас вокруг найденной речи: не срезать атаку и затухание
FADE = 0.012
THRESHOLD = '-50dB'


def speech_bounds(path):
    """Начало и конец речи в файле по порогу тишины."""
    out = subprocess.run(
        [FFMPEG, '-hide_banner', '-i', path, '-af', f'silencedetect=noise={THRESHOLD}:d=0.04', '-f', 'null', '-'],
        capture_output=True, text=True, check=True).stderr
    hours, minutes, seconds = re.search(r'Duration: (\d+):(\d+):([\d.]+)', out).groups()
    duration = int(hours) * 3600 + int(minutes) * 60 + float(seconds)
    # ffmpeg бывает печатает слегка отрицательное начало тишины у самого края.
    starts = [max(0.0, float(x)) for x in re.findall(r'silence_start: (-?[\d.]+)', out)]
    ends = [float(x) for x in re.findall(r'silence_end: (-?[\d.]+)', out)]
    # Тишина в начале файла заканчивается там, где начинается речь; последняя
    # тишина начинается там, где речь кончилась.
    begin = ends[0] if starts and starts[0] == 0.0 and ends else 0.0
    end = starts[-1] if starts and starts[-1] > begin else duration
    return max(0.0, begin - PAD), min(duration, end + PAD)


def build(name, keys):
    inputs, parts = [], []
    for i, key in enumerate(keys):
        path = os.path.join(SRC, f'{key}.m4a')
        start, end = speech_bounds(path)
        length = end - start
        inputs += ['-i', path]
        parts.append(
            f'[{i}:a]atrim=start={start:.3f}:end={end:.3f},asetpts=PTS-STARTPTS,'
            f'afade=t=in:d={FADE},afade=t=out:st={length - FADE:.3f}:d={FADE}[s{i}]')
    pauses = [LEAD] + [GAP] * (len(keys) - 1) + [TAIL]
    for i, sec in enumerate(pauses):
        parts.append(f'anullsrc=r=44100:cl=stereo,atrim=duration={sec}[p{i}]')
    order = ''.join(f'[p{i}][s{i}]' for i in range(len(keys))) + f'[p{len(keys)}]'
    parts.append(f'{order}concat=n={len(keys) * 2 + 1}:v=0:a=1[out]')
    target = os.path.join(SRC, f'{name}.m4a')
    subprocess.run(
        [FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', *inputs, '-filter_complex', ';'.join(parts),
         '-map', '[out]', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '2', target],
        check=True)
    print(name, '<-', ' + '.join(keys))


if __name__ == '__main__':
    for out_name, src_keys in OUTPUTS.items():
        build(out_name, src_keys)
    sys.exit(0)
