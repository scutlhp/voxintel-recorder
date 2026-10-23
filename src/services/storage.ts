import { Recording, Speaker, UserSettings } from '../types';
import { logger } from '../lib/logger';
import { generateSyntheticWav } from '../lib/audioUtils';

const STORAGE_KEYS = {
  RECORDINGS: 'voxintel_recordings_v2',
  SPEAKERS: 'voxintel_speakers_v2',
  SETTINGS: 'voxintel_settings_v2',
};

export const DEFAULT_SETTINGS: UserSettings = {
  vadSensitivity: 'medium',
  audioQuality: 'high',
  autoUpload: 'always',
  enableLiveTranscription: true,
  minSegmentDuration: 2,
};

export const INITIAL_SPEAKERS: Speaker[] = [
  {
    id: 'spk_1',
    userId: 'guest-user',
    name: '我 (主声纹)',
    color: '#f97316',
    sampleCount: 8,
    isRegistered: true,
    isMaster: true,
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_RECORDINGS: Recording[] = [];

export const StorageService = {
  getRecordings(): Recording[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECORDINGS);
      return data ? JSON.parse(data) : INITIAL_RECORDINGS;
    } catch {
      return INITIAL_RECORDINGS;
    }
  },

  async fetchRecordings(): Promise<Recording[]> {
    try {
      const res = await fetch('/api/recordings');
      if (res.ok) {
        const list: Recording[] = await res.json();
        this.saveRecordingsCache(list);
        return list;
      }
    } catch (err) {
      logger.warn('API fetch recordings failed, using cache:', err);
    }
    return this.getRecordings();
  },

  async addRecording(recording: Recording): Promise<Recording[]> {
    try {
      fetch('/api/recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recording),
      }).catch((e) => logger.warn('Background SQLite save note:', e));
    } catch (e) {
      logger.warn('Failed to call /api/recordings:', e);
    }

    const list = this.getRecordings();
    const updated = [recording, ...list.filter((r) => r.id !== recording.id)];
    this.saveRecordingsCache(updated);
    return updated;
  },

  async updateRecording(recording: Recording): Promise<Recording[]> {
    try {
      fetch(`/api/recordings/${recording.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recording),
      }).catch((e) => logger.warn('Background SQLite update note:', e));
    } catch {}

    const list = this.getRecordings();
    const updated = list.map((r) => (r.id === recording.id ? recording : r));
    this.saveRecordingsCache(updated);
    return updated;
  },

  async deleteRecording(id: string): Promise<Recording[]> {
    try {
      fetch(`/api/recordings/${id}`, { method: 'DELETE' }).catch((e) =>
        logger.warn('Background SQLite delete note:', e)
      );
    } catch {}

    const list = this.getRecordings();
    const updated = list.filter((r) => r.id !== id);
    this.saveRecordingsCache(updated);
    return updated;
  },

  saveRecordingsCache(recordings: Recording[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.RECORDINGS, JSON.stringify(recordings));
    } catch {}
  },

  getSpeakers(): Speaker[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SPEAKERS);
      return data ? JSON.parse(data) : INITIAL_SPEAKERS;
    } catch {
      return INITIAL_SPEAKERS;
    }
  },

  async fetchSpeakers(): Promise<Speaker[]> {
    try {
      const res = await fetch('/api/speakers');
      if (res.ok) {
        const list: Speaker[] = await res.json();
        this.saveSpeakersCache(list);
        return list;
      }
    } catch {}
    return this.getSpeakers();
  },

  async addOrUpdateSpeaker(speaker: Speaker): Promise<Speaker[]> {
    try {
      fetch('/api/speakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(speaker),
      }).catch(() => {});
    } catch {}

    const list = this.getSpeakers();
    const idx = list.findIndex((s) => s.id === speaker.id || s.name === speaker.name);
    let updated: Speaker[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = { ...updated[idx], ...speaker };
    } else {
      updated = [...list, speaker];
    }
    this.saveSpeakersCache(updated);
    return updated;
  },

  async setMasterSpeaker(id: string): Promise<Speaker[]> {
    try {
      fetch(`/api/speakers/${id}/set-master`, { method: 'POST' }).catch(() => {});
    } catch {}

    const list = this.getSpeakers();
    const updated = list.map((s) => ({
      ...s,
      isMaster: s.id === id,
    }));
    this.saveSpeakersCache(updated);
    return updated;
  },

  async enrollSpeakerSample(id: string, audioBase64: string): Promise<Speaker[]> {
    try {
      const res = await fetch(`/api/speakers/${id}/sample`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64 }),
      });
      if (res.ok) {
        return this.fetchSpeakers();
      }
    } catch {}

    const list = this.getSpeakers();
    const updated = list.map((s) => (s.id === id ? { ...s, isRegistered: true, sampleCount: s.sampleCount + 1 } : s));
    this.saveSpeakersCache(updated);
    return updated;
  },

  async deleteSpeaker(id: string): Promise<Speaker[]> {
    try {
      fetch(`/api/speakers/${id}`, { method: 'DELETE' }).catch(() => {});
    } catch {}

    const list = this.getSpeakers();
    const updated = list.filter((s) => s.id !== id);
    this.saveSpeakersCache(updated);
    return updated;
  },

  saveSpeakersCache(speakers: Speaker[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.SPEAKERS, JSON.stringify(speakers));
    } catch {}
  },

  getSettings(): UserSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: UserSettings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {}
  },
};
