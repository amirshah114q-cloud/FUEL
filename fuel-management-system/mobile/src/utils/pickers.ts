import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // must match backend MAX_FILE_SIZE_MB

export type SlipKind = 'image' | 'pdf';

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
  kind: SlipKind;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function checkSize(size: number | undefined): void {
  if (size && size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `This file is too large (${formatBytes(size)}). The maximum slip size is 10 MB.`
    );
  }
}

/**
 * Returns null when the user cancels (not an error).
 * Throws Error with a user-friendly message on permission denial / oversize.
 */
export async function pickFromCamera(): Promise<PickedFile | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      'Camera permission is required to photograph slips. Please enable it in your phone settings.'
    );
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
    allowsEditing: false,
    exif: false
  });
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  checkSize(asset.fileSize);
  const name = asset.fileName?.toLowerCase().endsWith('.png') ? asset.fileName : `slip-${Date.now()}.jpg`;
  const mimeType =
    asset.mimeType && asset.mimeType.startsWith('image/') ? asset.mimeType : 'image/jpeg';
  return { uri: asset.uri, name, mimeType, size: asset.fileSize ?? 0, kind: 'image' };
}

export async function pickFromGallery(): Promise<PickedFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      'Gallery permission is required to pick a slip photo. Please enable it in your phone settings.'
    );
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
    allowsEditing: false,
    exif: false
  });
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  checkSize(asset.fileSize);
  const name = asset.fileName?.toLowerCase().endsWith('.png') ? asset.fileName : `slip-${Date.now()}.jpg`;
  const mimeType =
    asset.mimeType && asset.mimeType.startsWith('image/') ? asset.mimeType : 'image/jpeg';
  return { uri: asset.uri, name, mimeType, size: asset.fileSize ?? 0, kind: 'image' };
}

/**
 * PDF picking. `copyToCacheDirectory: true` copies content:// URIs into the
 * app cache as real files — this is what guarantees the slip is never lost
 * if the network fails (the cache copy is retried until the upload succeeds).
 */
export async function pickPdf(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true
  });
  if (result.canceled || !result.assets?.length) return null;

  const doc = result.assets[0];
  checkSize(doc.size);
  const name = doc.name?.toLowerCase().endsWith('.pdf') ? doc.name : `${doc.name ?? 'slip'}.pdf`;
  return { uri: doc.uri, name, mimeType: 'application/pdf', size: doc.size ?? 0, kind: 'pdf' };
}