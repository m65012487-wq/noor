import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ENVIRONMENT } from '../constants/environmentTheme';
import { activeTree } from './model';

export default function EnvironmentDebug({ state, animation, label, anchor = true }) {
  if (!__DEV__ || !ENVIRONMENT.debug) return null;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.bounds]}>
    <Text style={styles.label}>{label} · {animation}{'\n'}{state && activeTree(state)?.species}:{state && activeTree(state)?.stage} · {state?.currentDhikrIndex}:{state?.currentDhikrCount}{'\n'}growth {state && activeTree(state)?.progress?.toFixed(2)}</Text>
    {anchor && <View style={[styles.anchor, { left: `${ENVIRONMENT.treeAnchor.x * 100}%`, top: `${ENVIRONMENT.treeAnchor.y * 100}%` }]} />}
  </View>;
}
const styles = StyleSheet.create({
  bounds: { borderColor: '#ff7777', borderWidth: 1, zIndex: 100 },
  label: { fontSize: 10, color: '#ffffff', backgroundColor: '#16352c', alignSelf: 'flex-start' },
  anchor: { position: 'absolute', width: 8, height: 8, marginLeft: -4, marginTop: -4, borderWidth: 1, borderColor: '#ffffff', borderRadius: 4 },
});
