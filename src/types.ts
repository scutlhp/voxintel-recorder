export interface TranscriptSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  wallClockTime?: string;
  confidence?: number;
}

export interface Recording {
  id: string;
  userId: string;
  title?: string;
  startTime: string;
  endTime: string;
  duration: number;
  transcript: string;
  diarization?: TranscriptSegment[];
  tags?: string[];
  isProcessed: boolean;
  audioBase64?: string;
  audioUrl?: string;
  summary?: string;
  keyPoints?: string[];
  decisions?: string[];
  actionItems?: string[];
  sparseMode?: boolean;
  textOnlyMode?: boolean;
}

export interface Speaker {
  id: string;
  userId: string;
  name: string;
  color: string;
  sampleCount: number;
  isRegistered: boolean;
  isMaster?: boolean;
  sampleUrl?: string;
  createdAt: string;
}

export interface UserSettings {
  vadSensitivity: 'low' | 'medium' | 'high';
  audioQuality: 'standard' | 'high';
  autoUpload: 'always' | 'wifi-only' | 'never';
  enableLiveTranscription: boolean;
  minSegmentDuration: number;
  autoListenMode?: boolean;
  silenceThresholdSeconds?: number;
}
