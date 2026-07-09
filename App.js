import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Font from 'expo-font';
import * as Notifications from 'expo-notifications';

import GlassTabBar from './src/components/GlassTabBar';
import PrayerTimesScreen from './src/screens/PrayerTimesScreen';
import QiblaScreen from './src/screens/QiblaScreen';
import QuranStack from './src/navigation/QuranStack';
import ReadingScreen from './src/screens/ReadingScreen';
import { COLORS } from './src/constants/theme';
import { loadJSON, saveJSON } from './src/utils/helpers';
import { LanguageProvider, useLang } from './src/i18n/LanguageContext';
import { LocationProvider } from './src/utils/LocationContext';
import { QuranPrefsProvider } from './src/utils/QuranPrefsContext';
import { AppSettingsProvider } from './src/utils/AppSettingsContext';
import { AppearanceProvider } from './src/utils/AppearanceContext';

const Tab = createBottomTabNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

function Tabs() {
  const { t } = useLang();
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false, lazy: true }}
    >
      <Tab.Screen name="Prayer" component={PrayerTimesScreen} options={{ tabBarLabel: t('tab_prayer') }} />
      <Tab.Screen name="Qibla" component={QiblaScreen} options={{ tabBarLabel: t('tab_qibla') }} />
      <Tab.Screen name="Quran" component={QuranStack} options={{ tabBarLabel: t('tab_quran') }} />
      <Tab.Screen name="Read" component={ReadingScreen} options={{ tabBarLabel: t('tab_read') }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await Font.loadAsync({
          Amiri: require('./assets/fonts/Amiri-Regular.ttf'),
          'Amiri-Bold': require('./assets/fonts/Amiri-Bold.ttf'),
        });
      } catch (e) {}
      setFontsLoaded(true);
      await requestNotifPermission();
    })();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.navyDeep, justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  return (
    <LanguageProvider>
      <AppearanceProvider>
        <AppSettingsProvider>
          <LocationProvider>
            <QuranPrefsWrapper>
              <NavigationContainer>
                <Tabs />
              </NavigationContainer>
            </QuranPrefsWrapper>
          </LocationProvider>
        </AppSettingsProvider>
      </AppearanceProvider>
    </LanguageProvider>
  );
}

function QuranPrefsWrapper({ children }) {
  const { lang } = useLang();
  return <QuranPrefsProvider lang={lang}>{children}</QuranPrefsProvider>;
}

async function requestNotifPermission() {
  try { await Notifications.requestPermissionsAsync(); } catch (e) {}
}
