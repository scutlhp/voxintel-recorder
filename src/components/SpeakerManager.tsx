import React, { useState } from 'react';
import { User, Crown, Mic } from 'lucide-react';
import { Speaker } from '../types';

interface SpeakerManagerProps {
  speakers: Speaker[];
  onAddSpeaker: (name: string, isMaster?: boolean) => void;
  onUpdateSpeaker: (speaker: Speaker) => void;
  onDeleteSpeaker?: (id: string) => void;
  onSetMasterSpeaker?: (id: string) => void;
  onEnrollSample?: (id: string, audioBase64: string) => void;
}

export const SpeakerManager: React.FC<SpeakerManagerProps> = ({ speakers }) => {
  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h2 className="text-base font-bold text-white">声纹档案库</h2>
      <div className="space-y-2">
        {speakers.map((s) => (
          <div key={s.id} className="p-3 bg-[#131318] border border-white/8 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-xs">
                {s.isMaster ? <Crown size={14} /> : <User size={14} />}
              </div>
              <span className="text-xs font-semibold text-zinc-100">{s.name}</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">{s.isMaster ? '主声纹' : '已就绪'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
