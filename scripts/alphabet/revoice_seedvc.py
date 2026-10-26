"""Переозвучка записей уроков Noor голосом из образца (Seed-VC, модели грузятся один раз).

Так сделаны assets/alphabet/*.m4a в октябре 2026: прежний диктор звучал тонко
(около 176 Гц). Произношение берётся из его записей, голос — из образца:
22 с арабской речи синтезатора Microsoft ar-SA-HamedNeural (edge-tts). После
прогона громкость каждой записи выровнена под оригинал (RMS), пик не выше 0.89,
затем AAC 44,1 кГц моно 128 кбит/с. Seed-VC стоит в E:/AI/seed-vc (PyTorch cu128
под RTX 5060), этот файл лежит там же и запускается оттуда.

Запуск из E:\\AI\\seed-vc:
    .venv\\Scripts\\python.exe batch_noor.py <папка wav-исходников> <образец голоса> <папка результата>

Уже готовые файлы пропускаются, поэтому прерванный прогон можно продолжить.
"""
import argparse
import glob
import os
import sys
import time

src_dir, ref, out_dir = sys.argv[1:4]
sys.argv = [sys.argv[0]]
import inference as inf  # noqa: E402

_models = None
_load = inf.load_models


def cached(args):
    global _models
    if _models is None:
        _models = _load(args)
    return _models


inf.load_models = cached

files = sorted(glob.glob(os.path.join(src_dir, '*.wav')))
os.makedirs(out_dir, exist_ok=True)
ref_name = os.path.basename(ref).split('.')[0]
start = time.time()
done = 0
for i, src in enumerate(files, 1):
    name = os.path.basename(src)[:-4]
    final = os.path.join(out_dir, name + '.wav')
    if os.path.exists(final):
        continue
    args = argparse.Namespace(source=src, target=ref, output=out_dir, diffusion_steps=30, length_adjust=1.0,
                              inference_cfg_rate=0.7, f0_condition=False, auto_f0_adjust=False,
                              semi_tone_shift=0, checkpoint=None, config=None, fp16=True)
    inf.main(args)
    # inference.py называет файл vc_<имя>_<образец>_...; переименовываем в исходное имя.
    made = os.path.join(out_dir, f'vc_{name.split(".")[0]}_{ref_name}_1.0_30_0.7.wav')
    os.replace(made, final)
    done += 1
    if done % 20 == 0:
        print(f'[{i}/{len(files)}] {time.time() - start:.0f} с', flush=True)
print(f'ГОТОВО: {done} новых, всего {len(files)}, {time.time() - start:.0f} с', flush=True)
