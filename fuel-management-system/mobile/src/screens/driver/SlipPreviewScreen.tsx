import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { Screen, ScreenHeader } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ProgressBar } from '../../components/Loading';
import { ErrorState, InfoBanner } from '../../components/Feedback';
import { processSlip } from '../../services/ocrService';
import { ApiError } from '../../services/api';
import { getErrorMessage } from '../../services/fuelService';
import { OcrProcessResponse } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';
import { formatBytes, PickedFile } from '../../utils/pickers';
import { colors, radius, spacing } from '../../theme';

type Route = RouteProp<RootStackParamList, 'SlipPreview'>;
type NavProps = NativeStackScreenProps<RootStackParamList, 'SlipPreview'>;

type Phase = 'idle' | 'uploading' | 'processing' | 'error';

export default function SlipPreviewScreen({ route }: NavProps): JSX.Element {
  const navigation = useNavigation<NavProps['navigation']>();
  const { file } = route.params as unknown as { file: PickedFile } extends never ? never : { file: PickedFile };

  const [currentUri, setCurrentUri] = useState(file.uri);
  const [rotation, setRotation] = useState(0);
  const [rotating, setRotating] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const rotate = async (): Promise<void> => {
    if (rotating) return;
    const next = (rotation + 90) % 360;
    setRotating(true);
    try {
      if (next === 0) {
        setCurrentUri(file.uri);
        setRotation(0);
      } else {
        const result = await ImageManipulator.manipulateAsync(
          file.uri,
          [{ rotate: next }],
          { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
        );
        setCurrentUri(result.uri);
        setRotation(next);
      }
    } catch {
      Alert.alert('Rotation failed', 'The image could not be rotated. You can continue without rotating.');
    } finally {
      setRotating(false);
    }
  };

  const startProcessing = async (): Promise<void> => {
    setError(null);
    setProgress(0);
    setPhase('uploading');
    try {
      const data: OcrProcessResponse = await processSlip(
        { ...file, uri: currentUri },
        (phaseUpdate, percent) => {
          if (phaseUpdate === 'uploading') {
            setPhase('uploading');
            setProgress(percent ?? 0);
          } else {
            setPhase('processing');
          }
        }
      );
      setPhase('idle');
      // Replace (not push) so the preview screen is not in the back stack.
      navigation.replace('OcrReview', { file: { ...file, uri: currentUri }, ocr: data });
    } catch (err) {
      setPhase('error');
      setError(
        err instanceof ApiError
          ? err.message
          : getErrorMessage(err)
      );
    }
  };

  const busy = phase === 'uploading' || phase === 'processing';

  return (
    <Screen>
      <ScreenHeader title="Preview Slip" subtitle="Check the photo before extracting data" />

      <Card style={styles.previewCard}>
        {file.kind === 'image' ? (
          <>
            <Image source={{ uri: currentUri }} style={styles.image} resizeMode="contain" />
            <View style={styles.previewFooter}>
              <Text style={styles.fileMeta}>{formatBytes(file.size)} • JPG</Text>
              <Button
                title={rotating ? 'Rotating…' : 'Rotate 90°'}
                variant="secondary"
                onPress={rotate}
                loading={rotating}
                style={styles.rotateButton}
                icon={<Ionicons name="sync-outline" size={16} color={colors.primary} />}
              />
            </View>
          </>
        ) : (
          <View style={styles.pdfCard}>
            <View style={styles.pdfIcon}>
              <Ionicons name="document-text-outline" size={28} color={colors.danger} />
            </View>
            <Text style={styles.pdfName} numberOfLines={2}>
              {file.name}
            </Text>
            <Text style={styles.pdfMeta}>PDF slip • {formatBytes(file.size)}</Text>
          </View>
        )}
      </Card>

      <InfoBanner
        tone="warning"
        message="Tips: keep the slip flat and well-lit, and let it fill the frame — clear photos give much better OCR results."
      />

      {phase === 'uploading' ? (
        <View style={styles.progressWrap}>
          <Text style={styles.progressLabel}>Uploading slip… {progress}%</Text>
          <ProgressBar progress={progress} />
        </View>
      ) : null}

      {phase === 'processing' ? (
        <View style={styles.progressWrap}>
          <Text style={styles.progressLabel}>Upload complete — reading slip details…</Text>
          <ProgressBar progress={100} />
        </View>
      ) : null}

      {phase === 'error' && error ? <ErrorState message={error} onRetry={startProcessing} /> : null}

      <Button
        title="Continue — Extract Details"
        onPress={startProcessing}
        loading={busy}
        disabled={phase === 'error' || rotating}
        style={styles.cta}
      />
      <Button
        title="Choose a different slip"
        variant="ghost"
        onPress={() => navigation.goBack()}
        disabled={busy}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  previewCard: {
    marginBottom: spacing.lg
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: radius.md,
    backgroundColor: '#00000008'
  },
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md
  },
  fileMeta: {
    fontSize: 12,
    color: colors.muted
  },
  rotateButton: {
    minHeight: 40,
    paddingHorizontal: spacing.lg
  },
  pdfCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl
  },
  pdfIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md
  },
  pdfName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center'
  },
  pdfMeta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4
  },
  progressWrap: {
    marginBottom: spacing.lg
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6
  },
  cta: {
    marginBottom: spacing.md
  }
});