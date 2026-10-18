import React, { useState } from 'react';
import { Sparkles, Send, Loader2, Bot, ArrowRight, X, Compass, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

export const AIMatchAssistant: React.FC = () => {
  const { turfs, setSelectedTurf, setBookingTurf } = useApp();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    summary: string;
    turfIds: string[];
    parsedIntent?: any;
  } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const samplePrompts = [
    '⚽ 7-a-side football in Dhanmondi under 2,500',
    '🏏 Box cricket in Uttara with floodlights',
    '⚡ Best pitch in Bashundhara tonight',
    '🥅 Cheap futsal cage in Mirpur',
  ];

  const handleSearch = async (textToSearch?: string) => {
    const query = textToSearch || prompt;
    if (!query.trim()) return;

    if (textToSearch) setPrompt(textToSearch);
    setIsLoading(true);
    setIsOpen(true);
    try {
      const data = await api.matchTurfsWithAI(query);
      const matchedIds = data.turfs.map((t) => t.id);
      setAiResult({
        summary: data.aiSummary,
        turfIds: matchedIds,
        parsedIntent: data.parsedIntent,
      });
    } catch (err: any) {
      setAiResult({
        summary: 'Could not reach AI assistant right now. Showing live arenas matching your keywords.',
        turfIds: turfs.filter((t) => t.status === 'approved').slice(0, 3).map((t) => t.id),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTurf = (turfId: string) => {
    const found = turfs.find((t) => t.id === turfId);
    if (found) {
      setSelectedTurf(found);
    }
  };

  const handleBookDirect = (turfId: string) => {
    const found = turfs.find((t) => t.id === turfId);
    if (found) {
      setBookingTurf(found);
    }
  };

  return (
    <div
      id="ai-match-assistant-container"
      className="w-full bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-card transition-all relative overflow-hidden text-[#0F172A]"
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shadow-2xs">
            <Sparkles className="w-4 h-4 text-[#064E3B]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-[#0F172A] tracking-tight">
                AI Pitch Matchmaker
              </h3>
              <span className="text-[9px] font-mono bg-emerald-50 text-[#064E3B] border border-emerald-200 px-1.5 py-0.5 rounded-full font-bold">
                Gemini 3.8
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Tell me your squad size, area, or budget
            </p>
          </div>
        </div>

        {isOpen && (
          <button
            onClick={() => {
              setIsOpen(false);
              setAiResult(null);
            }}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            title="Close results"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 mt-2 relative z-10">
        <div className="relative flex-1">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. 7-a-side in Dhanmondi tonight under 2500..."
            className="w-full bg-[#F7FAF8] border border-slate-200 focus:border-[#0FA958] rounded-xl py-2.5 pl-3.5 pr-8 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none transition-colors"
          />
          {prompt && (
            <button
              onClick={() => setPrompt('')}
              className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => handleSearch()}
          disabled={isLoading || !prompt.trim()}
          className="px-4 py-2.5 bg-[#0FA958] hover:bg-[#0da052] disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-[#0FA958]/20 active:scale-95 shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Matching</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </>
          )}
        </button>
      </div>

      {/* Prompt pills - Native Mobile Horizontal Swipe List */}
      <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar pb-1">
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => {
              setPrompt(p.replace(/^[^\s]+\s/, ''));
              handleSearch(p.replace(/^[^\s]+\s/, ''));
            }}
            className="text-[10px] whitespace-nowrap bg-slate-100 hover:bg-emerald-50 active:scale-95 text-slate-700 hover:text-[#064E3B] border border-slate-200 rounded-full px-2.5 py-1 transition-all cursor-pointer shrink-0"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Result Drawer with Motion */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-3 pt-3 border-t border-slate-200 space-y-2.5 relative z-10"
          >
            {/* Loading state */}
            {isLoading && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-2.5">
                <Loader2 className="w-4 h-4 text-[#0FA958] animate-spin shrink-0" />
                <span className="text-xs text-[#064E3B] font-medium animate-pulse">
                  Analyzing stadium slots, pitch sizes, and pricing in Bangladesh...
                </span>
              </div>
            )}

            {/* AI Summary Bubble */}
            {!isLoading && aiResult && (
              <>
                <div className="p-3 bg-[#F7FAF8] border border-slate-200 rounded-xl flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-[#064E3B] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed flex-1">
                    {aiResult.summary}
                  </div>
                </div>

                {/* Matched Turfs preview cards */}
                {aiResult.turfIds.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#0FA958]" />
                      <span>Recommended Live Arenas</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {aiResult.turfIds.map((id) => {
                        const t = turfs.find((item) => item.id === id);
                        if (!t) return null;
                        return (
                          <div
                            key={t.id}
                            className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between hover:border-emerald-300 transition-colors shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className="text-xs font-bold text-[#0F172A] truncate">
                                {t.name}
                              </span>
                              <span className="text-[11px] font-mono font-bold text-[#064E3B] shrink-0">
                                BDT {t.hourlyRate.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#64748B] truncate mb-2.5">
                              📍 {t.area}, {t.city} • {t.sports.join(', ')}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleSelectTurf(t.id)}
                                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-[10px] font-semibold rounded-lg transition-all cursor-pointer text-center"
                              >
                                Details
                              </button>
                              <button
                                onClick={() => handleBookDirect(t.id)}
                                className="flex-1 py-1.5 bg-[#0FA958] hover:bg-[#0da052] active:scale-95 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                              >
                                <span>Book Slot</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
