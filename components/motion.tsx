import { type ReactNode, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  LinearTransition,
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '../constants/motion';

export function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduce(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

export function enterUp(delay = 0) {
  return FadeInDown.duration(motion.enter)
    .delay(delay)
    .easing(motion.easeOut)
    .reduceMotion(ReduceMotion.System);
}

export function enterFade(delay = 0) {
  return FadeIn.duration(motion.enterFast)
    .delay(delay)
    .reduceMotion(ReduceMotion.System);
}

export const layoutSpring = LinearTransition.duration(280).reduceMotion(ReduceMotion.System);

export function FadeUp({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View entering={enterUp(delay)} style={style}>
      {children}
    </Animated.View>
  );
}

type PressScaleProps = {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link';
};

export function PressScale({
  children,
  onPress,
  disabled,
  style,
  accessibilityLabel,
  accessibilityRole = 'button',
}: PressScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const to = (value: number) => {
    scale.value = withSpring(value, {
      ...motion.spring,
      reduceMotion: ReduceMotion.System,
    });
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      onHoverIn={() => {
        if (Platform.OS === 'web' && !disabled) to(1.02);
      }}
      onHoverOut={() => to(1)}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={webPress as ViewStyle}
    >
      <Animated.View style={[animated, style]}>{children}</Animated.View>
    </Pressable>
  );
}

const webPress =
  Platform.OS === 'web'
    ? ({
        cursor: 'pointer',
        userSelect: 'none',
      } as ViewStyle)
    : undefined;

/** Living status pip — green ready / yellow online. */
export function PulseDot({
  color,
  size = 9,
}: {
  color: string;
  size?: number;
}) {
  const t = useSharedValue(0);
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    if (reduce) {
      t.value = 0;
      return;
    }
    t.value = withRepeat(
      withTiming(1, { duration: motion.pulse, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [reduce, t]);

  const ring = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [0.5, 0]),
    transform: [{ scale: interpolate(t.value, [0, 1], [1, 2.15]) }],
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size,
            backgroundColor: color,
          },
          ring,
        ]}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** Slow photo drift on heroes and game cards. Compact posters stay still. */
export function KenBurns({
  children,
  active,
}: {
  children: ReactNode;
  active: boolean;
}) {
  const reduce = usePrefersReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!active || reduce) {
      scale.value = 1;
      return;
    }
    scale.value = withRepeat(
      withTiming(1.08, {
        duration: motion.kenBurns,
        easing: Easing.inOut(Easing.sin),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true
    );
  }, [active, reduce, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!active || reduce) {
    return <View style={StyleSheet.absoluteFill}>{children}</View>;
  }

  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}
