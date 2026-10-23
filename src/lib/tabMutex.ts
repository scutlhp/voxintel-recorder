const CHANNEL_NAME = 'voxintel_record_mutex';
const STORAGE_KEY = 'voxintel_active_recording_tab';

export class RecordingMutex {
  private tabId: string;
  private channel: BroadcastChannel | null = null;
  private onRemoteStopCallback?: () => void;
  private onStateChangeCallback?: (isOtherRecording: boolean) => void;

  constructor() {
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (e) => {
          this.handleMessage(e.data);
        };
      } catch {}
    }

    window.addEventListener('beforeunload', () => {
      this.clearRecording();
    });
  }

  private handleMessage(data: any) {
    if (!data) return;
    if (data.type === 'START_RECORDING' && data.tabId !== this.tabId) {
      this.onStateChangeCallback?.(true);
    } else if (data.type === 'STOP_RECORDING' && data.tabId !== this.tabId) {
      this.onStateChangeCallback?.(false);
    } else if (data.type === 'FORCE_TAKEOVER' && data.targetTabId !== this.tabId) {
      this.onRemoteStopCallback?.();
    }
  }

  public isOtherTabRecording(): boolean {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try {
      const info = JSON.parse(raw);
      if (Date.now() - info.timestamp < 8000 && info.tabId !== this.tabId) {
        return true;
      }
    } catch {}
    return false;
  }

  public markRecording() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ tabId: this.tabId, timestamp: Date.now() })
      );
      this.channel?.postMessage({ type: 'START_RECORDING', tabId: this.tabId });
    } catch {}
  }

  public ping() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ tabId: this.tabId, timestamp: Date.now() })
      );
    } catch {}
  }

  public clearRecording() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const info = JSON.parse(raw);
        if (info.tabId === this.tabId) {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      this.channel?.postMessage({ type: 'STOP_RECORDING', tabId: this.tabId });
    } catch {}
  }

  public takeover() {
    this.channel?.postMessage({ type: 'FORCE_TAKEOVER', targetTabId: this.tabId });
    this.markRecording();
  }

  public onRemoteStop(cb: () => void) {
    this.onRemoteStopCallback = cb;
  }

  public onStateChange(cb: (isOtherRecording: boolean) => void) {
    this.onStateChangeCallback = cb;
  }
}

export const recordingMutex = new RecordingMutex();
