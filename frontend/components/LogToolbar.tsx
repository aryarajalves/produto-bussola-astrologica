import React from "react";

interface LogToolbarProps {
  textFilter: string;
  onTextFilterChange: (val: string) => void;
  tailCount: number;
  onTailCountChange: (val: number) => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  loading: boolean;
  onRefresh: () => void;
  onCopy: () => void;
  onScrollToBottom: () => void;
}

export default function LogToolbar({
  textFilter,
  onTextFilterChange,
  tailCount,
  onTailCountChange,
  autoRefresh,
  onToggleAutoRefresh,
  loading,
  onRefresh,
  onCopy,
  onScrollToBottom,
}: LogToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex-1 min-w-[240px] relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        <input
          type="text"
          placeholder="Filtrar por texto nos logs..."
          value={textFilter}
          onChange={(e) => onTextFilterChange(e.target.value)}
          className="w-full bg-[#10141e]/90 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {/* Seletor de Linhas */}
        <div className="flex items-center gap-1.5 bg-[#10141e]/90 border border-slate-800/80 px-3 py-1.5 rounded-xl text-slate-300">
          <span className="text-slate-400">Linhas:</span>
          <select
            value={tailCount}
            onChange={(e) => onTailCountChange(Number(e.target.value))}
            className="bg-transparent text-cyan-400 font-medium outline-none cursor-pointer text-xs"
          >
            <option value={50} className="bg-[#10141e] text-white">50 linhas</option>
            <option value={100} className="bg-[#10141e] text-white">100 linhas</option>
            <option value={200} className="bg-[#10141e] text-white">200 linhas</option>
            <option value={500} className="bg-[#10141e] text-white">500 linhas</option>
            <option value={1000} className="bg-[#10141e] text-white">1000 linhas</option>
          </select>
        </div>

        {/* Auto Refresh */}
        <button
          onClick={onToggleAutoRefresh}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
            autoRefresh
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 animate-pulse"
              : "bg-[#10141e]/90 text-slate-300 border-slate-800/80 hover:bg-[#171d2b]"
          }`}
        >
          <span className="text-emerald-400 text-sm">~</span>
          <span>Auto ({autoRefresh ? "Ligado" : "Desligado"})</span>
        </button>

        {/* Atualizar */}
        <button
          onClick={onRefresh}
          disabled={loading}
          data-testid="btn-atualizar-logs"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#10141e]/90 hover:bg-[#171d2b] border border-slate-800/80 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={loading ? "animate-spin" : ""}
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          <span>Atualizar</span>
        </button>

        {/* Copiar */}
        <button
          onClick={onCopy}
          data-testid="btn-copiar-logs"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#10141e]/90 hover:bg-[#171d2b] border border-slate-800/80 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>Copiar</span>
        </button>

        {/* Fim (Rolar para o fim) */}
        <button
          onClick={onScrollToBottom}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#10141e]/90 hover:bg-[#171d2b] border border-slate-800/80 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="7 13 12 18 17 13" />
            <polyline points="7 6 12 11 17 6" />
          </svg>
          <span>Fim</span>
        </button>
      </div>
    </div>
  );
}
