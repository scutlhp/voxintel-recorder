import { TranscriptSegment } from '../types';

export interface TranscriptionResult {
  title: string;
  transcript: string;
  diarization: TranscriptSegment[];
  summary: string;
  keyPoints: string[];
  tags: string[];
}

export async function transcribeAudio(
  audioBase64: string,
  mimeType: string,
  fallbackText = '',
  customApiKey = '',
  hasRealAudio = true,
  duration = 5
): Promise<TranscriptionResult> {
  const cleanBase64 = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
  const cleanMime = mimeType ? mimeType.split(';')[0] : 'audio/wav';

  try {
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64: cleanBase64,
        mimeType: cleanMime,
        fallbackText,
        duration,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && (data.transcript || data.diarization)) {
        return {
          title: data.title || `录音对白 (${Math.round(duration)}秒)`,
          transcript: data.transcript,
          summary: data.summary || '录音已完成智能提炼。',
          keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : ['语音转写已完成'],
          tags: Array.isArray(data.tags) ? data.tags : ['现场录音'],
          diarization: Array.isArray(data.diarization) ? data.diarization : [],
        };
      }
    }
  } catch (err) {
    console.warn('Server-side transcription endpoint error, falling back:', err);
  }

  const trimmed = fallbackText.trim();
  const durSec = Math.max(1, Math.round(duration));
  return {
    title: `实时转写 (${durSec}秒)`,
    transcript: trimmed || '（无语音）',
    summary: `捕捉到内容：${trimmed}`,
    keyPoints: ['端侧识别成功'],
    tags: ['实时语音'],
    diarization: [{ speaker: '我 (主声纹)', text: trimmed, startTime: 0, endTime: durSec }],
  };
}
