import React from 'react';
import { format } from 'date-fns';
import { Users, ChevronRight, Play, Sparkles, Clock } from 'lucide-react';
import { Recording } from '../types';
import { motion } from 'motion/react';

interface RecordingCardProps {
  recording: Recording;
  onClick: () => void;
  isPlaying?: boolean;
}

export const RecordingCard: React.FC<RecordingCardProps> = ({
  recording,
  onClick,
  isPlaying,
}) => {
  const speakerSet = new Set<string>(recording.diarization?.map((d) => d.speaker) || []);
  const firstDialogue =
    recording.diarization && recording.diarization[0]
      ? `${recording.diarization[0].speaker}: “${recording.diarization[0].text}”`
      : recording.transcript;

  return (
    <motion.div
      whileHover={{ scale: 1.006 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl border p-4 transition-all duration-300 text-left cursor-pointer shadow-sm ${
        isPlaying
          ? 'bg-[#1C1B24] border-[#FF6A2B] shadow-[0_8px_24px_rgba(255,106,43,0.18)]'
          : 'bg-[#131318] border-white/8 hover:border-white/16 hover:bg-[#181820]'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-400 tnum flex items-center gap-1">
            <Clock size={11} className="text-zinc-500" />
            {format(new Date(recording.startTime), 'HH:mm')}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800/90 text-zinc-300 border border-white/5 tnum">
            {recording.duration}s
          </span>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-amber-400 transition-colors truncate mb-1">
        {recording.title || '无标题录音'}
      </h3>
      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
        {firstDialogue || '（无转写文字）'}
      </p>
    </motion.div>
  );
};
