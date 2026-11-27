// src/components/scoring/PlayerPickerList.jsx
import React, { useState, useMemo } from "react";
import { Search, X } from "lucide-react";

// === SECTION: PLAYER PICKER LIST COMPONENT START ===
export default function PlayerPickerList({
  title,
  playersList = [],
  teamObj,
  outPlayerIds = [],
  playerStats = {},
  disabledPlayerId = "",
  isBatsmanPicker = false,
  canClose = true,
  onSelectPlayer,
  onToggleLineStatus,
  onClose
}) {
  // === SECTION: SEARCH QUERY STATE START ===
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return playersList;
    return playersList.filter((pl) => {
      const name = String(pl.name || "").toLowerCase();
      const code = String(pl.playerCode || "").toLowerCase();
      const role = String(pl.role || "").toLowerCase();
      return name.includes(q) || code.includes(q) || role.includes(q);
    });
  }, [playersList, query]);
  // === SECTION: SEARCH QUERY STATE END ===

  return (
    <div className="space-y-2.5 text-white">
      {/* === SECTION: PICKER HEADER START === */}
      <div className="flex items-center justify-between bg-slate-900 px-3.5 py-2.5 rounded-2xl border border-slate-800">
        <h2 className="text-xs sm:text-sm font-black text-amber-300 truncate">
          {title}
        </h2>
        {canClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-200 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {/* === SECTION: PICKER HEADER END === */}

      {/* === SECTION: SEARCH & PLAYER ROWS START === */}
      <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="नाव किंवा ID शोधा..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
          />
        </div>

        <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((pl, idx) => {
              const isAlreadyOut =
                isBatsmanPicker &&
                (Boolean(playerStats?.[pl.id]?.out) ||
                  outPlayerIds.includes(pl.id));
              const isSameAsOtherCreaseBatter =
                isBatsmanPicker &&
                Boolean(disabledPlayerId) &&
                pl.id === disabledPlayerId;
              const isBlocked =
                pl.id === disabledPlayerId ||
                isAlreadyOut ||
                isSameAsOtherCreaseBatter;

              const statusLabel =
                teamObj?.squadRoster?.[pl.id]?.status === "bench"
                  ? "Bench"
                  : "Playing";

              return (
                <div
                  key={pl.id}
                  onClick={() => !isBlocked && onSelectPlayer(pl.id)}
                  className={`py-2 px-2 flex items-center justify-between gap-2 rounded-xl text-xs ${
                    isBlocked
                      ? "opacity-40 cursor-not-allowed bg-slate-950/50"
                      : "hover:bg-slate-800/70 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 text-[11px] font-mono text-slate-400 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-black text-white truncate">
                        {pl.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {pl.playerCode || ""}{" "}
                        {pl.role ? `• ${pl.role}` : ""}
                        {isSameAsOtherCreaseBatter
                          ? " • दुसऱ्या End वर"
                          : ""}
                      </div>
                    </div>
                  </div>

                  {isAlreadyOut ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
                      Out
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLineStatus(pl);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-black cursor-pointer shrink-0 ${
                        statusLabel === "Playing"
                          ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      {statusLabel}
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-5 text-center text-xs text-slate-400">
              खेळाडू सापडले नाहीत.
            </div>
          )}
        </div>
      </div>
      {/* === SECTION: SEARCH & PLAYER ROWS END === */}
    </div>
  );
}
// === SECTION: PLAYER PICKER LIST COMPONENT END ===