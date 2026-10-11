import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import QuranScreen from '../screens/QuranScreen';
import SurahReaderScreen from '../screens/SurahReaderScreen';

const Stack = createNativeStackNavigator();

export default function QuranStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SurahList" component={QuranScreen} />
      {/* Своя копия читалки на каждую суру (и отдельная — для пятничного чтения):
          без getId переход с вкладки намаза подменял бы params у уже открытой
          читалки, а текст на экране оставался бы от прежней суры. */}
      <Stack.Screen name="SurahReader" component={SurahReaderScreen}
        getId={({ params }) => `${params?.surah?.number}:${params?.friday ? 'friday' : ''}`} />
    </Stack.Navigator>
  );
}
