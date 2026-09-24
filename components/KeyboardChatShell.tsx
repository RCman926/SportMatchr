import { useEffect, useState, type ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type ViewportBox = {
  height: number;
  offsetTop: number;
  keyboardInset: number;
  open: boolean;
};

/**
 * Pins chat UI to the *visible* viewport on mobile web.
 * Uses visualViewport top + height (not translateY) so the composer
 * stays above the soft keyboard on iPhone/Android browsers.
 */
function usePinnedViewport(): ViewportBox {
  const [box, setBox] = useState<ViewportBox>(() => ({
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    offsetTop: 0,
    keyboardInset: 0,
    open: false,
  }));

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const vv = window.visualViewport;
    let raf = 0;

    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const layoutH = window.innerHeight;
        const height = Math.round(vv?.height ?? layoutH);
        const offsetTop = Math.round(vv?.offsetTop ?? 0);
        // Prefer viewport-relative keyboard size; fall back to layout delta
        const keyboardInset = Math.max(0, layoutH - height - offsetTop);
        setBox({
          height: height > 0 ? height : layoutH,
          offsetTop,
          keyboardInset,
          open: keyboardInset > 40,
        });
      });
    };

    measure();
    vv?.addEventListener('resize', measure);
    vv?.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    window.addEventListener('focusin', measure);
    window.addEventListener('focusout', measure);

    const prevOverflow = document.body.style.overflow;
    const prevPos = document.body.style.position;
    const prevWidth = document.body.style.width;
    const prevTop = document.body.style.top;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = '0';

    return () => {
      cancelAnimationFrame(raf);
      vv?.removeEventListener('resize', measure);
      vv?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      window.removeEventListener('focusin', measure);
      window.removeEventListener('focusout', measure);
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPos;
      document.body.style.width = prevWidth;
      document.body.style.top = prevTop;
    };
  }, []);

  return box;
}

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onKeyboardChange?: (open: boolean, inset: number) => void;
};

export function KeyboardChatShell({ children, style, onKeyboardChange }: Props) {
  const box = usePinnedViewport();

  useEffect(() => {
    onKeyboardChange?.(box.open, box.keyboardInset);
  }, [box.open, box.keyboardInset, onKeyboardChange]);

  if (Platform.OS !== 'web') {
    return <View style={[styles.fill, style]}>{children}</View>;
  }

  return (
    <View
      style={[
        styles.webPin,
        {
          position: 'fixed' as unknown as ViewStyle['position'],
          top: box.offsetTop,
          height: box.height || undefined,
        },
        style,
      ]}
    >
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  webPin: {
    left: 0,
    right: 0,
    width: '100%',
    backgroundColor: '#E4E7E2',
    overflow: 'hidden',
    zIndex: 50,
  },
  inner: {
    flex: 1,
    height: '100%',
    minHeight: 0,
    flexDirection: 'column',
  },
});
