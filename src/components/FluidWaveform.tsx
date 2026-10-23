import React, { useRef, useEffect } from 'react';

interface FluidWaveformProps {
  analyser: AnalyserNode | null;
  isRecording: boolean;
  isPaused: boolean;
  accentColor?: string;
  barCount?: number;
  height?: number;
}

export const FluidWaveform: React.FC<FluidWaveformProps> = ({
  analyser,
  isRecording,
  isPaused,
  accentColor = '#FF6A2B',
  barCount = 32,
  height = 54,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const heightsRef = useRef<number[]>(new Array(barCount).fill(4));

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (analyser && isRecording && !isPaused && dataArray) {
        analyser.getByteFrequencyData(dataArray);
      }

      const barWidth = 3.5;
      const gap = (w - barCount * barWidth) / Math.max(1, barCount - 1);
      const centerY = h / 2;

      for (let i = 0; i < barCount; i++) {
        let targetH = 4;
        if (analyser && isRecording && !isPaused && dataArray) {
          const dataIdx = Math.min(
            dataArray.length - 1,
            Math.floor((i / barCount) * (dataArray.length * 0.45))
          );
          const raw = dataArray[dataIdx] || 0;
          const weight = Math.sin((i / (barCount - 1)) * Math.PI);
          targetH = Math.max(4, (raw / 255) * (h * 0.88) * (0.35 + 0.65 * weight));
        }

        heightsRef.current[i] += (targetH - heightsRef.current[i]) * 0.25;
        const currentH = heightsRef.current[i];
        const x = i * (barWidth + gap);
        const y = centerY - currentH / 2;

        ctx.fillStyle = accentColor;
        ctx.fillRect(x, y, barWidth, Math.max(currentH, 3));
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [analyser, isRecording, isPaused, accentColor, barCount]);

  return (
    <div className="w-full flex items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} width={320} height={height} className="w-full max-w-xs h-full" />
    </div>
  );
};
