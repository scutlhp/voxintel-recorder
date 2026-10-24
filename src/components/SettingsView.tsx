import React from 'react';
import { UserSettings } from '../types';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
  recordingCount: number;
  onClearAllRecordings: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ recordingCount }) => {
  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h2 className="text-base font-bold text-white">系统设置</h2>
      <div className="p-4 bg-[#131318] border border-white/8 rounded-2xl space-y-2 text-xs text-zinc-300">
        <p>当前录音数：{recordingCount} 条</p>
        <p>存储模式：本地 SQLite 私有安全加密</p>
      </div>
    </div>
  );
};
