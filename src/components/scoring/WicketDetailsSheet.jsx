// src/components/scoring/WicketDetailsSheet.jsx
import React, { useState, useMemo } from "react";
import { X, Search } from "lucide-react";

// === SECTION: WICKET DETAILS SHEET START ===
export default function WicketDetailsSheet({
  wicketType,
  bowlingPlayers = [],
  strikerObj,
  nonStrikerObj,
  onConfirmWicket,
  onCancel
}) {
  // === SECTION: LOCAL STATE START ===
  const [fielderId, setFielderId] = useState("");
  const [fielderQuery, setFielderQuery] = useState("");
  const [runOutTarget, setRunOutTarget] = useState("striker"); // "striker" | "non_striker"
  const [runOutRuns, setRunOutRuns] = useState(0); // 0, 1, 2, 3
  const [isRunOutNoBall, setIsRunOutNoBall] = useState(false);

  const isCaught = wicketType === "Caught";
  const isStumped = wicketType === "Stumped";
  const isRunOut = wicketType === "Run Out";
  const needsBowlingTeamList = isCaught || isStumped || isRunOut;

  const filteredBowlers = useMemo(() => {
    const q = fielderQuery.trim().toLowerCase();
    if (!q) return bowlingPlayers;
    return bowlingPlayers.filter((pl) =>
      String(pl.name || "").toLowerCase().includes(q)
    );
  }, [bowlingPlayers, fielderQuery]);
  // === SECTION: LOCAL STATE END ===

  // === SECTION: CONFIRM HANDLER START ===
  const handleConfirm = () => {
    if (isRunOut) {
      const victimId =
        runOutTarget === "non_striker"
          ? nonStrikerObj?.id || strikerObj?.id || ""
          : strikerObj?.id || "";

      onConfirmWicket({
        wicketType: "Run Out",
        isRunOut: true,
        runOutTarget,
        isNoBall: isRunOutNoBall,
        extrasType: isRunOutNoBall ? "nb" : "none",
        extrasRuns: isRunOutNoBall ? 1 : 0,
        runs: runOutRuns,
        runOutRunNumber: runOutRuns,
        runOutPlayerId: victimId,
        fielderId
      });
      return;
    }

    onConfirmWicket({
      wicketType,
      isRunOut: false,
      fielderId
    });
  };
  // === SECTION: CONFIRM HANDLER END ===

  return (
    <div className="bg-slate-900 rounded-2xl p-3.5 border-2 border-rose-500/60 space-y-3 text-xs text-white">
      {/* === SECTION: MODAL HEADER START === */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-sm font-black text-rose-400">
          {wicketType} — तपशील निवडा
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* === SECTION: MODAL HEADER END === */}

      {/* === SECTION: RUN OUT OPTIONS START === */}
      {isRunOut && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="font-black text-amber-300">कोण Run Out झाला?</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRunOutTarget("striker")}
                className={`py-2 px-2.5 rounded-xl border font-black truncate cursor-pointer ${
                  runOutTarget === "striker"
                    ? "bg-amber-400 text-slate-950 border-amber-300"
                    : "bg-slate-950 text-slate-200 border-slate-700"
                }`}
              >
                Striker ({strikerObj?.name || "Striker"})
              </button>
              <button
                type="button"
                onClick={() => setRunOutTarget("non_striker")}
                className={`py-2 px-2.5 rounded-xl border font-black truncate cursor-pointer ${
                  runOutTarget === "non_striker"
                    ? "bg-amber-400 text-slate-950 border-amber-300"
                    : "bg-slate-950 text-slate-200 border-slate-700"
                }`}
              >
                Non-Striker ({nonStrikerObj?.name || "Non-Striker"})
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="font-black text-amber-300">
              कितव्या Run वर Run Out झाला?
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 1, 2, 3].map((rNum) => (
                <button
                  key={rNum}
                  type="button"
                  onClick={() => setRunOutRuns(rNum)}
                  className={`py-2 rounded-xl border font-black cursor-pointer ${
                    runOutRuns === rNum
                      ? "bg-amber-400 text-slate-950 border-amber-300"
                      : "bg-slate-950 text-slate-200 border-slate-700"
                  }`}
                >
                  {rNum === 0
                    ? "0 Run"
                    : rNum === 1
                    ? "1st Run"
                    : rNum === 2
                    ? "2nd Run"
                    : "3rd Run"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <span className="font-black text-slate-200">
              हा चेंडू No Ball होता का?
            </span>
            <button
              type="button"
              onClick={() => setIsRunOutNoBall((v) => !v)}
              className={`px-3 py-1 rounded-lg font-black cursor-pointer ${
                isRunOutNoBall
                  ? "bg-rose-600 text-white"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {isRunOutNoBall ? "होय (No Ball + Runs)" : "नाही"}
            </button>
          </div>
        </div>
      )}
      {/* === SECTION: RUN OUT OPTIONS END === */}

      {/* === SECTION: BOWLING TEAM FIELDER PICKER START === */}
      {needsBowlingTeamList && (
        <div className="space-y-2">
          <div className="font-black text-amber-300">
            {isCaught
              ? "कोणी Catch पकडली? (Bowling Team)"
              : isStumped
              ? "कोणी Stumped केले? (Bowling Team)"
              : "कोणी Run Out केले? (Bowling Team)"}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={fielderQuery}
              onChange={(e) => setFielderQuery(e.target.value)}
              placeholder="खेळाडू शोधा..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
            />
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-slate-800 bg-slate-950 rounded-xl border border-slate-800">
            {filteredBowlers.length > 0 ? (
              filteredBowlers.map((pl) => {
                const selected = fielderId === pl.id;
                return (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => setFielderId(pl.id)}
                    className={`w-full px-3 py-2 flex items-center justify-between text-left cursor-pointer ${
                      selected
                        ? "bg-amber-400 text-slate-950 font-black"
                        : "hover:bg-slate-800 text-slate-200 font-bold"
                    }`}
                  >
                    <span className="truncate">{pl.name}</span>
                    <span className="text-[10px]">
                      {selected ? "निवडले ✓" : "निवडा"}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-slate-400">
                Bowling Team मध्ये खेळाडू सापडले नाहीत.
              </div>
            )}
          </div>
        </div>
      )}
      {/* === SECTION: BOWLING TEAM FIELDER PICKER END === */}

      {/* === SECTION: ACTION BUTTONS START === */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black cursor-pointer"
        >
          Confirm Out
        </button>
      </div>
      {/* === SECTION: ACTION BUTTONS END === */}
    </div>
  );
}
// === SECTION: WICKET DETAILS SHEET END ===