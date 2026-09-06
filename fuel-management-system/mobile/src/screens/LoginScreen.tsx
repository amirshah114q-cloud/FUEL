import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { Button } from '../components/Button';
import { InfoBanner } from '../components/Feedback';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/fuelService';
import { colors, radius, spacing } from '../theme';

export default function LoginScreen(): JSX.Element {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (): Promise<void> => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      // Navigation switches automatically via AuthContext state.
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Ionicons name="speedometer-outline" size={34} color={colors.white} />
        </View>
        <Text style={styles.appName}>Fleet Fuel Manager</Text>
        <Text style={styles.tagline}>Medicine Distribution Fleet</Text>
      </View>

      {error ? <InfoBanner message={error} tone="error" /> : null}

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@company.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
      />

      <Button title="Log In" onPress={onSubmit} loading={submitting} />

      {__DEV__ ? (
        <View style={styles.devCard}>
          <Text style={styles.devTitle}>Development credentials</Text>
          <Text style={styles.devLine}>Admin — admin@fleet.dev / Admin@123</Text>
          <Text style={styles.devLine}>Accountant — accountant@fleet.dev / Account@123</Text>
          <Text style={styles.devLine}>Driver — ahmed.driver@fleet.dev / Driver@123</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text
  },
  tagline: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4
  },
  devCard: {
    marginTop: spacing.xxl,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.lg
  },
  devTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: 6
  },
  devLine: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18
  }
});