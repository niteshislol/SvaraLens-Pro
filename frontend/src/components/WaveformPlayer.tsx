import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, Bookmark } from 'lucide-react';

interface WaveformPlayerProps {
  src: string;
  regionStart?: number;
  regionEnd?: number;
  onSelectRegion?: (start: number, end: number) => void;
}

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  src,
  regionStart,
  regionEnd,
  onSelectRegion
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  // Keyboard shortcut: Space to play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const seekTo = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
    setCurrentTime(audioRef.current.currentTime);
  };

  // Draw simulated audio waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Waveform bars
    const barCount = 70;
    const barWidth = 3;
    const gap = (width - barCount * barWidth) / (barCount - 1);

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + gap);
      const frac = i / barCount;
      const t = frac * (duration || 5.0);

      // Amplitude pattern
      const hNorm = 0.2 + 0.6 * Math.abs(Math.sin(i * 0.45) * Math.cos(i * 0.2));
      const barHeight = Math.max(4, hNorm * (height - 12));
      const y = (height - barHeight) / 2;

      // Check if in region
      const inRegion = regionStart !== undefined && regionEnd !== undefined && t >= regionStart && t <= regionEnd;
      const isPast = t <= currentTime;

      if (inRegion) {
        ctx.fillStyle = '#F04D4D';
      } else if (isPast) {
        ctx.fillStyle = '#4F8CFF';
      } else {
        ctx.fillStyle = '#262B36';
      }

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();
    }
  }, [currentTime, duration, regionStart, regionEnd]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration === 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickFrac = clickX / rect.width;
    seekTo(clickFrac * duration);
  };

  return (
    <div className="bg-[#171A21] border border-[#262B36] rounded-lg p-4">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Waveform Canvas */}
      <div className="relative mb-3">
        <canvas
          ref={canvasRef}
          width={640}
          height={64}
          onClick={handleCanvasClick}
          className="w-full h-16 cursor-pointer rounded bg-[#0F1115]/50"
        />

        {/* Region Flag if active */}
        {regionStart !== undefined && regionEnd !== undefined && (
          <div className="absolute top-1 right-2 flex items-center gap-1 text-[11px] font-mono text-[#F04D4D] bg-[#F04D4D]/10 px-2 py-0.5 rounded border border-[#F04D4D]/30">
            <Bookmark className="w-3 h-3" />
            <span>Region: {regionStart.toFixed(2)}s – {regionEnd.toFixed(2)}s</span>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-md bg-[#4F8CFF] hover:bg-[#3D78E6] text-white flex items-center justify-center transition-colors shadow-sm"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            onClick={() => seekTo(0)}
            className="p-2 rounded-md hover:bg-[#262B36] text-[#9AA3B2] hover:text-[#E6E8EE] transition-colors"
            title="Rewind"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="text-xs font-mono text-[#9AA3B2] flex items-center gap-1 ml-1">
            <span className="text-[#E6E8EE]">{currentTime.toFixed(2)}s</span>
            <span>/</span>
            <span>{duration.toFixed(2)}s</span>
          </div>
        </div>

        {regionStart !== undefined && (
          <button
            onClick={() => seekTo(regionStart)}
            className="text-xs font-mono text-[#4F8CFF] hover:underline flex items-center gap-1"
          >
            Seek to defect ({regionStart.toFixed(2)}s)
          </button>
        )}
      </div>
    </div>
  );
};
