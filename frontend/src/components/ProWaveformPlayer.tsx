import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, Volume2, VolumeX,
  Pin, ChevronDown
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
  const [volume, setVolume] = useState<number>(1.0);
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
        compAudioRef.current.volume = volume;
        compAudioRef.current.play().catch(() => {});
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.muted = isMuted;
        audioRef.current.volume = volume;
        if (compAudioRef.current) compAudioRef.current.muted = true;
        audioRef.current.play().catch(() => {});
        if (compAudioRef.current) compAudioRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  }, [isPlaying, playbackSpeed, activeTrackMode, isMuted, volume]);

  // Keyboard shortcut: Space to toggle play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyJ') {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 1.0);
        }
      } else if (e.code === 'KeyL') {
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

  // Draw Light-Mode Waveform on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background to clean white
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Draw subtle grid lines (#F1F5F9)
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 60) {
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
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('Loading Indic audio telemetry...', 20, height / 2 + 4);
      return;
    }

    const rawDataA = audioBuffer.getChannelData(0);
    const totalSamples = rawDataA.length;
    const step = Math.ceil(totalSamples / width);

    const rawDataB = compAudioBuffer ? compAudioBuffer.getChannelData(0) : null;
    const stepB = rawDataB ? Math.ceil(rawDataB.length / width) : step;

    // Draw Highlight Region / Selection (Soft Red Tint)
    if (selectedRange && duration > 0) {
      const startX = (selectedRange[0] / duration) * width;
      const endX = (selectedRange[1] / duration) * width;
      ctx.fillStyle = 'rgba(217, 72, 72, 0.12)';
      ctx.fillRect(startX, 0, endX - startX, height);
      ctx.strokeStyle = 'rgba(217, 72, 72, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, 0, endX - startX, height);
    }

    // Draw Primary Track (Track A - Vibrant Waveform Blue #347FE8)
    if (activeTrackMode === 'A' || activeTrackMode === 'OVERLAY') {
      const amp = height * 0.42;
      ctx.fillStyle = activeTrackMode === 'OVERLAY' ? 'rgba(52, 127, 232, 0.55)' : '#347FE8';

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

    // Draw Comparison Track (Track B - Emerald #16A36A)
    if (rawDataB && (activeTrackMode === 'B' || activeTrackMode === 'OVERLAY')) {
      const amp = height * 0.42;
      ctx.fillStyle = activeTrackMode === 'OVERLAY' ? 'rgba(22, 163, 106, 0.55)' : '#16A36A';

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

    // Draw Defect Pins on Canvas (P1 Marker pill matching Reference B)
    defectPins.forEach(pin => {
      if (duration <= 0) return;
      const pinX = (pin.timestamp_start_s / duration) * width;
      const endPinX = (pin.timestamp_end_s / duration) * width;

      // Defect interval area
      ctx.fillStyle = 'rgba(217, 72, 72, 0.15)';
      ctx.fillRect(pinX, 0, Math.max(4, endPinX - pinX), height);

      // Defect interval border
      ctx.strokeStyle = 'rgba(217, 72, 72, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(pinX, 0, Math.max(4, endPinX - pinX), height);
    });

    // Draw Playhead Scrubber Needle
    if (duration > 0) {
      const playheadX = (currentTime / duration) * width;
      ctx.strokeStyle = '#3867E8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Top indicator triangle
      ctx.fillStyle = '#3867E8';
      ctx.beginPath();
      ctx.moveTo(playheadX - 4, 0);
      ctx.lineTo(playheadX + 4, 0);
      ctx.lineTo(playheadX, 6);
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
    <div className="space-y-2">
      {/* Waveform Canvas Area */}
      <div className="relative rounded-lg overflow-hidden border border-[#E7ECF3] bg-white shadow-sm">
        <canvas
          ref={canvasRef}
          width={900}
          height={110}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          className="w-full h-24 cursor-crosshair block"
        />

        {/* P1 Defect Pin Marker Pill Overlay (Reference B) */}
        {defectPins.length > 0 && duration > 0 && (
          <div
            className="absolute top-1 transform -translate-x-1/2 pointer-events-none"
            style={{
              left: `${Math.min(90, Math.max(10, ((defectPins[0].timestamp_start_s + defectPins[0].timestamp_end_s) / 2 / duration) * 100))}%`
            }}
          >
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D94848] text-white text-[10px] font-mono font-medium shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>P1 {defectPins[0].timestamp_start_s.toFixed(2)}s – {defectPins[0].timestamp_end_s.toFixed(2)}s</span>
            </div>
          </div>
        )}

        {/* Selected Range Overlay Pill */}
        {selectedRange && (
          <div className="absolute bottom-1 right-2 bg-white/90 backdrop-blur-sm border border-[#D94848]/30 px-2 py-0.5 rounded text-[10px] font-mono text-[#D94848] flex items-center gap-1.5 shadow-sm">
            <span>Range: {selectedRange[0].toFixed(2)}s – {selectedRange[1].toFixed(2)}s</span>
          </div>
        )}

        {/* Time Axis Markings (Reference B: 0:00, 0:01, 0:02...) */}
        <div className="flex justify-between items-center px-2 py-0.5 border-t border-[#F1F5F9] text-[10px] font-mono text-[#94A3B8] bg-[#FAFBFD]">
          <span>0:00</span>
          <span>0:01</span>
          <span>0:02</span>
          <span>0:03</span>
          <span>0:04</span>
          <span>0:05</span>
        </div>
      </div>

      {/* Transport Controls Bar (Reference B) */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          {/* Main Play / Pause Circle Button */}
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-[#3867E8] hover:bg-[#2C56CE] text-white flex items-center justify-center shadow-sm transition-transform active:scale-95"
            title="Play / Pause (Space)"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-1.5 text-[#64748B]">
            <button
              onClick={() => {
                const next = !isMuted;
                setIsMuted(next);
                if (audioRef.current) audioRef.current.muted = next;
                if (compAudioRef.current) compAudioRef.current.muted = next;
              }}
              className="p-1 hover:text-[#172033]"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-[#D94848]" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                setIsMuted(false);
                if (audioRef.current) audioRef.current.volume = v;
                if (compAudioRef.current) compAudioRef.current.volume = v;
              }}
              className="w-16 h-1 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#3867E8]"
            />
          </div>

          {/* Speed Selector */}
          <div className="relative inline-flex items-center">
            <select
              value={playbackSpeed}
              onChange={(e) => {
                const spd = parseFloat(e.target.value);
                setPlaybackSpeed(spd);
                if (audioRef.current) audioRef.current.playbackRate = spd;
                if (compAudioRef.current) compAudioRef.current.playbackRate = spd;
              }}
              className="text-xs font-mono font-medium text-[#172033] bg-white border border-[#E7ECF3] rounded px-2 py-1 pr-5 appearance-none focus:outline-none focus:border-[#3867E8] cursor-pointer"
            >
              <option value="0.75">0.75x</option>
              <option value="1.0">1.0x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
            </select>
            <ChevronDown className="w-3 h-3 text-[#64748B] absolute right-1.5 pointer-events-none" />
          </div>

          {/* Track A / B comparison switcher when available */}
          {comparisonAudioUrl && (
            <div className="flex items-center bg-[#F4F7FB] rounded p-0.5 border border-[#E7ECF3] text-[11px] font-mono">
              <button
                onClick={() => setActiveTrackMode('A')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeTrackMode === 'A' ? 'bg-[#3867E8] text-white font-bold' : 'text-[#64748B]'
                }`}
              >
                Track A
              </button>
              <button
                onClick={() => setActiveTrackMode('B')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeTrackMode === 'B' ? 'bg-[#16A36A] text-white font-bold' : 'text-[#64748B]'
                }`}
              >
                Track B
              </button>
            </div>
          )}
        </div>

        {/* Right side: Add Defect Pin Action (Reference B) */}
        {onAddPinRequested && (
          <button
            onClick={() => onAddPinRequested(currentTime)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E7ECF3] bg-white hover:border-[#3867E8] text-[#172033] hover:text-[#3867E8] shadow-sm transition-colors"
          >
            <Pin className="w-3.5 h-3.5 text-[#3867E8]" />
            <span>Add Defect Pin</span>
          </button>
        )}
      </div>
    </div>
  );
};
