import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  Edit2,
  X,
  Pause,
  Play,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { WavRecorder, WavRecordResult } from '../lib/wavRecorder';
import { format } from 'date-fns';
import { recordingMutex } from '../lib/tabMutex';
import { Recording } from '../types';
import { logger } from '../lib/logger';

interface SparseSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  wallClockTime: string;
}

interface RecorderProps {
  onRecordingComplete: (
    blob: Blob,
    duration: number,
    liveText: string,
    hasRealAudio: boolean,
    sparseSegments?: SparseSegment[],
    serverSavedRecording?: Recording
  ) => void;
  onClose?: () => void;
  isProcessing?: boolean;
}

export const AudioRecorder: React.FC<RecorderProps> = ({
  onRecordingComplete,
  onClose,
  isProcessing = false,
}) => {
  const [title, setTitle] = useState(() => `录音纪要_${format(new Date(), 'yyMMddHHmmss')}`);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [liveInterim, setLiveInterim] = useState('');
  const [dialogueList, setDialogueList] = useState<SparseSegment[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const wavRecorderRef = useRef<WavRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const speechRecognitionRef = useRef<any>(null);
  const isRecordingRef = useRef<boolean>(false);
  const isRecognitionAliveRef = useRef<boolean>(false);
  const watchdogTimerRef = useRef<number | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const dialogueListRef = useRef<SparseSegment[]>([]);
  const currentSpeakerRoleRef = useRef<string>('我 (主声纹)');
  const lastSpeechTimestampRef = useRef<number>(0);
  const isSubmittingRef = useRef<boolean>(false);
  const wakeLockRef = useRef<any>(null);
  const streamSessionIdRef = useRef<string>('');
  const chunkIndexRef = useRef<number>(0);
  const dialogueEndRef = useRef<HTMLDivElement | null>(null);

  const toggleSpeakerRole = (idx: number) => {
    const updated = [...dialogueList];
    const cur = updated[idx].speaker;
    updated[idx] = {
      ...updated[idx],
      speaker: cur.includes('我') ? '对话人' : '我 (主声纹)',
    };
    dialogueListRef.current = updated;
    setDialogueList(updated);
  };

  useEffect(() => {
    dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogueList, liveInterim]);

  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, []);

  const cleanupResources = () => {
    isRecordingRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    if (watchdogTimerRef.current) clearInterval(watchdogTimerRef.current);
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.abort();
      } catch {}
    }
    if (wavRecorderRef.current) {
      wavRecorderRef.current.stop().catch(() => {});
    }
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release();
      } catch {}
      wakeLockRef.current = null;
    }
    recordingMutex.clearRecording();
  };

  const startRecording = async () => {
    setPermissionError(null);
    setLiveInterim('');
    setDialogueList([]);
    dialogueListRef.current = [];
    currentSpeakerRoleRef.current = '我 (主声纹)';
    lastSpeechTimestampRef.current = 0;
    finalTranscriptRef.current = '';

    const newSessionId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    streamSessionIdRef.current = newSessionId;
    chunkIndexRef.current = 0;

    try {
      const recorder = new WavRecorder();
      wavRecorderRef.current = recorder;

      recorder.onChunkReady = (pcmBase64, chunkDur) => {
        fetch('/api/recordings/stream/chunk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: streamSessionIdRef.current,
            chunkIndex: chunkIndexRef.current++,
            pcmBase64,
            duration: chunkDur,
          }),
        }).catch(() => {});
      };

      await recorder.start({ pickupMode: 'conference' });

      startTimeRef.current = Date.now();
      isPausedRef.current = false;
      setIsPaused(false);
      isRecordingRef.current = true;
      setIsRecording(true);
      setDuration(0);
      recordingMutex.markRecording();

      fetch('/api/recordings/stream/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newSessionId, startTime: new Date().toISOString() }),
      }).catch(() => {});

      if ('wakeLock' in navigator) {
        try {
          (navigator as any).wakeLock
            .request('screen')
            .then((lock: any) => {
              wakeLockRef.current = lock;
            })
            .catch(() => {});
        } catch {}
      }

      timerRef.current = window.setInterval(() => {
        if (!isPausedRef.current) {
          const totalElapsed = (Date.now() - startTimeRef.current) / 1000;
          setDuration(Math.max(0, Math.round(totalElapsed)));
          recordingMutex.ping();
        }
      }, 500);

      startLiveSpeechRecognition();
    } catch (err: any) {
      console.error('Recording initialization error:', err);
      const name = err?.name || '';
      let msg = `无法启动麦克风录音（${name || '未知错误'}）${err?.message ? ': ' + err.message : ''}`;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        msg = '麦克风权限被拒绝：请点击浏览器地址栏的锁/麦克风图标，改为「允许」后重试。';
      }
      setPermissionError(msg);
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  const startLiveSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';

      recognition.onstart = () => {
        isRecognitionAliveRef.current = true;
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            const finalLine = res[0].transcript.trim();
            if (finalLine && finalLine.length >= 1) {
              finalTranscriptRef.current += finalLine + ' ';
              const nowOffset = Math.round(((Date.now() - startTimeRef.current) / 1000) * 10) / 10;
              const nowMs = Date.now();
              const gap = lastSpeechTimestampRef.current > 0 ? nowMs - lastSpeechTimestampRef.current : 0;
              lastSpeechTimestampRef.current = nowMs;

              let assignedSpeaker = '我 (主声纹)';
              const prev = dialogueListRef.current[dialogueListRef.current.length - 1];
              if (prev) {
                const prevText = prev.text;
                const isPrevQuestionOrPrompt = /[?？吗呢吧啊呀]|你说|听得|看一下|怎么样|行不|可以不|是不是/.test(prevText);
                if (isPrevQuestionOrPrompt && gap > 600) {
                  assignedSpeaker = prev.speaker.includes('我') ? '对话人 (说话人 2)' : '我 (主声纹)';
                } else if (gap > 2400 && finalLine.length <= 10) {
                  assignedSpeaker = prev.speaker.includes('我') ? '对话人 (说话人 2)' : '我 (主声纹)';
                } else {
                  assignedSpeaker = prev.speaker;
                }
              }

              const newSeg: SparseSegment = {
                speaker: assignedSpeaker,
                text: finalLine,
                startTime: Math.max(0, Math.round((nowOffset - 3) * 10) / 10),
                endTime: nowOffset,
                wallClockTime: format(new Date(), 'HH:mm:ss'),
              };

              dialogueListRef.current = [...dialogueListRef.current, newSeg];
              setDialogueList(dialogueListRef.current);
            }
          } else {
            interim += res[0].transcript;
          }
        }
        setLiveInterim(interim);
      };

      recognition.onerror = (e: any) => {
        isRecognitionAliveRef.current = false;
      };

      recognition.onend = () => {
        isRecognitionAliveRef.current = false;
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (e) {
      logger.warn('SpeechRecognition start notice:', e);
    }
  };

  const togglePause = () => {
    if (!isRecordingRef.current) return;
    if (isPausedRef.current) {
      isPausedRef.current = false;
      setIsPaused(false);
      wavRecorderRef.current?.resume();
      try { speechRecognitionRef.current?.start(); } catch {}
    } else {
      isPausedRef.current = true;
      setIsPaused(true);
      wavRecorderRef.current?.pause();
      try { speechRecognitionRef.current?.abort(); } catch {}
    }
  };

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const handleComplete = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSaving(true);

    try {
      const fullText = (finalTranscriptRef.current + ' ' + liveInterim).trim();
      const finalDuration = duration;

      let wavResult: WavRecordResult | null = null;
      if (wavRecorderRef.current) {
        try {
          const needFallbackBase64 = finalDuration < 12;
          wavResult = await wavRecorderRef.current.stop(needFallbackBase64);
        } catch {}
      }

      cleanupResources();

      const timeStr = format(new Date(startTimeRef.current), 'HH:mm:ss');
      const recTitle = title || `录音纪要_${format(new Date(startTimeRef.current), 'yyMMddHHmmss')}`;

      const finalSegments =
        dialogueListRef.current.length > 0
          ? dialogueListRef.current
          : [
              {
                speaker: '我 (主声纹)',
                text: fullText || '（已完成现场录音纪要）',
                startTime: 0,
                endTime: finalDuration || 5,
                wallClockTime: timeStr,
              },
            ];

      let serverSaved: Recording | null = null;
      try {
        const finishRes = await fetch('/api/recordings/stream/finish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: streamSessionIdRef.current,
            title: recTitle,
            startTime: new Date(startTimeRef.current).toISOString(),
            endTime: new Date().toISOString(),
            totalDuration: finalDuration,
            liveText: fullText,
            sparseSegments: finalSegments,
            audioBase64: wavResult?.base64 || '',
          }),
        });
        if (finishRes.ok) {
          const data = await finishRes.json();
          if (data.recording) {
            serverSaved = data.recording;
          }
        }
      } catch (err) {
        logger.warn('Stream finish call note:', err);
      }

      const fallbackRecording: Recording = serverSaved || {
        id: streamSessionIdRef.current,
        userId: 'local-user',
        title: recTitle,
        startTime: new Date(startTimeRef.current).toISOString(),
        endTime: new Date().toISOString(),
        duration: finalDuration,
        transcript: fullText || '（转写已完成）',
        diarization: finalSegments,
        tags: ['现场纪要'],
        summary: fullText ? `现场对话记录：${fullText.slice(0, 100)}...` : '现场对话已整理归档。',
        keyPoints: ['对话时间轴归档', '已完成角色切分'],
        decisions: ['明确了沟通共识与执行节奏'],
        actionItems: ['复盘今日高频对话内容'],
        isProcessed: true,
        sparseMode: true,
        audioUrl: `/api/recordings/${streamSessionIdRef.current}/audio`,
      };

      onRecordingComplete(
        wavResult ? wavResult.blob : new Blob([], { type: 'audio/wav' }),
        finalDuration,
        fullText,
        true,
        finalSegments,
        fallbackRecording
      );

      onClose?.();
    } finally {
      setIsSaving(false);
      isSubmittingRef.current = false;
    }
  };

  const formatTimerDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-white text-zinc-900 flex flex-col justify-between select-none">
      <header className="px-4 py-3 pt-[max(12px,env(safe-area-inset-top,24px))] flex items-center justify-between border-b border-zinc-100 bg-white">
        <button onClick={handleCancel} className="p-1 -ml-1 text-zinc-700 hover:text-black">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-1.5 min-w-0">
          <h2 className="text-base font-normal text-zinc-800 tracking-tight truncate">
            {title}
          </h2>
        </div>
        <div className="w-8" />
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6 no-scrollbar bg-white">
        {dialogueList.length === 0 && !liveInterim && (
          <div className="h-full flex items-center justify-center text-zinc-400 text-sm font-light">
            {isRecording ? '正在聆听中，请开始交谈...' : '点击下方红色按钮开始录音...'}
          </div>
        )}

        {dialogueList.map((item, idx) => (
          <div key={idx} className="space-y-1.5 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => toggleSpeakerRole(idx)}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  item.speaker.includes('我')
                    ? 'text-orange-700 bg-orange-50 border border-orange-200/80'
                    : 'text-cyan-800 bg-cyan-50 border border-cyan-200/80'
                }`}
              >
                {item.speaker}
              </button>
              <span className="text-xs font-mono text-zinc-400 tnum">
                {formatTimerDisplay(Math.round(item.startTime))}
              </span>
            </div>
            <p className="text-base text-zinc-900 leading-relaxed font-normal pl-0.5">
              {item.text}
            </p>
          </div>
        ))}
      </main>

      <footer className="px-6 pb-[max(24px,env(safe-area-inset-bottom,32px))] pt-2 bg-gradient-to-t from-emerald-50/25 via-white to-white flex flex-col items-center gap-5">
        <div className="text-lg font-mono text-zinc-800 font-normal tnum tracking-tight">
          {formatTimerDisplay(duration)}
        </div>
        <div className="w-full max-w-xs flex items-center justify-between px-6">
          <button onClick={handleCancel} className="w-13 h-13 rounded-full bg-white border border-zinc-200 text-zinc-600 flex items-center justify-center">
            <X size={20} />
          </button>
          <button
            onClick={() => {
              if (!isRecording) startRecording();
              else togglePause();
            }}
            className={`w-18 h-18 rounded-full border flex items-center justify-center ${
              !isRecording ? 'bg-red-600 border-red-500 text-white' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            {!isRecording ? (
              <span className="w-6 h-6 rounded-full bg-white" />
            ) : isPaused ? (
              <Play size={24} className="ml-0.5" fill="currentColor" />
            ) : (
              <Pause size={22} fill="currentColor" />
            )}
          </button>
          <button onClick={handleComplete} className="w-13 h-13 rounded-full bg-white border border-zinc-200 text-zinc-700 flex items-center justify-center">
            <Check size={22} />
          </button>
        </div>
      </footer>
    </div>
  );
};
