import { Audio } from 'expo-av';

let sound = null;
let playToken = 0; // increments each play; stale callbacks are ignored

// Play a single remote mp3 URL. Stops any previous playback.
export async function playUrl(url, onFinish) {
  await stopAudio();
  const myToken = ++playToken;
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound: s } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true }
    );
    // If a newer play started while we were loading, discard this one.
    if (myToken !== playToken) {
      try { await s.unloadAsync(); } catch {}
      return;
    }
    sound = s;
    s.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish && myToken === playToken) {
        onFinish && onFinish();
        // auto-cleanup
        if (sound === s) { sound = null; }
        try { s.unloadAsync(); } catch {}
      }
    });
  } catch (e) {
    // playback failed silently
  }
}

export async function stopAudio() {
  playToken++; // invalidate any pending finish callbacks
  const s = sound;
  sound = null;
  if (s) {
    try { await s.stopAsync(); } catch {}
    try { await s.unloadAsync(); } catch {}
  }
}

export function isPlaying() {
  return sound != null;
}
