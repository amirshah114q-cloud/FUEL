import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { ComponentProps } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

type ToastTone = 'success' | 'error' | 'info';
type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const TONE_STYLE: Record<ToastTone, { icon: IoniconName; bg: string; border: string; text: string }> = {
  success: { icon: 'checkmark-circle', bg: colors.successSoft, border: colors.success, text: colors.success },
  error: { icon: 'alert-circle', bg: colors.dangerSoft, border: colors.danger, text: colors.danger },
  info: { icon: 'information-circle', bg: colors.infoSoft, border: colors.info, text: colors.info }
};

function ToastView({ toast }: { toast: ToastItem }): JSX.Element {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true
    }).start();
  }, [opacity]);

  const tone = TONE_STYLE[toast.tone];
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.toast, { backgroundColor: tone.bg, borderLeftColor: tone.border, opacity }]}
    >
      <Ionicons name={tone.icon} size={20} color={tone.text} />
      <Text style={[styles.message, { color: tone.text }]} numberOfLines={3}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}

let nextId = 1;

const ToastContext = createContext<ToastApi | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number): void => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone): void => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-2), { id, message, tone }]); // max 3 stacked
      setTimeout(() => dismiss(id), 3400);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error'),
      info: (message) => show(message, 'info')
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <View style={[styles.overlay, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastView key={toast.id} toast={toast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    paddingHorizontal: spacing.lg,
    alignItems: 'stretch'
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    padding: spacing.md,
    minHeight: 48,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18
  }
});