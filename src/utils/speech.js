import * as Speech from 'expo-speech';

let pending = null;
let lastText = null;

// Speaks Arabic text aloud using the device's built-in TTS voice.
// Robust against rapid taps: cancels any in-flight utterance/timer first,
// then speaks. Retries once if the engine didn't start (a known flaky case).
export function speakArabic(text) {
  try {
    lastText = text;
    if (pending) { clearTimeout(pending); pending = null; }
    Speech.stop();
    pending = setTimeout(() => {
      pending = null;
      const opts = { language: 'ar', rate: 0.7, pitch: 1.0 };
      try { Speech.speak(text, opts); } catch (e) {}
      // Safety retry: if nothing is speaking shortly after, try once more.
      setTimeout(async () => {
        try {
          const speaking = await Speech.isSpeakingAsync();
          if (!speaking && lastText === text) {
            Speech.stop();
            Speech.speak(text, opts);
          }
        } catch (e) {}
      }, 260);
    }, 140);
  } catch (e) {}
}

export function stopSpeech() {
  try {
    lastText = null;
    if (pending) { clearTimeout(pending); pending = null; }
    Speech.stop();
  } catch (e) {}
}
