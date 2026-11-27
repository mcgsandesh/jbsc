// src/components/scoring/ScoringKeypad.jsx
import React, { useState } from "react";
import { Sparkles, X } from "lucide-react";

// === SECTION: CONSTANTS START ===
const WICKET_TYPES = [
  "Bowled",
  "Caught",
  "Stumped",
  "LBW",
  "Run Out",
  "Mankad",
  "Retired",
  "Over The Fence",
  "One Hand One Bounce",
  "Obstructing The Field",
  "Hit Wicket",
  "Hit The Ball Twice",
  "Timed Out"
];

const BONUS_OPTIONS = [1, 2, 3, 4, 5, 6, 8];
const EXTRA_BAT_RUNS = [5, 7, 8, 9, 10];
// === SECTION: CONSTANTS END ===

// === SECTION: SCORING KEYPAD & MODES START ===
export default function ScoringKeypad({
  magicBallActive,
  onToggleMagicBall,
  pendingDeclareChoice,
  onClearDeclareChoice,
  onCommitBall,
  onRunClick,
  onExtraClick,
  onBonusClick,
  onWicketClick,
  onEndInningsRequest,
  onNextInnings,
  onUndo
}) {
  // === SECTION: KEYPAD LOCAL SHEET STATE START ===
  // null | "more" | "bonus" | "wicket" | "high_runs" | "extras_wd" | "extras_nb" | "extras_bye" | "extras_lb"
  const [sheet, setSheet] = useState(null);
  const [bonusSign, setBonusSign] = useState(1);
  // === SECTION: KEYPAD LOCAL SHEET STATE END ===

  return (
    <div className="space-y-2">
      {/* === SECTION: MAGIC BALL TOGGLE START === */}
      <div className="bg-slate-900 rounded-2xl p-2 border border-slate-800">
        <button
          type="button"
          onClick={onToggleMagicBall}
          className={`w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black border cursor-pointer ${
            magicBallActive
              ? "bg-purple-500 text-white border-purple-300"
              : "bg-slate-950 text-purple-300 border-slate-700 hover:bg-slate-800"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {magicBallActive
              ? "Magic Ball ON (Double All, Out → 2nd Out)"
              : "Magic Ball OFF"}
          </span>
        </button>
      </div>
      {/* === SECTION: MAGIC BALL TOGGLE END === */}

      {/* === SECTION: DECLARE VS RUN CHOICE POPUP START === */}
      {pendingDeclareChoice && (
        <div className="bg-slate-900 p-3 rounded-2xl border-2 border-amber-400 space-y-2 text-xs">
          <div className="flex items-center justify-between font-black text-amber-300">
            <span>{pendingDeclareChoice.label} — Declare की Run?</span>
            <button
              type="button"
              onClick={onClearDeclareChoice}
              className="text-slate-400 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                onCommitBall(
                  pendingDeclareChoice.runsValue,
                  pendingDeclareChoice.extrasType,
                  pendingDeclareChoice.extrasRuns,
                  true,
                  false
                )
              }
              className="py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black cursor-pointer"
            >
              Declare (Strike नाही)
            </button>
            <button
              type="button"
              onClick={() =>
                onCommitBall(
                  pendingDeclareChoice.runsValue,
                  pendingDeclareChoice.extrasType,
                  pendingDeclareChoice.extrasRuns,
                  false,
                  true
                )
              }
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-black cursor-pointer"
            >
              Run (Strike बदलेल)
            </button>
          </div>
        </div>
      )}
      {/* === SECTION: DECLARE VS RUN CHOICE POPUP END === */}

      {/* === SECTION: HIGH RUNS (5, 7, 8, 9, 10) SHEET START === */}
      {sheet === "high_runs" && (
        <div className="bg-slate-900 p-2.5 rounded-2xl border border-amber-400/50 space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-amber-300">
            <span>जास्त Runs निवडा (5, 7, 8, 9, 10)</span>
            <button
              type="button"
              onClick={() => setSheet(null)}
              className="text-slate-400 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1.5 text-xs font-black">
            {EXTRA_BAT_RUNS.map((rVal) => (
              <button
                key={rVal}
                type="button"
                onClick={() => {
                  setSheet(null);
                  onRunClick(rVal);
                }}
                className="py-2 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-amber-300 cursor-pointer"
              >
                {rVal}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* === SECTION: HIGH RUNS (5, 7, 8, 9, 10) SHEET END === */}

      {/* === SECTION: EXTRAS SHEETS (WD / NB / BYE / LB) START === */}
      {(sheet === "extras_wd" ||
        sheet === "extras_nb" ||
        sheet === "extras_bye" ||
        sheet === "extras_lb") && (
        <div className="bg-slate-900 p-2.5 rounded-2xl border border-amber-400/50 space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-amber-300">
            <span>
              {sheet === "extras_wd"
                ? "Wide Runs"
                : sheet === "extras_nb"
                ? "No Ball (NB) Runs"
                : sheet === "extras_bye"
                ? "Bye Runs"
                : "Leg Bye (LB) Runs"}
            </span>
            <button
              type="button"
              onClick={() => setSheet(null)}
              className="text-slate-400 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {sheet === "extras_wd" && (
            <div className="grid grid-cols-6 gap-1.5 text-xs font-black">
              {[0, 1, 2, 3, 4, 6].map((add) => (
                <button
                  key={add}
                  type="button"
                  onClick={() => {
                    setSheet(null);
                    onExtraClick("wd", 0, 1 + add, add === 0 ? "Wd" : `Wd+${add}`);
                  }}
                  className="py-2 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-amber-300 cursor-pointer"
                >
                  {add === 0 ? "Wd" : `Wd+${add}`}
                </button>
              ))}
            </div>
          )}

          {sheet === "extras_nb" && (
            <div className="grid grid-cols-6 gap-1.5 text-xs font-black">
              {[0, 1, 2, 3, 4, 6].map((add) => (
                <button
                  key={add}
                  type="button"
                  onClick={() => {
                    setSheet(null);
                    onExtraClick("nb", add, 1, add === 0 ? "NB" : `NB+${add}`);
                  }}
                  className="py-2 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-amber-300 cursor-pointer"
                >
                  {add === 0 ? "NB" : `NB+${add}`}
                </button>
              ))}
            </div>
          )}

          {(sheet === "extras_bye" || sheet === "extras_lb") && (
            <div className="grid grid-cols-5 gap-1.5 text-xs font-black">
              {[1, 2, 3, 4, 6].map((r) => {
                const isBye = sheet === "extras_bye";
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setSheet(null);
                      onExtraClick(
                        isBye ? "bye" : "lb",
                        0,
                        r,
                        isBye ? `${r}B` : `${r}LB`
                      );
                    }}
                    className="py-2 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-white cursor-pointer"
                  >
                    {isBye ? `${r}B` : `${r}LB`}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* === SECTION: EXTRAS SHEETS (WD / NB / BYE / LB) END === */}

      {/* === SECTION: MORE / BONUS / WICKET SHEETS START === */}
      {sheet === "more" && (
        <div className="bg-slate-900 p-2.5 rounded-2xl border border-slate-700 space-y-1.5 text-xs">
          <div className="flex items-center justify-between font-black text-amber-300">
            <span>More Options</span>
            <button
              type="button"
              onClick={() => setSheet(null)}
              className="cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setSheet("bonus")}
              className="py-2 rounded-lg bg-slate-800 text-amber-300 font-black cursor-pointer"
            >
              Bonus Runs (+ / -)
            </button>
            <button
              type="button"
              onClick={() => {
                setSheet(null);
                onEndInningsRequest();
              }}
              className="py-2 rounded-lg bg-slate-800 text-white font-black cursor-pointer"
            >
              End Innings
            </button>
            <button
              type="button"
              onClick={() => {
                setSheet(null);
                onNextInnings();
              }}
              className="py-2 rounded-lg bg-amber-400 text-slate-950 font-black cursor-pointer col-span-2"
            >
              Next Innings
            </button>
          </div>
        </div>
      )}

      {sheet === "bonus" && (
        <div className="bg-slate-900 p-2.5 rounded-2xl border border-amber-400/40 space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-amber-300">
            <span>Bonus / Penalty (फक्त Team Runs)</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setBonusSign(1)}
                className={`w-6 h-6 rounded font-black cursor-pointer ${
                  bonusSign === 1
                    ? "bg-amber-400 text-slate-950"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setBonusSign(-1)}
                className={`w-6 h-6 rounded font-black cursor-pointer ${
                  bonusSign === -1
                    ? "bg-rose-500 text-white"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setSheet(null)}
                className="cursor-pointer ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {BONUS_OPTIONS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setSheet(null);
                  onBonusClick(val * bonusSign);
                }}
                className="py-1.5 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-xs font-black cursor-pointer"
              >
                {bonusSign > 0 ? `+${val}` : `-${val}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {sheet === "wicket" && (
        <div className="bg-slate-900 p-2.5 rounded-2xl border border-rose-500/40 space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-rose-400">
            <span>Wicket Type</span>
            <button
              type="button"
              onClick={() => setSheet(null)}
              className="cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {WICKET_TYPES.map((wt) => (
              <button
                key={wt}
                type="button"
                onClick={() => {
                  setSheet(null);
                  onWicketClick(wt);
                }}
                className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-rose-500 hover:text-white text-[11px] font-bold text-left truncate cursor-pointer"
              >
                {wt}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* === SECTION: MORE / BONUS / WICKET SHEETS END === */}

      {/* === SECTION: 6-COLUMN FINGER-TIP KEYPAD START === */}
      <div className="bg-amber-400 text-slate-950 rounded-2xl overflow-hidden border border-amber-300 grid grid-cols-6 divide-x divide-y divide-amber-500/40 text-xs font-black">
        {[1, 2, 3, 4, 6].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onRunClick(r)}
            className="py-3 hover:bg-amber-300 cursor-pointer"
          >
            {r}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setSheet((p) => (p === "high_runs" ? null : "high_runs"))}
          className="py-3 bg-amber-500/40 hover:bg-amber-300 cursor-pointer text-[11px]"
          title="5, 7, 8, 9, 10 Runs"
        >
          5, 7..
        </button>

        <button
          type="button"
          onClick={() => setSheet((p) => (p === "extras_lb" ? null : "extras_lb"))}
          className="py-3 hover:bg-amber-300 cursor-pointer"
        >
          LB
        </button>
        <button
          type="button"
          onClick={() => setSheet((p) => (p === "extras_bye" ? null : "extras_bye"))}
          className="py-3 hover:bg-amber-300 cursor-pointer"
        >
          Bye
        </button>
        <button
          type="button"
          onClick={() => setSheet((p) => (p === "extras_wd" ? null : "extras_wd"))}
          className="py-3 hover:bg-amber-300 cursor-pointer"
        >
          Wide
        </button>
        <button
          type="button"
          onClick={() => setSheet((p) => (p === "extras_nb" ? null : "extras_nb"))}
          className="py-3 hover:bg-amber-300 cursor-pointer"
        >
          NB
        </button>
        <button
          type="button"
          onClick={() => onCommitBall(0, "none", 0, false, false)}
          className="py-3 hover:bg-amber-300 cursor-pointer"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => onCommitBall(1, "none", 0, false, true)}
          className="py-3 hover:bg-amber-300 cursor-pointer text-[11px]"
        >
          Ov.Thrw
        </button>

        <button
          type="button"
          onClick={() => setSheet((p) => (p === "more" ? null : "more"))}
          className="py-3 hover:bg-amber-300 cursor-pointer col-span-2"
        >
          More
        </button>
        <button
          type="button"
          onClick={() => {
            setBonusSign(1);
            setSheet("bonus");
          }}
          className="py-3 hover:bg-amber-300 cursor-pointer"
        >
          Bonus
        </button>
        <button
          type="button"
          onClick={onUndo}
          className="py-3 hover:bg-amber-300 cursor-pointer"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={() => setSheet((p) => (p === "wicket" ? null : "wicket"))}
          className="py-3 bg-rose-600 text-white hover:bg-rose-500 cursor-pointer col-span-2"
        >
          Out
        </button>
      </div>
      {/* === SECTION: 6-COLUMN FINGER-TIP KEYPAD END === */}
    </div>
  );
}
// === SECTION: SCORING KEYPAD & MODES END ===