import React, { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface UploadOptionCardProps {
  icon: IoniconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  loading?: boolean;
}

export function UploadOptionCard({ icon, title, subtitle, onPress, loading }: UploadOptionCardProps): JSX.Element {
  return (
    <Pressable
      onPress={loading ? undefined : onPress}
      style={({ pressed }) => [styles.card, pressed && { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    minHeight: 84
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  texts: {
    flex: 1
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  }
});