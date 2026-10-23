import React, { useState, useRef, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import {
  ChevronLeft,
  RotateCcw,
  RotateCw,
  Play,
  Pause,
  MessageSquare,
  MoreHorizontal,
  FileText,
  Download,
  Trash2,
  FileDown,
  Check,
  Sparkles,
  Users,
  Clock,
  Target,
  ListChecks,
  Quote,
  Pencil,
  Search,
  Tag,
} from 'lucide-react';
import { Recording, TranscriptSegment } from '../types';
import { downloadAudioFile } from '../lib/audioUtils';

interface RecordingDetailProps {
  recording: Recording;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (recording: Recording) => void;
}

export const RecordingDetail: React.FC<RecordingDetailProps> = ({
  recording,
  onClose,
  onDelete,
  onUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<'raw' | 'quick' | 'summary'>('raw');
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(recording.duration || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioSrc = recording.audioUrl || recording.audioBase64 || '';

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-white text-zinc-900 flex flex-col select-none">
      {audioSrc && <audio ref={audioRef} src={audioSrc} preload="metadata" playsInline />}
      <header className="px-4 py-3 pt-[max(12px,env(safe-area-inset-top,24px))] flex items-center justify-between border-b border-zinc-100 bg-white">
        <button onClick={onClose} className="p-1 -ml-1 text-zinc-700">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-6">
          <button onClick={() => setActiveTab('raw')} className={`text-base ${activeTab === 'raw' ? 'font-bold' : 'text-zinc-400'}`}>原文</button>
          <button onClick={() => setActiveTab('quick')} className={`text-base ${activeTab === 'quick' ? 'font-bold' : 'text-zinc-400'}`}>速览</button>
          <button onClick={() => setActiveTab('summary')} className={`text-base ${activeTab === 'summary' ? 'font-bold' : 'text-zinc-400'}`}>纪要</button>
        </div>
        <div className="w-8" />
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-white">
        <div className="text-xs text-zinc-400">
          {format(new Date(recording.startTime), 'yyyy年MM月dd日 HH:mm')}
        </div>
        {activeTab === 'raw' && (
          <div className="space-y-4">
            {recording.diarization?.map((seg, i) => (
              <div key={i} className="space-y-1">
                <span className="text-xs font-mono text-zinc-400">{formatTime(seg.startTime)}</span>
                <p className="text-base text-zinc-900">{seg.text}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
