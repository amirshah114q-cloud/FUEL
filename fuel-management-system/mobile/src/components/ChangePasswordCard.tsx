import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { Button } from './Button';
import { TextField } from './TextField';
import { InfoBanner } from './Feedback';
import { useToast } from '../context/ToastContext';
import { changePassword } from '../services/authService';
import { getErrorMessage } from '../services/fuelService';
import { colors, spacing } from '../theme';

export function ChangePasswordCard(): JSX.Element {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (): Promise<void> => {
    setError(null);
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('The new password must be different from the current one.');
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOpen(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Pressable style={styles.headerRow} onPress={() => setOpen((v) => !v)}>
        <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
        <View style={styles.texts}>
          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.subtitle}>Update your login password</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </Pressable>

      {open ? (
        <View style={styles.form}>
          {error ? <InfoBanner message={error} tone="error" /> : null}
          <TextField
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
          />
          <TextField
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            hint="Minimum 8 characters"
          />
          <TextField
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          <Button title="Update Password" onPress={submit} loading={saving} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  texts: {
    flex: 1
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  form: {
    marginTop: spacing.lg
  }
});