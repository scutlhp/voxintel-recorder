import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  duration?: number;
  onTimeUpdate?: (currentTime: number) => void;
  seekToTime?: number | null;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  duration: initialDuration = 0,
  onTimeUpdate,
  seekToTime,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    if (seekToTime !== null && seekToTime !== undefined && audioRef.current) {
      audioRef.current.currentTime = seekToTime;
      setCurrentTime(seekToTime);
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  }, [seekToTime]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const skipSeconds = (delta: number) => {
    if (!audioRef.current) return;
    const target = Math.max(0, Math.min(duration, audioRef.current.currentTime + delta));
    audioRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
    setCurrentTime(val);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2.0];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-zinc-900 text-white rounded-2xl p-4 shadow-lg border border-zinc-800">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => {
          if (!audioRef.current) return;
          const cur = audioRef.current.currentTime;
          setCurrentTime(cur);
          onTimeUpdate?.(cur);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && audioRef.current.duration) {
            setDuration(audioRef.current.duration);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />
      <div className="space-y-1.5 mb-3">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={handleSliderChange}
          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
        />
        <div className="flex justify-between text-[11px] font-mono text-zinc-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => skipSeconds(-15)} className="p-2 text-zinc-400 hover:text-white">
            <RotateCcw size={16} />
          </button>
          <button
            onClick={togglePlay}
            className="w-10 h-10 flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white rounded-full active:scale-95 shadow-md"
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} className="ml-0.5" fill="currentColor" />}
          </button>
          <button onClick={() => skipSeconds(15)} className="p-2 text-zinc-400 hover:text-white">
            <RotateCw size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cyclePlaybackRate} className="px-2 py-1 text-xs font-mono bg-zinc-800 rounded-md">
            {playbackRate}x
          </button>
          <button onClick={toggleMute} className="p-2 text-zinc-400 hover:text-white">
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};
