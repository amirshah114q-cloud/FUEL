import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, ScreenHeader } from '../../components/Screen';
import { UploadOptionCard } from '../../components/UploadOptionCard';
import { InfoBanner } from '../../components/Feedback';
import { Card } from '../../components/Card';
import { pickFromCamera, pickFromGallery, pickPdf, PickedFile } from '../../utils/pickers';
import { RootStackParamList } from '../../types/navigation';
import { colors, spacing } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'UploadSlip'>;
type PickKind = 'camera' | 'gallery' | 'pdf';

export default function UploadSlipScreen({ navigation }: Props): JSX.Element {
  const [busy, setBusy] = useState<PickKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePick = async (kind: PickKind): Promise<void> => {
    setError(null);
    setBusy(kind);
    try {
      let file: PickedFile | null = null;
      if (kind === 'camera') file = await pickFromCamera();
      else if (kind === 'gallery') file = await pickFromGallery();
      else file = await pickPdf();

      if (file) {
        navigation.navigate('SlipPreview', { file });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the selected file. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Upload Fuel Slip" subtitle="Choose how you'd like to add your slip" />

      {error ? <InfoBanner message={error} tone="error" /> : null}

      <UploadOptionCard
        icon="camera-outline"
        title="Take Photo"
        subtitle="Photograph the slip with your camera"
        onPress={() => handlePick('camera')}
        loading={busy === 'camera'}
      />
      <UploadOptionCard
        icon="images-outline"
        title="Choose from Gallery"
        subtitle="Pick an existing slip photo"
        onPress={() => handlePick('gallery')}
        loading={busy === 'gallery'}
      />
      <UploadOptionCard
        icon="document-text-outline"
        title="Upload PDF"
        subtitle="Select a PDF slip or invoice"
        onPress={() => handlePick('pdf')}
        loading={busy === 'pdf'}
      />

      <Card style={styles.noteCard}>
        <Text style={styles.noteTitle}>Supported formats</Text>
        <Text style={styles.noteText}>JPG • PNG • PDF — maximum size 10 MB.</Text>
        <Text style={styles.noteText}>
          After uploading, the system reads the slip automatically and shows every field for you to
          check and correct before saving.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  noteCard: {
    marginTop: spacing.xl,
    backgroundColor: colors.infoSoft,
    borderColor: 'transparent'
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.info,
    marginBottom: 6
  },
  noteText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18
  }
});