import React, { useState } from 'react';
import { DefectPin } from '../types';
import { Pin, Trash2, Plus, AlertCircle, Clock, Check } from 'lucide-react';

interface DefectPinDrawerProps {
  pins: DefectPin[];
  currentTime: number;
  onAddPin: (pin: {
    timestamp_start_s: number;
    timestamp_end_s: number;
    category: string;
    severity: string;
    note: string;
  }) => Promise<void>;
  onRemovePin: (pinId: string) => Promise<void>;
  onSelectPinRegion?: (start: number, end: number) => void;
}

export const DefectPinDrawer: React.FC<DefectPinDrawerProps> = ({
  pins,
  currentTime,
  onAddPin,
  onRemovePin,
  onSelectPinRegion
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [startSec, setStartSec] = useState<number>(Math.max(0, currentTime - 0.5));
  const [endSec, setEndSec] = useState<number>(currentTime + 1.0);
  const [category, setCategory] = useState<string>('END_TRUNCATION');
  const [severity, setSeverity] = useState<string>('CRITICAL');
  const [note, setNote] = useState<string>('Mandatory disclosure truncated prematurely.');
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onAddPin({
        timestamp_start_s: Number(startSec),
        timestamp_end_s: Number(endSec),
        category,
        severity,
        note
      });
      setShowAddForm(false);
    } catch (err) {
      alert(`Failed to save defect pin: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#11141B] border border-[#1D2230] rounded-xl p-4 shadow-lg space-y-3">
      <div className="flex items-center justify-between border-b border-[#1D2230] pb-2.5">
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-[#EF4444]" />
          <h3 className="text-sm font-bold text-[#F3F4F6]">
            Interactive Defect Pins ({pins.length})
          </h3>
        </div>

        <button
          onClick={() => {
            setStartSec(Math.max(0, currentTime - 0.5));
            setEndSec(currentTime + 1.0);
            setShowAddForm(!showAddForm);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-[#4F8CFF] hover:bg-[#3D78E6] text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Pin</span>
        </button>
      </div>

      {/* Add Pin Inline Modal/Form */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="bg-[#171C26] border border-[#222938] rounded-lg p-3 space-y-3 text-xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#F3F4F6]">
            <span>Anchor New Defect Pin</span>
            <span className="font-mono text-[10px] text-[#4F8CFF]">Scrubber: {currentTime.toFixed(2)}s</span>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono">
            <div>
              <label className="block text-[10px] text-[#94A3B8] mb-1">Start Time (sec)</label>
              <input
                type="number"
                step="0.01"
                required
                value={startSec}
                onChange={(e) => setStartSec(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#080A0E] border border-[#222938] rounded px-2 py-1 text-[#F3F4F6] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#94A3B8] mb-1">End Time (sec)</label>
              <input
                type="number"
                step="0.01"
                required
                value={endSec}
                onChange={(e) => setEndSec(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#080A0E] border border-[#222938] rounded px-2 py-1 text-[#F3F4F6] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-[#94A3B8] mb-1">Defect Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#080A0E] border border-[#222938] rounded px-2 py-1 text-[#F3F4F6] outline-none"
              >
                <option value="END_TRUNCATION">End Truncation</option>
                <option value="PRONUNCIATION">Pronunciation Error</option>
                <option value="CODE_SWITCH_GLITCH">Code-Switch Voice Shift</option>
                <option value="PROSODY_PAUSE">Unnatural Prosody / Pause</option>
                <option value="CLIPPING">Digital Sample Clipping</option>
                <option value="OTHER">Other Acoustic Defect</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-[#94A3B8] mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-[#080A0E] border border-[#222938] rounded px-2 py-1 text-[#F3F4F6] outline-none"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-[#94A3B8] mb-1">Reviewer Observation Note</label>
            <input
              type="text"
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-[#080A0E] border border-[#222938] rounded px-2 py-1.5 text-[#F3F4F6] outline-none"
              placeholder="e.g. Mandatory statutory late payment disclosure cut off."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-2.5 py-1 text-[11px] text-[#94A3B8] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1 text-[11px] font-bold rounded bg-[#EF4444] hover:bg-[#DC2626] text-white transition-colors"
            >
              {saving ? 'Pinning...' : 'Save Defect Pin'}
            </button>
          </div>
        </form>
      )}

      {/* Pins List */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {pins.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#64748B]">
            No defect pins anchored on this audio timeline. Click "+ Add Pin" or press P to flag an anomaly.
          </div>
        ) : (
          pins.map((pin) => (
            <div
              key={pin.id}
              onClick={() => onSelectPinRegion && onSelectPinRegion(pin.timestamp_start_s, pin.timestamp_end_s)}
              className="bg-[#171C26]/80 hover:bg-[#171C26] border border-[#222938] hover:border-[#EF4444]/40 rounded-lg p-2.5 cursor-pointer transition-all space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                  <span className="font-mono text-xs font-bold text-[#F3F4F6]">{pin.category}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                    {pin.severity}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-[#4F8CFF]">
                    {pin.timestamp_start_s.toFixed(2)}s – {pin.timestamp_end_s.toFixed(2)}s
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemovePin(pin.id);
                    }}
                    className="p-1 text-[#64748B] hover:text-[#EF4444] transition-colors"
                    title="Remove Pin"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-[#94A3B8] line-clamp-2">
                {pin.note}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
