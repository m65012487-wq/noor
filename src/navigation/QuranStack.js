import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import QuranScreen from '../screens/QuranScreen';
import SurahReaderScreen from '../screens/SurahReaderScreen';

const Stack = createNativeStackNavigator();

export default function QuranStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SurahList" component={QuranScreen} />
      <Stack.Screen name="SurahReader" component={SurahReaderScreen} />
    </Stack.Navigator>
  );
}
