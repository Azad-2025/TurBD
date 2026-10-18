import React, { useState } from 'react';
import { api } from '../../services/api';
import { Turf, TurfPricingRule } from '../../types';
import {
  DollarSign,
  Sun,
  Moon,
  Zap,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Info,
} from 'lucide-react';

interface OwnerPricingModalProps {
  turf: Turf;
  onClose: () => void;
  onUpdated: (updatedTurf: any) => void;
}

export const OwnerPricingModal: React.FC<OwnerPricingModalProps> = ({
  turf,
  onClose,
  onUpdated,
}) => {
  const [hourlyRate, setHourlyRate] = useState<number>(turf.hourlyRate || 1800);
  const [dayPricePerHour, setDayPricePerHour] = useState<number>(
    turf.dayPricePerHour || turf.hourlyRate || 1600
  );
  const [nightPricePerHour, setNightPricePerHour] = useState<number>(
    turf.nightPricePerHour || turf.peakHourRate || 2200
  );
  const [peakHourRate, setPeakHourRate] = useState<number>(
    turf.peakHourRate || turf.nightPricePerHour || 2200
  );
  const [pricingRules, setPricingRules] = useState<TurfPricingRule[]>(
    turf.pricingRules || []
  );

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form for adding custom pricing rule
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState('Prime Floodlight Hours');
  const [newRuleStart, setNewRuleStart] = useState('20:00');
  const [newRuleEnd, setNewRuleEnd] = useState('23:00');
  const [newRuleRate, setNewRuleRate] = useState(2500);
  const [newRuleType, setNewRuleType] = useState<'peak' | 'off_peak' | 'default'>('peak');

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newRuleStart || !newRuleEnd || !newRuleRate) {
      setErrorMsg('All rule fields are required.');
      return;
    }

    const newRule: TurfPricingRule = {
      name: newRuleName.trim(),
      startTime: newRuleStart,
      endTime: newRuleEnd,
      pricePerHour: Number(newRuleRate),
      type: newRuleType,
    };

    setPricingRules([...pricingRules, newRule]);
    setShowAddRule(false);
    setNewRuleName('Prime Floodlight Hours');
    setNewRuleStart('20:00');
    setNewRuleEnd('23:00');
    setNewRuleRate(2500);
    setErrorMsg('');
  };

  const handleRemoveRule = (index: number) => {
    setPricingRules(pricingRules.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (hourlyRate <= 0 || dayPricePerHour <= 0 || nightPricePerHour <= 0) {
      setErrorMsg('All price rates must be positive amounts.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const updates = {
        hourlyRate: Number(hourlyRate),
        dayPricePerHour: Number(dayPricePerHour),
        nightPricePerHour: Number(nightPricePerHour),
        peakHourRate: Number(peakHourRate),
        pricingRules: pricingRules,
      };

      const updated = await api.updateTurf(turf.id, updates);
      setSuccessMsg('Turf pricing configuration updated successfully!');
      onUpdated({ ...turf, ...updates });
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      console.error('Failed to update turf pricing:', err);
      setErrorMsg(err.message || 'Failed to update pricing');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-modal border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#0FA958]" />
              Dynamic Pricing: {turf.name}
            </h3>
            <p className="text-xs text-[#64748B]">
              Configure morning off-peak, night floodlight, and custom prime hour slot rates
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Day vs Night Core Rates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Morning / Day Rate */}
            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-600" />
                  Daytime Slots (06:00 – 18:00)
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                  Off-Peak
                </span>
              </div>
              <div>
                <label className="block text-[11px] text-amber-900/80 mb-1">Price per Hour (BDT)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-400">
                    ৳
                  </span>
                  <input
                    type="number"
                    min="500"
                    step="100"
                    value={dayPricePerHour}
                    onChange={(e) => setDayPricePerHour(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 text-xs font-bold font-mono bg-white border border-amber-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#0FA958]"
                  />
                </div>
              </div>
              <p className="text-[10px] text-amber-800/70">
                Applied to morning &amp; afternoon daylight slots
              </p>
            </div>

            {/* Night / Floodlight Rate */}
            <div className="bg-indigo-50/50 border border-indigo-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Moon className="w-4 h-4 text-indigo-600" />
                  Night Slots (18:00 – 02:00)
                </span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">
                  Floodlights
                </span>
              </div>
              <div>
                <label className="block text-[11px] text-indigo-900/80 mb-1">Price per Hour (BDT)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-400">
                    ৳
                  </span>
                  <input
                    type="number"
                    min="500"
                    step="100"
                    value={nightPricePerHour}
                    onChange={(e) => {
                      setNightPricePerHour(Number(e.target.value));
                      setPeakHourRate(Number(e.target.value));
                    }}
                    className="w-full pl-8 pr-3 py-2 text-xs font-bold font-mono bg-white border border-indigo-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#0FA958]"
                  />
                </div>
              </div>
              <p className="text-[10px] text-indigo-800/70">
                Covers floodlight electricity and peak demand
              </p>
            </div>
          </div>

          {/* Standard Fallback Rate */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-800">Default Baseline Rate</div>
              <div className="text-[11px] text-slate-500">
                Used for default slot generation if no specific time window matches
              </div>
            </div>
            <div className="w-36">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-400">
                  ৳
                </span>
                <input
                  type="number"
                  min="500"
                  step="100"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-bold font-mono bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#0FA958]"
                />
              </div>
            </div>
          </div>

          {/* Custom Time-Window Rules */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Custom Time-Window Pricing Rules ({pricingRules.length})
                </h4>
                <p className="text-[10px] text-slate-500">
                  Override default pricing for specific hours (e.g. 20:00–23:00 super peak)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddRule(!showAddRule)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#0FA958]" />
                <span>{showAddRule ? 'Cancel' : 'Add Rule'}</span>
              </button>
            </div>

            {/* Add Rule Form */}
            {showAddRule && (
              <form onSubmit={handleAddRule} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800">New Pricing Rule</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rule Name</label>
                    <input
                      type="text"
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                      placeholder="e.g. Weekend Prime Floodlight"
                      className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rule Type</label>
                    <select
                      value={newRuleType}
                      onChange={(e) => setNewRuleType(e.target.value as any)}
                      className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl"
                    >
                      <option value="peak">Peak Hours</option>
                      <option value="off_peak">Off-Peak Discount</option>
                      <option value="default">Special Standard</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Start Time (HH:MM)</label>
                    <input
                      type="time"
                      value={newRuleStart}
                      onChange={(e) => setNewRuleStart(e.target.value)}
                      className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">End Time (HH:MM)</label>
                    <input
                      type="time"
                      value={newRuleEnd}
                      onChange={(e) => setNewRuleEnd(e.target.value)}
                      className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Price per Hour (BDT)</label>
                  <input
                    type="number"
                    min="500"
                    step="100"
                    value={newRuleRate}
                    onChange={(e) => setNewRuleRate(Number(e.target.value))}
                    className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl font-mono font-bold"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddRule(false)}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#0FA958] text-white font-bold rounded-xl text-xs"
                  >
                    Save Rule
                  </button>
                </div>
              </form>
            )}

            {/* List of custom rules */}
            {pricingRules.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                No custom time-window rules configured yet. The day/night rates configured above will be applied.
              </div>
            ) : (
              <div className="space-y-2">
                {pricingRules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs shadow-sm"
                  >
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{rule.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {rule.startTime} – {rule.endTime}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Rate: <strong className="text-[#064E3B] font-mono">BDT {rule.pricePerHour}/hr</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveRule(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-soft transition-colors cursor-pointer"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>Save All Pricing Rates</span>
          </button>
        </div>
      </div>
    </div>
  );
};
