import { API_BASE_URL } from '../config';
import { ApiError, getAuthToken } from './api';
import { OcrProcessResponse } from '../types/models';
import { PickedFile } from '../utils/pickers';

export type OcrPhase = 'uploading' | 'processing';

/**
 * Uploads the slip to POST /api/ocr/process and waits for OCR.
 *
 * Implemented with XMLHttpRequest (not fetch) because fetch has no upload
 * progress events on React Native — drivers in the field need to see the
 * upload percentage. After the upload reaches 100% the callback switches to
 * the 'processing' phase (OCR running server-side).
 *
 * The picked file is copied into the app cache by the pickers, so a network
 * failure never loses the slip — the caller can retry this call.
 */
export function processSlip(
  file: PickedFile,
  onPhase: (phase: OcrPhase, progress?: number) => void
): Promise<OcrProcessResponse> {
  return new Promise<OcrProcessResponse>((resolve, reject) => {
    const form = new FormData();
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType
    } as unknown as Blob);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/api/ocr/process`);
    const token = getAuthToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    // OCR on large phone photos can legitimately take 10–30 s.
    xhr.timeout = 180000;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        if (percent >= 100) onPhase('processing');
        else onPhase('uploading', percent);
      }
    };

    xhr.onload = () => {
      let json: { message?: string; errors?: Record<string, string[]>; data?: OcrProcessResponse } | null = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        json = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && json?.data) {
        resolve(json.data);
      } else {
        reject(
          new ApiError(
            json?.message ?? 'The slip could not be processed. Please try again.',
            xhr.status,
            json?.errors
          )
        );
      }
    };

    xhr.onerror = () => {
      reject(
        new ApiError(
          'Upload failed — check your internet connection and try again. Your slip is still saved on this screen.',
          0
        )
      );
    };

    xhr.ontimeout = () => {
      reject(new ApiError('The server took too long to respond. Please try again.', 0));
    };

    onPhase('uploading', 0);
    xhr.send(form);
  });
}