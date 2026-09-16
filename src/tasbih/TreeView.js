import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Image as RNImage, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';
import { TREE_ASSETS } from './assets';
import { resolveStageAsset, STAGES } from './model';
import { ENVIRONMENT } from '../constants/environmentTheme';

const Artwork = memo(function Artwork({ asset }) {
  if (!asset) return <View style={styles.empty} />;
  if (asset.xml) return <SvgXml xml={asset.xml} width="100%" height="100%" />;
  if (asset.layers) return asset.layers.map((layer, index) => <View key={index} style={StyleSheet.absoluteFill}><Artwork asset={layer} /></View>);
  return <Image source={asset.source} contentFit="contain" style={[StyleSheet.absoluteFill, {
    transformOrigin: '50% 90%', transform: [{ scale: asset.scale ?? 1 }],
  }]} />;
});

export default memo(function TreeView({ stageId, pulse, reduceMotion }) {
  const asset = resolveStageAsset(stageId, TREE_ASSETS);
  const [oldAsset, setOldAsset] = useState(null);
  const previous = useRef(asset);
  const crossfade = useRef(new Animated.Value(1)).current;
  const sway = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (previous.current === asset) return undefined;
    setOldAsset(previous.current);
    previous.current = asset;
    crossfade.setValue(0);
    const animation = Animated.timing(crossfade, { toValue: 1, duration: reduceMotion ? 300 : ENVIRONMENT.stageTransitionMs, useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) setOldAsset(null); });
    return () => animation.stop();
  }, [asset, crossfade, reduceMotion]);
  useEffect(() => {
    const nextStage = STAGES[STAGES.findIndex(s => s.id === stageId) + 1];
    const next = nextStage && TREE_ASSETS[nextStage.assetName];
    if (next?.source) {
      const uri = RNImage.resolveAssetSource?.(next.source)?.uri
        || (typeof next.source === 'string' ? next.source : next.source?.uri);
      if (uri) Image.prefetch(uri).catch(() => {});
    }
  }, [stageId]);
  useEffect(() => {
    if (reduceMotion || !pulse) { sway.setValue(0); return undefined; }
    const animation = Animated.sequence([
      Animated.timing(sway, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.spring(sway, { toValue: 0, damping: 14, stiffness: 240, mass: 0.4, useNativeDriver: true }),
    ]);
    sway.stopAnimation(); sway.setValue(0); animation.start();
    return () => animation.stop();
  }, [pulse, reduceMotion, sway]);
  const direction = pulse % 2 ? 1 : -1;
  const variant = pulse % 4;
  return (
    <Animated.View pointerEvents="none" style={[styles.tree, {
      transformOrigin: `${ENVIRONMENT.treeAnchor.x * 100}% ${ENVIRONMENT.treeAnchor.y * 100}%`,
      transform: [
        { rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${variant < 2 ? direction * 0.6 : 0}deg`] }) },
        { scale: sway.interpolate({ inputRange: [0, 1], outputRange: [1, variant === 2 ? 1.004 : 0.998] }) },
        { translateY: sway.interpolate({ inputRange: [0, 1], outputRange: [0, variant === 3 ? -0.8 : 0] }) },
      ],
    }]}>
      {oldAsset && <Animated.View style={[StyleSheet.absoluteFill, { opacity: Animated.subtract(1, crossfade) }]}><Artwork asset={oldAsset} /></Animated.View>}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: crossfade }]}><Artwork asset={asset} /></Animated.View>
    </Animated.View>
  );
});
const styles = StyleSheet.create({
  tree: { width: '100%', height: '100%' },
  empty: { position: 'absolute', bottom: '10%', left: '40%', width: '20%', height: 3, borderRadius: 2, backgroundColor: 'rgba(180,190,170,0.3)' },
});
