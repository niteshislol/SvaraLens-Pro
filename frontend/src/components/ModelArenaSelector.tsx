import React from 'react';
import { Sparkles, PhoneCall, UserCheck, Bot } from 'lucide-react';

export interface ModelPersona {
  name: string;
  gender: 'Female' | 'Male';
  character: string;
}

export const V3_PERSONAS: ModelPersona[] = [
  { name: 'Shivani', gender: 'Female', character: 'Warm & Conversational' },
  { name: 'Avinash', gender: 'Male', character: 'Authoritative & Confident' },
  { name: 'Lakshmi', gender: 'Female', character: 'Soft & Empathetic' },
  { name: 'Kalpana', gender: 'Female', character: 'Professional & Articulate' },
  { name: 'Shubham', gender: 'Male', character: 'Dynamic & Energetic' },
  { name: 'Prakash', gender: 'Male', character: 'Friendly Financial Advisor' }
];

export const V25_PERSONAS: ModelPersona[] = [
  { name: 'Nalini', gender: 'Female', character: 'Telephony Standard Baseline' },
  { name: 'Deepak', gender: 'Male', character: 'IVR / Broadcast Baseline' },
  { name: 'Bhavna', gender: 'Female', character: 'Friendly Customer Support' },
  { name: 'Roopesh', gender: 'Male', character: 'Formal Delivery' }
];

interface ModelArenaSelectorProps {
  selectedModel: 'timbre-v3.0' | 'timbre-v2.5';
  selectedVoice: string;
  onModelChange: (model: 'timbre-v3.0' | 'timbre-v2.5') => void;
  onVoiceChange: (voice: string) => void;
}

export const ModelArenaSelector: React.FC<ModelArenaSelectorProps> = ({
  selectedModel,
  selectedVoice,
  onModelChange,
  onVoiceChange
}) => {
  const currentPersonas = selectedModel === 'timbre-v3.0' ? V3_PERSONAS : V25_PERSONAS;

  return (
    <div className="bg-[#11141B] border border-[#1D2230] rounded-xl p-4 shadow-lg space-y-3">
      {/* Top Model Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1D2230] pb-3">
        <div>
          <h3 className="text-sm font-bold text-[#F3F4F6] flex items-center gap-2">
            Gnani Voice Engine Arena
          </h3>
          <p className="text-[11px] text-[#94A3B8]">Select sovereign Indic speech synthesis tier and voice persona</p>
        </div>

        {/* Model Tabs */}
        <div className="flex items-center bg-[#171C26] p-1 rounded-lg border border-[#222938]">
          <button
            onClick={() => {
              onModelChange('timbre-v3.0');
              if (!V3_PERSONAS.some(p => p.name === selectedVoice)) {
                onVoiceChange('Shivani');
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              selectedModel === 'timbre-v3.0'
                ? 'bg-[#8B5CF6] text-white shadow-md'
                : 'text-[#94A3B8] hover:text-[#F3F4F6]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Timbre v3.0 (Expressive)</span>
          </button>

          <button
            onClick={() => {
              onModelChange('timbre-v2.5');
              if (!V25_PERSONAS.some(p => p.name === selectedVoice)) {
                onVoiceChange('Nalini');
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              selectedModel === 'timbre-v2.5'
                ? 'bg-[#4F8CFF] text-white shadow-md'
                : 'text-[#94A3B8] hover:text-[#F3F4F6]'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Timbre v2.5 (Telephony)</span>
          </button>
        </div>
      </div>

      {/* Voice Personas Chips */}
      <div>
        <div className="text-[11px] font-mono text-[#64748B] mb-2 uppercase tracking-wider">
          Available Personas for {selectedModel}:
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {currentPersonas.map((p) => {
            const isSelected = selectedVoice === p.name;
            return (
              <div
                key={p.name}
                onClick={() => onVoiceChange(p.name)}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? selectedModel === 'timbre-v3.0'
                      ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white shadow-sm'
                      : 'bg-[#4F8CFF]/15 border-[#4F8CFF] text-white shadow-sm'
                    : 'bg-[#171C26]/60 border-[#222938] hover:border-[#4F8CFF]/40 text-[#94A3B8]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-xs text-[#F3F4F6]">{p.name}</span>
                  <span className="text-[9px] font-mono px-1 rounded bg-[#080A0E] text-[#64748B]">
                    {p.gender === 'Female' ? '♀' : '♂'}
                  </span>
                </div>
                <div className="text-[10px] text-[#94A3B8] line-clamp-1">
                  {p.character}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
