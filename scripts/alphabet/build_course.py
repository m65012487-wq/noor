"""Курс «Чтение по слогам» из приложения Arabic alphabet (Construct 2).

Берёт из распакованного APK таблицу курса (data.js) и живые записи
(media/<буква>-<элемент>.ogg) и кладёт в Noor:
  assets/alphabet/<буква>-<элемент>.m4a — записи в AAC (iOS не играет Vorbis);
  src/constants/alphabetSource.js        — буквы с элементами и require каждой записи.
Описания букв и вступление написаны заново в src/constants/alphabetCourse.js.

Запуск: python scripts/alphabet/build_course.py [папка assets/www] [ffmpeg]
ffmpeg ищется в PATH или в imageio_ffmpeg.
"""
import json
import os
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\Andrameda\Desktop\arabic\assets\www'
OUT_AUDIO = os.path.join(ROOT, 'assets', 'alphabet')
OUT_JS = os.path.join(ROOT, 'src', 'constants', 'alphabetSource.js')
LETTERS = 28


def ffmpeg_exe():
    if len(sys.argv) > 2:
        return sys.argv[2]
    found = shutil.which('ffmpeg')
    if found:
        return found
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def c2arrays(text):
    out = []
    for m in re.finditer(r'"(\{\\"c2array\\".*?\]\]\]\})"', text):
        raw = m.group(1).encode().decode('unicode_escape').encode('latin1').decode('utf-8')
        out.append(json.loads(raw))
    return out


def cell(v):
    return v if isinstance(v, str) else ''


def main():
    text = open(os.path.join(SRC, 'data.js'), encoding='utf-8-sig').read()
    arrays = c2arrays(text)
    grid = next(a for a in arrays if a['size'][:2] == [38, 29])['data']

    letters = []
    for c in range(1, LETTERS + 1):
        items = [cell(grid[r][c][0]) for r in range(38)]
        items = [x for x in items if x]
        files = [f for f in os.listdir(os.path.join(SRC, 'media')) if re.fullmatch(rf'{c}-\d+\.ogg', f)]
        if len(files) != len(items):
            raise SystemExit(f'буква {c}: элементов {len(items)}, записей {len(files)}')
        letters.append({'items': items})

    os.makedirs(OUT_AUDIO, exist_ok=True)
    ff = ffmpeg_exe()
    jobs = [(c, i) for c in range(1, LETTERS + 1) for i in range(len(letters[c - 1]['items']))]

    def convert(job):
        c, i = job
        src = os.path.join(SRC, 'media', f'{c}-{i}.ogg')
        dst = os.path.join(OUT_AUDIO, f'{c}-{i}.m4a')
        subprocess.run([ff, '-v', 'error', '-y', '-i', src, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', dst],
                       check=True, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))

    with ThreadPoolExecutor(8) as pool:
        list(pool.map(convert, jobs))

    lines = [
        '// Создано scripts/alphabet/build_course.py из приложения Arabic alphabet — не править руками.',
        '// Буквы в учебном порядке; элементы буквы: сама буква, три огласовки, слоги и слова',
        '// только из уже пройденных букв. Запись элемента — AUDIO[`${буква}-${номер}`].',
        '',
        f'export const LETTER_ITEMS = {json.dumps([l["items"] for l in letters], ensure_ascii=False)};',
        '',
        'export const AUDIO = {',
    ]
    lines += [f"  '{c}-{i}': require('../../assets/alphabet/{c}-{i}.m4a')," for c, i in jobs]
    lines += ['};', '']
    with open(OUT_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines))
    print(f'букв {len(letters)}, записей {len(jobs)}')


if __name__ == '__main__':
    main()
