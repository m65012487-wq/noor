"""Звук «Гром» для уведомлений: синтез, без чужих записей.

Резкий раскат (широкополосный шум с быстрым спадом и парой отголосков) и
низкий перекатывающийся гул (броуновский шум под фильтром, несколько волн
с убывающей силой), лёгкий хвост «эха». Моно, 44,1 кГц, 16 бит, как у
остальных звуков: iOS берёт в уведомление только несжатый файл до 30 с.

python scripts/sounds/thunder.py  → assets/sounds/thunder.wav
"""
import pathlib
import wave

import numpy as np
from scipy import signal

SR = 44100
DUR = 7.5
OUT = pathlib.Path(__file__).resolve().parents[2] / "assets" / "sounds" / "thunder.wav"
rng = np.random.default_rng(1447)
t = np.arange(int(SR * DUR)) / SR


def band(x, lo, hi, order=4):
    sos = signal.butter(order, [lo, hi], btype="bandpass", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def low(x, hi, order=4):
    sos = signal.butter(order, hi, btype="lowpass", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def burst(at, tau, gain):
    """Огибающая удара: мгновенная атака и экспоненциальный спад."""
    e = np.where(t >= at, np.exp(-(t - at) / tau), 0.0)
    attack = np.clip((t - at) / 0.004, 0, 1)
    return gain * e * attack


# Раскат: треск в средних и верхних частотах, главный удар и два отголоска.
crack_env = burst(0.05, 0.16, 1.0) + burst(0.21, 0.12, 0.55) + burst(0.47, 0.22, 0.35)
crack = band(rng.standard_normal(t.size), 280, 5200) * crack_env

# Гул: броуновский шум, срезанный до самых низов, волнами.
brown = np.cumsum(rng.standard_normal(t.size))
brown = signal.sosfilt(signal.butter(2, 18, btype="highpass", fs=SR, output="sos"), brown)
rumble = low(brown, 140)
rumble /= np.abs(rumble).max()
rolls = [(0.35, 0.55, 1.0), (1.25, 0.7, 0.85), (2.35, 0.8, 0.65), (3.55, 0.9, 0.45), (4.8, 1.0, 0.28)]
roll_env = sum(g * np.exp(-0.5 * ((t - c) / w) ** 2) for c, w, g in rolls)
roll_env *= np.clip(t / 0.25, 0, 1)
body = rumble * roll_env

# Средний «рокот» поверх гула — чтобы гром был слышен и на маленьком динамике.
mid = band(rng.standard_normal(t.size), 90, 420) * roll_env * 0.35
mid = low(mid * (0.6 + 0.4 * np.abs(low(rng.standard_normal(t.size), 6))), 600)

mix = 0.9 * crack + 1.0 * body + mid

# Эхо: свёртка с затухающим шумом даёт ощущение открытого неба.
ir_t = np.arange(int(SR * 1.6)) / SR
ir = rng.standard_normal(ir_t.size) * np.exp(-ir_t / 0.45)
ir = low(ir, 1800)
ir /= np.sqrt((ir ** 2).sum())
wet = signal.fftconvolve(mix, ir)[: t.size]
mix = 0.75 * mix + 0.45 * wet

# Плавный хвост и нормировка до −1 дБ.
fade = np.clip((DUR - t) / 1.2, 0, 1) ** 2
mix *= fade
mix *= 10 ** (-1 / 20) / np.abs(mix).max()

pcm = np.round(mix * 32767).astype("<i2")
OUT.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(OUT), "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(OUT, f"{DUR} s")
