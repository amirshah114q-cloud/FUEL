import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LoadingSpinner } from '../components/Loading';
import { Screen } from '../components/Screen';

export default function SplashScreen(): JSX.Element {
  return (
    <Screen scroll={false} style={styles.center}>
      <LoadingSpinner label="Signing you in…" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center'
  }
});