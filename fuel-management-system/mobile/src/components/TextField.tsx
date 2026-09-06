import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface TextFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  hint?: string;
  /** Amber highlight: OCR did not read this field — manual entry needed. */
  highlight?: boolean;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  suffix?: string;
  editable?: boolean;
  multiline?: boolean;
}

export function TextField({
  label,
  value,
  onChangeText,
  error,
  hint,
  highlight,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  secureTextEntry,
  suffix,
  editable = true,
  multiline = false
}: TextFieldProps): JSX.Element {
  const borderColor = error ? colors.danger : highlight ? colors.warning : colors.border;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, { borderColor }]}>
        <TextInput
          style={[styles.input, suffix ? { paddingRight: 64 } : null, multiline && { minHeight: 72, textAlignVertical: 'top' }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          secureTextEntry={secureTextEntry}
          editable={editable}
          multiline={multiline}
        />
        {suffix ? (
          <View style={styles.suffix}>
            <Text style={styles.suffixText}>{suffix}</Text>
          </View>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hint, highlight && { color: colors.warning, fontWeight: '600' }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6
  },
  inputWrap: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text
  },
  suffix: {
    position: 'absolute',
    right: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  suffixText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4
  }
});