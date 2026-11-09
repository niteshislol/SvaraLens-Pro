import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, Volume2, VolumeX, ZoomIn, ZoomOut,
  Layers, Pin, Sparkles, Check, Clock, Radio, Activity
} from 'lucide-react';
import { DefectPin } from '../types';

interface ProWaveformPlayerProps {
  primaryAudioUrl: string;
  comparisonAudioUrl?: string; // Optional track B (e.g. fixed regression audio)
  primaryLabel?: string;
  comparisonLabel?: string;
  defectPins?: DefectPin[];
  highlightRegion?: [number, number]; // [start, end] in seconds
  onRegionSelected?: (start: number, end: number) => void;
  onAddPinRequested?: (time: number) => void;
}

export const ProWaveformPlayer: React.FC<ProWaveformPlayerProps> = ({
  primaryAudioUrl,
  comparisonAudioUrl,
  primaryLabel = 'Track A: Failing Clip',
  comparisonLabel = 'Track B: Fixed Baseline',
  defectPins = [],
  highlightRegion,
  onRegionSelected,
  onAddPinRequested,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const compAudioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [compAudioBuffer, setCompAudioBuffer] = useState<AudioBuffer | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTrackMode, setActiveTrackMode] = useState<'A' | 'B' | 'OVERLAY'>('A');

  // Drag-to-select state on canvas
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<[number, number] | null>(highlightRegion || null);

  // Sync selected range when prop changes
  useEffect(() => {
    if (highlightRegion) setSelectedRange(highlightRegion);
  }, [highlightRegion]);

  // Load Primary Audio Buffer
  useEffect(() => {
    if (!primaryAudioUrl) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    fetch(primaryAudioUrl)
      .then(res => res.arrayBuffer())
      .then(ab => ctx.decodeAudioData(ab))
      .then(buf => {
        setAudioBuffer(buf);
        setDuration(buf.duration);
      })
      .catch(err => console.error("Failed to decode primary audio", err));

    return () => {
      ctx.close().catch(() => {});
    };
  }, [primaryAudioUrl]);

  // Load Comparison Audio Buffer if available
  useEffect(() => {
    if (!comparisonAudioUrl) {
      setCompAudioBuffer(null);
      return;
    }
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    fetch(comparisonAudioUrl)
      .then(res => res.arrayBuffer())
      .then(ab => ctx.decodeAudioData(ab))
      .then(buf => setCompAudioBuffer(buf))
      .catch(err => console.error("Failed to decode comparison audio", err));

    return () => {
      ctx.close().catch(() => {});
    };
  }, [comparisonAudioUrl]);

  // Audio elements sync
  useEffect(() => {
    const audio = new Audio(primaryAudioUrl);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      if (compAudioRef.current && Math.abs(compAudioRef.current.currentTime - audio.currentTime) > 0.05) {
        compAudioRef.current.currentTime = audio.currentTime;
      }
    };

    audio.onended = () => setIsPlaying(false);

    let compAudio: HTMLAudioElement | null = null;
    if (comparisonAudioUrl) {
      compAudio = new Audio(comparisonAudioUrl);
      compAudioRef.current = compAudio;
    }

    return () => {
      audio.pause();
      if (compAudio) compAudio.pause();
    };
  }, [primaryAudioUrl, comparisonAudioUrl]);

  // Handle Playback toggling
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      if (compAudioRef.current) compAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackSpeed;
      if (activeTrackMode === 'B' && compAudioRef.current) {
        audioRef.current.muted = true;
        compAudioRef.current.muted = isMuted;
        compAudioRef.current.play().catch(() => {});
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.muted = isMuted;
        if (compAudioRef.current) compAudioRef.current.muted = true;
        audioRef.current.play().catch(() => {});
        if (compAudioRef.current) compAudioRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  }, [isPlaying, playbackSpeed, activeTrackMode, isMuted]);

  // Keyboard shortcut: Space to toggle play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyJ') {
        // Skip back 1s
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 1.0);
        }
      } else if (e.code === 'KeyL') {
        // Skip forward 1s
        if (audioRef.current) {
          audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 1.0);
        }
      } else if (e.code === 'Digit1') {
        setActiveTrackMode('A');
      } else if (e.code === 'Digit2' && comparisonAudioUrl) {
        setActiveTrackMode('B');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, duration, comparisonAudioUrl]);

  // Draw High-Resolution Waveform & Spectrogram styling on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#080A0E';
    ctx.fillRect(0, 0, width, height);

    // Draw subtle grid lines
    ctx.strokeStyle = '#171C26';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    if (!audioBuffer) {
      // Loading placeholder
      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px JetBrains Mono';
      ctx.fillText('Decoding 16kHz audio telemetry...', 20, height / 2 + 4);
      return;
    }

    const rawDataA = audioBuffer.getChannelData(0);
    const totalSamples = rawDataA.length;
    const step = Math.ceil(totalSamples / width);

    // If Comparison Track exists and selected, load its data
    const rawDataB = compAudioBuffer ? compAudioBuffer.getChannelData(0) : null;
    const stepB = rawDataB ? Math.ceil(rawDataB.length / width) : step;

    // Draw Highlight Region (if selected)
    if (selectedRange && duration > 0) {
      const startX = (selectedRange[0] / duration) * width;
      const endX = (selectedRange[1] / duration) * width;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'; // Crimson defect tint
      ctx.fillRect(startX, 0, endX - startX, height);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.strokeRect(startX, 0, endX - startX, height);
    }

    // Draw Primary Track (Track A - Cyan/Blue gradient)
    if (activeTrackMode === 'A' || activeTrackMode === 'OVERLAY') {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#4F8CFF');
      grad.addColorStop(0.5, '#00E5FF');
      grad.addColorStop(1, '#4F8CFF');
      ctx.fillStyle = activeTrackMode === 'OVERLAY' ? 'rgba(79, 140, 255, 0.5)' : grad;

      const amp = height * 0.45;
      for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
          const datum = rawDataA[(i * step) + j];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
        const barHeight = Math.max(2, (max - min) * amp);
        ctx.fillRect(i, (height / 2) - (barHeight / 2), 1, barHeight);
      }
    }

    // Draw Comparison Track (Track B - Emerald gradient)
    if (rawDataB && (activeTrackMode === 'B' || activeTrackMode === 'OVERLAY')) {
      const gradB = ctx.createLinearGradient(0, 0, 0, height);
      gradB.addColorStop(0, '#10B981');
      gradB.addColorStop(0.5, '#34D399');
      gradB.addColorStop(1, '#10B981');
      ctx.fillStyle = activeTrackMode === 'OVERLAY' ? 'rgba(16, 185, 129, 0.6)' : gradB;

      const amp = height * 0.45;
      for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < stepB; j++) {
          const datum = rawDataB[(i * stepB) + j];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
        const barHeight = Math.max(2, (max - min) * amp);
        ctx.fillRect(i, (height / 2) - (barHeight / 2), 1, barHeight);
      }
    }

    // Draw Defect Pins on Canvas
    defectPins.forEach(pin => {
      if (duration <= 0) return;
      const pinX = (pin.timestamp_start_s / duration) * width;
      const endPinX = (pin.timestamp_end_s / duration) * width;

      // Pin zone
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fillRect(pinX, 0, Math.max(3, endPinX - pinX), height);

      // Pin marker line
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pinX, 0);
      ctx.lineTo(pinX, height);
      ctx.stroke();

      // Pin head
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(pinX, 10, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw Playhead Scrubber Needle
    if (duration > 0) {
      const playheadX = (currentTime / duration) * width;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#4F8CFF';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // Playhead diamond top
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(playheadX - 4, 0);
      ctx.lineTo(playheadX + 4, 0);
      ctx.lineTo(playheadX, 7);
      ctx.closePath();
      ctx.fill();
    }
  }, [audioBuffer, compAudioBuffer, duration, currentTime, activeTrackMode, selectedRange, defectPins]);

  // Scrub on canvas click/drag
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = (x / rect.width) * duration;
    setDragStart(clickTime);

    if (audioRef.current) {
      audioRef.current.currentTime = clickTime;
      setCurrentTime(clickTime);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragStart === null || !canvasRef.current || duration <= 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const curr = (x / rect.width) * duration;
    const start = Math.min(dragStart, curr);
    const end = Math.max(dragStart, curr);
    setSelectedRange([start, end]);
  };

  const handleCanvasMouseUp = () => {
    if (dragStart !== null && selectedRange) {
      if (selectedRange[1] - selectedRange[0] > 0.1 && onRegionSelected) {
        onRegionSelected(selectedRange[0], selectedRange[1]);
      }
    }
    setDragStart(null);
  };

  const formatTimecode = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  return (
    <div className="bg-[#11141B] border border-[#1D2230] rounded-xl p-4 shadow-xl space-y-3">
      {/* Player Header / Status Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-[#1D2230] pb-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="font-mono text-sm font-bold text-[#F3F4F6]">
              {formatTimecode(currentTime)}
            </span>
            <span className="font-mono text-xs text-[#64748B]">/ {formatTimecode(duration)}</span>
          </div>

          {/* Mode Tabs (A/B Comparative Solo) */}
          {comparisonAudioUrl && (
            <div className="flex items-center bg-[#171C26] rounded-md p-0.5 border border-[#222938]">
              <button
                onClick={() => setActiveTrackMode('A')}
                className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                  activeTrackMode === 'A'
                    ? 'bg-[#4F8CFF] text-white font-bold'
                    : 'text-[#94A3B8] hover:text-[#F3F4F6]'
                }`}
              >
                Track A (Fail)
              </button>
              <button
                onClick={() => setActiveTrackMode('B')}
                className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                  activeTrackMode === 'B'
                    ? 'bg-[#10B981] text-white font-bold'
                    : 'text-[#94A3B8] hover:text-[#F3F4F6]'
                }`}
              >
                Track B (Fixed)
              </button>
              <button
                onClick={() => setActiveTrackMode('OVERLAY')}
                className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                  activeTrackMode === 'OVERLAY'
                    ? 'bg-[#8B5CF6] text-white font-bold'
                    : 'text-[#94A3B8] hover:text-[#F3F4F6]'
                }`}
              >
                Dual Overlay
              </button>
            </div>
          )}
        </div>

        {/* Speed Chips & Pin Action */}
        <div className="flex items-center gap-2">
          {/* Playback speed */}
          <div className="hidden sm:flex items-center bg-[#171C26] rounded-md border border-[#222938] p-0.5 text-[11px] font-mono">
            {[0.5, 0.75, 1.0, 1.25, 1.5].map(spd => (
              <button
                key={spd}
                onClick={() => {
                  setPlaybackSpeed(spd);
                  if (audioRef.current) audioRef.current.playbackRate = spd;
                  if (compAudioRef.current) compAudioRef.current.playbackRate = spd;
                }}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  playbackSpeed === spd ? 'bg-[#222938] text-[#4F8CFF] font-bold' : 'text-[#64748B] hover:text-[#94A3B8]'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Quick Drop Pin Trigger */}
          {onAddPinRequested && (
            <button
              onClick={() => onAddPinRequested(currentTime)}
              title="Drop Defect Pin at Current Timecode (Key: P)"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/30 transition-colors"
            >
              <Pin className="w-3.5 h-3.5" />
              <span>Pin Defect</span>
            </button>
          )}
        </div>
      </div>

      {/* Waveform Canvas */}
      <div className="relative rounded-lg overflow-hidden border border-[#1D2230] group">
        <canvas
          ref={canvasRef}
          width={900}
          height={120}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          className="w-full h-28 cursor-crosshair block"
        />

        {/* Selected Range Overlay Pill */}
        {selectedRange && (
          <div className="absolute top-2 right-2 bg-[#080A0E]/80 backdrop-blur-md border border-[#EF4444]/40 px-2.5 py-1 rounded text-[11px] font-mono text-[#EF4444] flex items-center gap-2">
            <span>Range: {selectedRange[0].toFixed(2)}s – {selectedRange[1].toFixed(2)}s</span>
            <span className="text-[#64748B]">({(selectedRange[1] - selectedRange[0]).toFixed(2)}s)</span>
          </div>
        )}
      </div>

      {/* Player Primary Transport Controls */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          {/* Main Play / Pause Button */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-lg bg-[#4F8CFF] hover:bg-[#3D78E6] text-white flex items-center justify-center shadow-lg transition-all active:scale-95"
            title="Play / Pause (Space)"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          {/* Skip Buttons */}
          <button
            onClick={() => {
              if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 1.0);
            }}
            className="p-2 rounded-lg bg-[#171C26] hover:bg-[#222938] text-[#94A3B8] hover:text-white transition-colors"
            title="Skip Back 1s (J)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Volume Mute */}
          <button
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              if (audioRef.current) audioRef.current.muted = next;
              if (compAudioRef.current) compAudioRef.current.muted = next;
            }}
            className="p-2 rounded-lg bg-[#171C26] hover:bg-[#222938] text-[#94A3B8] hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-[#EF4444]" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Track Label Legend */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-[#4F8CFF]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4F8CFF]" />
            <span>{primaryLabel}</span>
          </div>
          {comparisonAudioUrl && (
            <div className="flex items-center gap-1.5 text-[#10B981]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
              <span>{comparisonLabel}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
