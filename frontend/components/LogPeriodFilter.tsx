import React from "react";

interface LogPeriodFilterProps {
  filterDate: string;
  onFilterDateChange: (val: string) => void;
  onSetToday: () => void;
  filterStartTime: string;
  onFilterStartTimeChange: (val: string) => void;
  filterEndTime: string;
  onFilterEndTimeChange: (val: string) => void;
  loading: boolean;
  onApplyFilter: () => void;
}

export default function LogPeriodFilter({
  filterDate,
  onFilterDateChange,
  onSetToday,
  filterStartTime,
  onFilterStartTimeChange,
  filterEndTime,
  onFilterEndTimeChange,
  loading,
  onApplyFilter,
}: LogPeriodFilterProps) {
  return (
    <div className="bg-[#10141e]/90 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-2 bg-[#171d2b] border border-slate-800 px-3 py-1.5 rounded-xl">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-slate-400">Data:</span>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => onFilterDateChange(e.target.value)}
            className="bg-transparent text-white outline-none cursor-pointer text-xs"
          />
        </div>

        <button
          onClick={onSetToday}
          className="px-3 py-1.5 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600/30 text-xs font-medium cursor-pointer transition-colors"
        >
          Hoje
        </button>

        <div className="flex items-center gap-2 bg-[#171d2b] border border-slate-800 px-3 py-1.5 rounded-xl">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="text-slate-400">De:</span>
          <input
            type="time"
            value={filterStartTime}
            onChange={(e) => onFilterStartTimeChange(e.target.value)}
            className="bg-transparent text-white outline-none cursor-pointer text-xs"
          />
        </div>

        <div className="flex items-center gap-2 bg-[#171d2b] border border-slate-800 px-3 py-1.5 rounded-xl">
          <span className="text-slate-400">Até:</span>
          <input
            type="time"
            value={filterEndTime}
            onChange={(e) => onFilterEndTimeChange(e.target.value)}
            className="bg-transparent text-white outline-none cursor-pointer text-xs"
          />
        </div>
      </div>

      <button
        onClick={onApplyFilter}
        disabled={loading}
        data-testid="btn-filtrar-periodo"
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs shadow-lg shadow-cyan-500/20 cursor-pointer transition-all disabled:opacity-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span>Filtrar período</span>
      </button>
    </div>
  );
}
