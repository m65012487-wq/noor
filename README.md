# Noor — Islamic Companion App

Prayer times, Qibla compass, Quran learning, verse of the day, and a daily streak.
Built with React Native + Expo. Runs on iOS and Android.

---

## What you need (one-time setup on Windows)

1. **Node.js** — download the LTS version from https://nodejs.org and install it.
2. **VS Code** (recommended editor) — https://code.visualstudio.com
3. **Expo Go** on your iPhone — install from the App Store.

Make sure your computer and your iPhone are on the **same Wi-Fi network**.

---

## How to run

Open a terminal (PowerShell, or the terminal inside VS Code) in this project folder.

### 1. Create the Expo project shell (only the first time)
If you started from `npx create-expo-app namaz-app`, copy the files from this
package **into** that folder, replacing App.js. Then continue below.

### 2. Install dependencies
```
npm install
```

### 3. Add the Arabic font (optional but recommended)
Create a folder `assets/fonts/` and put these two files in it:
- `Amiri-Regular.ttf`
- `Amiri-Bold.ttf`

Download them free from Google Fonts: https://fonts.google.com/specimen/Amiri
(The app still runs without them — it falls back to the system font.)

### 4. Add image assets
Put your ChatGPT-generated images in the `assets/` folder:
- `icon.png` (1024x1024)
- `splash.png`
- `adaptive-icon.png`

### 5. Start it
```
npx expo start
```
A QR code appears. Open the **Camera** app on your iPhone, point it at the QR
code, and tap the banner. The app opens in Expo Go.

Edit any file and save — the app reloads instantly.

---

## Project structure
```
App.js                  -> navigation, fonts, notifications, streak logic
src/
  constants/
    theme.js            -> colors, spacing, fonts
    content.js          -> alphabet, surahs, verses
  utils/
    helpers.js          -> qibla math, API calls, storage
  components/
    ScreenWrapper.js    -> gradient background
    ui.js               -> Card, titles
  screens/
    PrayerTimesScreen.js
    QiblaScreen.js
    LearnScreen.js
    VerseScreen.js
    StreakScreen.js
```

---

## Publishing later (when ready)

You'll use **EAS Build** (cloud build — no Mac needed for iOS):
```
npm install -g eas-cli
eas login
eas build --platform ios
eas build --platform android
```
- Apple Developer account: $99/year
- Google Play Developer account: $25 one-time

---

## Notes
- Prayer times come from the free Aladhan API.
- The Qibla compass needs the magnetometer (your iPhone 15 Pro has one).
- Notifications fire daily at 8:00 PM (change in App.js -> scheduleDailyReminder).
- All progress is stored locally on the device via AsyncStorage.
