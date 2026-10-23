import React, { useState, useEffect, useMemo } from 'react';
import {
  Mic,
  Search,
  Settings as SettingsIcon,
  Users,
  History,
  Sparkles,
  Database,
  Radio,
  Plus,
  X,
  Volume2,
} from 'lucide-react';
import { AudioRecorder } from './components/Recorder';
import { RecordingCard } from './components/RecordingCard';
import { RecordingDetail } from './components/RecordingDetail';
import { Recording, Speaker, UserSettings } from './types';
import { StorageService, INITIAL_RECORDINGS } from './services/storage';
import { AnimatePresence, motion } from 'motion/react';
import { format, isToday, isYesterday } from 'date-fns';

export default function App() {
  const [activeTab, setActiveTab] = useState<'timeline' | 'speakers' | 'settings'>('timeline');
  const [recordings, setRecordings] = useState<Recording[]>(() => StorageService.getRecordings());
  const [speakers, setSpeakers] = useState<Speaker[]>(() => StorageService.getSpeakers());
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecorderModal, setShowRecorderModal] = useState(false);

  useEffect(() => {
    StorageService.fetchRecordings().then(setRecordings);
    StorageService.fetchSpeakers().then(setSpeakers);
  }, []);

  const handleRecordingComplete = async (
    blob: Blob,
    duration: number,
    liveText: string,
    hasRealAudio: boolean,
    sparseSegments?: any[],
    serverSavedRecording?: Recording
  ) => {
    setShowRecorderModal(false);
    if (serverSavedRecording) {
      const list = StorageService.getRecordings();
      const updated = [serverSavedRecording, ...list.filter((r) => r.id !== serverSavedRecording.id)];
      StorageService.saveRecordingsCache(updated);
      setRecordings(updated);
    }
  };

  const filteredRecordings = useMemo(() => {
    return recordings.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      return !q || r.title?.toLowerCase().includes(q) || r.transcript?.toLowerCase().includes(q);
    });
  }, [recordings, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex flex-col font-sans text-zinc-100 select-none pb-24">
      <header className="sticky top-0 bg-[#0A0A0C]/90 backdrop-blur-xl border-b border-white/8 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top,24px))] z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight">所有声音记忆</h1>
            <span className="text-[10px] text-zinc-400 font-mono">共 {recordings.length} 篇</span>
          </div>
          <button
            onClick={() => setShowRecorderModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6A2B] text-white rounded-xl text-xs font-semibold"
          >
            <Mic size={14} />
            <span>开始录音</span>
          </button>
        </div>
      </header>

      <main className="flex-grow p-4 max-w-xl w-full mx-auto space-y-3">
        {filteredRecordings.map((r) => (
          <RecordingCard key={r.id} recording={r} onClick={() => setSelectedRecording(r)} />
        ))}
      </main>

      <AnimatePresence>
        {showRecorderModal && (
          <AudioRecorder
            onRecordingComplete={handleRecordingComplete}
            onClose={() => setShowRecorderModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedRecording && (
          <RecordingDetail
            recording={selectedRecording}
            onClose={() => setSelectedRecording(null)}
            onDelete={(id) => {
              StorageService.deleteRecording(id);
              setRecordings(recordings.filter((x) => x.id !== id));
              setSelectedRecording(null);
            }}
            onUpdate={(u) => {
              StorageService.updateRecording(u);
              setRecordings(recordings.map((x) => (x.id === u.id ? u : x)));
              setSelectedRecording(u);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
