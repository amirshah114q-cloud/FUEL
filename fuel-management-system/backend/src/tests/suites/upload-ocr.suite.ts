import assert from 'node:assert/strict';
import { describe, it } from '../harness';
import { Envelope, loginAs, makeFileForm, request, TINY_PNG } from '../http';

describe('Slip uploads & OCR', () => {
  it('accepts a PNG slip upload from a driver', async () => {
    const token = await loginAs('driver');
    const res = await request<Envelope<{ filePath: string; fileUrl: string }>>(
      '/api/fuel/upload-slip',
      { method: 'POST', token, form: makeFileForm(TINY_PNG, 'test-slip.png', 'image/png') }
    );
    assert.equal(res.status, 201);
    assert.match(res.json?.data?.filePath ?? '', /^\/uploads\//);
    assert.ok(res.json?.data?.fileUrl);
  });

  it('rejects disallowed file types (executable)', async () => {
    const token = await loginAs('driver');
    const res = await request('/api/fuel/upload-slip', {
      method: 'POST',
      token,
      form: makeFileForm(Buffer.from('MZ fake exe'), 'malware.exe', 'application/x-msdownload')
    });
    assert.equal(res.status, 400);
  });

  it('rejects disallowed MIME types regardless of extension', async () => {
    const token = await loginAs('driver');
    const res = await request('/api/fuel/upload-slip', {
      method: 'POST',
      token,
      form: makeFileForm(Buffer.from('plain text'), 'fake.jpg', 'text/plain')
    });
    assert.equal(res.status, 400);
  });

  it('rejects files above the size limit', async () => {
    const token = await loginAs('driver');
    const oversized = Buffer.alloc(11 * 1024 * 1024, 1);
    const res = await request('/api/fuel/upload-slip', {
      method: 'POST',
      token,
      form: makeFileForm(oversized, 'big.png', 'image/png')
    });
    assert.equal(res.status, 413);
  });

  it('requires an attached file', async () => {
    const token = await loginAs('driver');
    const res = await request('/api/fuel/upload-slip', { method: 'POST', token, form: new FormData() });
    assert.equal(res.status, 400);
  });

  it('processes a slip through OCR and never hard-fails (soft-fail design)', async () => {
    const token = await loginAs('driver');
    // First run may take 10–30 s while Tesseract downloads the English model.
    const res = await request<
      Envelope<{
        filePath: string;
        ocr: {
          fields: Record<string, unknown>;
          rawText: string;
          confidence: number | null;
          provider: string;
          warnings: string[];
        };
      }>
    >('/api/ocr/process', {
      method: 'POST',
      token,
      form: makeFileForm(TINY_PNG, 'ocr-slip.png', 'image/png'),
      timeoutMs: 120000
    });
    assert.equal(res.status, 200);
    assert.match(res.json?.data?.filePath ?? '', /^\/uploads\//);
    const ocr = res.json?.data?.ocr;
    assert.ok(ocr, 'expected an ocr block');
    assert.equal(typeof ocr?.fields, 'object');
    assert.ok(Array.isArray(ocr?.warnings));
    assert.ok(['tesseract', 'google-vision', 'pdf-text'].includes(ocr?.provider ?? ''));
  });
});