// src/components/scoring/MatchScoringView.jsx
import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import {
  MATCH_FORMATS,
  calculateSingleBallImpact,
  detectMatchEndCondition,
  formatOversFromBalls
} from "../../services/matchRulesHelper";
import {
  getMatches,
  getTeams,
  getPlayers,
  saveMatchFixture,
  recordMatchBall,
  undoLastMatchBall,
  declareMatchInnings,
  startNextInnings,
  startSuperOverInnings,
  setActiveBattersAndBowler,
  setTeamPlayerLineStatus,
  applyBonusRuns
} from "../../services/scoringLocalEngine";
import { showSuccess, showError } from "../../utils/alert";
import PlayerPickerList from "./PlayerPickerList";
import ScoringKeypad from "./ScoringKeypad";
import WicketDetailsSheet from "./WicketDetailsSheet";
import MatchCentreTabsView from "./MatchCentreTabsView";

// === SECTION: MATCH SCORING VIEW COMPONENT START ===
export default function MatchScoringView({ matchId = "", onBackToFixtures }) {
  // === SECTION: STATE START ===
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [activeMatchId, setActiveMatchId] = useState(matchId || "");

  const [centreTab, setCentreTab] = useState("scoring");
  const [pickerType, setPickerType] = useState(null);
  const [wicketModalType, setWicketModalType] = useState(null); // null | "Caught" | "Stumped" | "Run Out"
  const [pendingDeclareChoice, setPendingDeclareChoice] = useState(null);
  const [confirmPrompt, setConfirmPrompt] = useState(null);
  const [scorerWinnerPick, setScorerWinnerPick] = useState(false);

  const [mustSelectNextBowler, setMustSelectNextBowler] = useState(false);
  const [lastOverBowlerId, setLastOverBowlerId] = useState("");
  const [magicBallActive, setMagicBallActive] = useState(false);
  const [pendingMagicWicketType, setPendingMagicWicketType] = useState("");
  // === SECTION: STATE END ===

  // === SECTION: LOAD DATA START ===
  const reloadData = () => {
    const mt = getMatches();
    const tm = getTeams();
    const pl = getPlayers();
    const chosen = matchId || activeMatchId || (mt?.[0]?.id ?? "");

    console.log("[SCORING_LOG][reloadData]", {
      propMatchId: matchId,
      prevActiveMatchId: activeMatchId,
      chosenMatchId: chosen,
      matchesCount: Array.isArray(mt) ? mt.length : 0,
      teamsCount: Array.isArray(tm) ? tm.length : 0,
      playersCount: Array.isArray(pl) ? pl.length : 0
    });

    setMatches(Array.isArray(mt) ? mt : []);
    setTeams(Array.isArray(tm) ? tm : []);
    setPlayers(Array.isArray(pl) ? pl : []);
    setActiveMatchId(chosen);
  };

  useEffect(() => {
    console.log("[SCORING_LOG][useEffect matchId]", { matchId, centreTab });
    reloadData();
  }, [matchId]);

  const match = useMemo(() => {
    const found = matches.find((m) => m.id === activeMatchId) || null;
    console.log("[SCORING_LOG][match memo]", {
      activeMatchId,
      foundMatchId: found?.id || null,
      status: found?.status || null,
      activeInningsIndex: found?.activeInningsIndex,
      inningsCount: found?.innings?.length || 0,
      allInningsBallsCount: (found?.innings || []).map((inn, i) => ({
        innIndex: i,
        battingTeamId: inn?.battingTeamId,
        bowlingTeamId: inn?.bowlingTeamId,
        runs: inn?.runs,
        wickets: inn?.wickets,
        ballsCount: inn?.balls?.length || 0
      }))
    });
    return found;
  }, [matches, activeMatchId]);

  const teamMap = useMemo(
    () => Object.fromEntries((teams || []).map((t) => [t.id, t])),
    [teams]
  );

  const playerMap = useMemo(
    () => Object.fromEntries((players || []).map((p) => [p.id, p])),
    [players]
  );
  // === SECTION: LOAD DATA END ===

  // === SECTION: INNINGS & FEED START ===
  const inningsArr = Array.isArray(match?.innings) ? match.innings : [];
  const activeInnIdx =
    typeof match?.activeInningsIndex === "number"
      ? match.activeInningsIndex
      : 0;
  const currentInn = inningsArr[activeInnIdx] || inningsArr[0] || null;
  const firstInn = inningsArr[0] || null;
  const isSecondInnings = activeInnIdx >= 1 && Boolean(firstInn);

  const battingTeam = currentInn ? teamMap[currentInn.battingTeamId] : null;
  const bowlingTeam = currentInn ? teamMap[currentInn.bowlingTeamId] : null;

  console.log("[SCORING_LOG][currentInn state]", {
    activeInnIdx,
    inningsSummary: inningsArr.map((inn, i) => ({
      idx: i,
      battingTeamId: inn?.battingTeamId,
      bowlingTeamId: inn?.bowlingTeamId,
      runs: inn?.runs,
      wickets: inn?.wickets,
      legalBalls: inn?.legalBalls,
      ballsLen: inn?.balls?.length || 0
    })),
    currentInnBallsLen: currentInn?.balls?.length || 0,
    battingTeamName: battingTeam?.name || null,
    bowlingTeamName: bowlingTeam?.name || null
  });

  const getTeamRoster = (tm) => {
    if (!tm) return players;
    const ids = Object.keys(tm.squadRoster || {});
    if (ids.length) {
      const mapped = ids.map((id) => playerMap[id]).filter(Boolean);
      if (mapped.length > 0) return mapped;
    }
    const byTeam = (players || []).filter((p) => p && p.teamId === tm.id);
    return byTeam.length > 0 ? byTeam : players;
  };

  const ballsFeedItems = useMemo(() => {
    if (!currentInn || !match) {
      console.log("[SCORING_LOG][ballsFeedItems] skipped - missing currentInn or match", {
        hasMatch: Boolean(match),
        hasCurrentInn: Boolean(currentInn)
      });
      return [];
    }
    const bpoVal = Math.max(1, Number(match.ballsPerOver || 6));
    let runs = Number(currentInn.bonusRuns || 0);
    let wickets = 0;
    let legal = 0;
    let overStart = 0;
    const list = [];

    (currentInn.balls || []).forEach((bl, idx) => {
      const imp = calculateSingleBallImpact(bl, match);
      runs += imp.totalRuns;
      wickets += imp.wicketsInc;
      legal += imp.legalBallsInc;

      const overDone =
        imp.legalBallsInc > 0 && legal > 0 && legal % bpoVal === 0;
      const ovNum = legal / bpoVal;

      list.push({
        type: "ball",
        id: bl.id || `b_${idx}`,
        effBat: imp.effBat,
        effExt: imp.effExt,
        extrasType: imp.extType,
        isWicket: Boolean(bl.isWicket),
        wicketType: bl.wicketType || "",
        isMagicBall: imp.isMagic,
        isDeclare: imp.isDeclare,
        strikerId: bl.strikerId,
        bowlerId: bl.bowlerId,
        overCompletedNow: overDone,
        completedOverNumber: ovNum,
        scoreAfter: `${runs}-${wickets}`,
        oversAfter: formatOversFromBalls(legal, bpoVal)
      });

      if (overDone) {
        const slice = (currentInn.balls || []).slice(overStart, idx + 1);
        const overRuns = slice.reduce(
          (s, b) => s + calculateSingleBallImpact(b, match).totalRuns,
          0
        );
        list.push({
          type: "over_summary",
          id: `ov_${ovNum}`,
          overNumber: ovNum,
          overRuns,
          scoreAtEnd: `${runs}-${wickets}`,
          bowlerName: playerMap[bl.bowlerId]?.name || "Bowler",
          strikerName: playerMap[bl.strikerId]?.name || "Batter",
          balls: slice
        });
        overStart = idx + 1;
      }
    });

    console.log("[SCORING_LOG][ballsFeedItems built]", {
      rawBallsCount: currentInn.balls?.length || 0,
      feedItemsCount: list.length,
      list
    });
    return list;
  }, [currentInn, match, playerMap]);
  // === SECTION: INNINGS & FEED END ===

  if (!match || !currentInn) {
    console.log("[SCORING_LOG][render guard] no match or currentInn", {
      matchId: activeMatchId,
      hasMatch: Boolean(match),
      hasCurrentInn: Boolean(currentInn)
    });
    return (
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 text-center space-y-3">
        <div className="text-sm font-black">सामना निवडलेला नाही</div>
        {onBackToFixtures && (
          <button
            type="button"
            onClick={onBackToFixtures}
            className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-black cursor-pointer"
          >
            ← सामने यादी
          </button>
        )}
      </div>
    );
  }

  const isMatchFinished = match.status === "completed";
  const winnerTeam = match.winnerTeamId ? teamMap[match.winnerTeamId] : null;
  const bpo = Math.max(1, Number(match.ballsPerOver || 6));

  // === SECTION: MATCH END HANDLERS START ===
  const checkEndAfterUpdate = (updatedMatch) => {
    if (!updatedMatch) return false;
    const cond = detectMatchEndCondition(updatedMatch);
    console.log("[SCORING_LOG][checkEndAfterUpdate]", {
      updatedMatchId: updatedMatch.id,
      cond
    });
    if (!cond) return false;
    setConfirmPrompt(cond);
    return true;
  };

  const handleConfirmYes = () => {
    if (!confirmPrompt) return;
    console.log("[SCORING_LOG][handleConfirmYes]", confirmPrompt);

    if (confirmPrompt.type === "end_first_innings") {
      declareMatchInnings(match.id);
      startNextInnings(match.id);
    } else if (confirmPrompt.type === "end_super_first_innings") {
      declareMatchInnings(match.id);
      startSuperOverInnings(
        match.id,
        currentInn.bowlingTeamId,
        currentInn.battingTeamId
      );
    } else if (
      confirmPrompt.type === "end_match_target_reached" ||
      confirmPrompt.type === "end_match_overs_done_chase_failed"
    ) {
      const wId = confirmPrompt.winnerTeamId || "";
      const wName = teamMap[wId]?.name || "Winner";
      saveMatchFixture({
        ...match,
        status: "completed",
        winnerTeamId: wId,
        resultText: `${wName} Won`
      });
    } else if (
      confirmPrompt.type === "tie_prompt" ||
      confirmPrompt.type === "super_over_tie_choice"
    ) {
      startSuperOverInnings(match.id, match.teamAId, match.teamBId);
    }

    setMustSelectNextBowler(false);
    setLastOverBowlerId("");
    setConfirmPrompt(null);
    setScorerWinnerPick(false);
    reloadData();
  };

  const handleConfirmNo = () => {
    if (!confirmPrompt) return;
    console.log("[SCORING_LOG][handleConfirmNo]", confirmPrompt);
    if (
      confirmPrompt.type === "tie_prompt" ||
      confirmPrompt.type === "super_over_tie_choice"
    ) {
      saveMatchFixture({
        ...match,
        status: "completed",
        isTied: true,
        winnerTeamId: "",
        resultText: "Match Tied (Equal Points)"
      });
      setConfirmPrompt(null);
      setScorerWinnerPick(false);
      reloadData();
      return;
    }
    setConfirmPrompt(null);
  };

  const finalizeWinnerByScorer = (winnerId) => {
    const wName = teamMap[winnerId]?.name || "Winner";
    console.log("[SCORING_LOG][finalizeWinnerByScorer]", { winnerId, wName });
    saveMatchFixture({
      ...match,
      status: "completed",
      winnerTeamId: winnerId,
      resultText: `${wName} Won (Super Over)`
    });
    setConfirmPrompt(null);
    setScorerWinnerPick(false);
    reloadData();
  };
  // === SECTION: MATCH END HANDLERS END ===

  // === SECTION: SCORING & WICKET HANDLERS START ===
  const ensureCanScore = () => {
    if (isMatchFinished) {
      showError(
        "सामना संपला",
        "हा सामना Finished आहे; पुढे स्कोअरिंग करता येणार नाही."
      );
      return false;
    }
    if (mustSelectNextBowler) {
      showError("Bowler बदला", "Over पूर्ण झाले आहे—नवीन Bowler निवडा.");
      setPickerType("bowler");
      return false;
    }
    if (!currentInn.strikerId || !currentInn.bowlerId) {
      showError("खेळाडू निवडा", "कृपया Striker आणि Bowler निवडा.");
      return false;
    }
    return true;
  };

  const commitBall = (
    runsValue,
    extrasType = "none",
    extrasRuns = 0,
    isDeclare = false,
    ranBetweenWickets = false,
    extraOpts = {}
  ) => {
    if (!ensureCanScore()) return;
    const prevLegal = Number(currentInn.legalBalls || 0);

    console.log("[SCORING_LOG][commitBall input]", {
      matchId: match.id,
      runsValue,
      extrasType,
      extrasRuns,
      isDeclare,
      ranBetweenWickets,
      magicBallActive,
      strikerId: currentInn.strikerId,
      nonStrikerId: currentInn.nonStrikerId,
      bowlerId: currentInn.bowlerId,
      extraOpts
    });

    const updated = recordMatchBall(match.id, {
      runs: runsValue,
      extrasType,
      extrasRuns,
      isDeclare,
      ranBetweenWickets,
      isMagicBall: magicBallActive,
      strikerId: currentInn.strikerId,
      nonStrikerId: currentInn.nonStrikerId,
      bowlerId: currentInn.bowlerId,
      ...extraOpts
    });

    console.log("[SCORING_LOG][commitBall updated match]", updated);

    const nextInn =
      updated?.innings?.[updated.activeInningsIndex || 0] ||
      updated?.innings?.[0];
    const nextLegal = Number(nextInn?.legalBalls || 0);

    if (!(magicBallActive && extrasType === "wd")) {
      setMagicBallActive(false);
    }
    setPendingDeclareChoice(null);
    reloadData();

    const matchEnded = checkEndAfterUpdate(updated);
    if (!matchEnded && nextLegal > prevLegal && nextLegal % bpo === 0) {
      setMustSelectNextBowler(true);
      setLastOverBowlerId(currentInn.bowlerId);
      setPickerType("bowler");
    }
  };

  const handleWicketAction = (wType, secondOutId = "", details = {}) => {
    if (!ensureCanScore()) return;

    if (
      !details?.fromDetailsSheet &&
      !secondOutId &&
      !pendingMagicWicketType &&
      (wType === "Caught" || wType === "Stumped" || wType === "Run Out")
    ) {
      setWicketModalType(wType);
      return;
    }

    if (magicBallActive && !secondOutId && !pendingMagicWicketType) {
      setPendingMagicWicketType(wType);
      setPickerType("magic_victim");
      return;
    }

    const prevLegal = Number(currentInn.legalBalls || 0);
    console.log("[SCORING_LOG][handleWicketAction]", {
      wType,
      secondOutId,
      magicBallActive,
      details
    });

    const updated = recordMatchBall(match.id, {
      runs: details.runs ?? 0,
      extrasType: details.extrasType || "none",
      extrasRuns: details.extrasRuns ?? 0,
      isNoBall: Boolean(details.isNoBall),
      isWicket: true,
      isRunOut: Boolean(details.isRunOut),
      wicketType: wType,
      runOutPlayerId: details.runOutPlayerId || "",
      runOutRunNumber: details.runOutRunNumber ?? 0,
      fielderId: details.fielderId || "",
      isMagicBall: magicBallActive,
      magicTargetPlayerId: magicBallActive ? secondOutId : "",
      strikerId: currentInn.strikerId,
      nonStrikerId: currentInn.nonStrikerId,
      bowlerId: currentInn.bowlerId
    });

    const nextInn =
      updated?.innings?.[updated.activeInningsIndex || 0] ||
      updated?.innings?.[0];
    const nextLegal = Number(nextInn?.legalBalls || 0);

    setMagicBallActive(false);
    setPendingMagicWicketType("");
    setWicketModalType(null);
    reloadData();

    const matchEnded = checkEndAfterUpdate(updated);
    if (!matchEnded) {
      if (nextLegal > prevLegal && nextLegal % bpo === 0) {
        setMustSelectNextBowler(true);
        setLastOverBowlerId(currentInn.bowlerId);
        setPickerType("bowler");
      } else if (details.runOutTarget === "non_striker") {
        setPickerType("non_striker");
      } else {
        setPickerType("striker");
      }
    }
  };
  // === SECTION: SCORING & WICKET HANDLERS END ===

  // === SECTION: CONFIRM PROMPT VIEW START ===
  if (confirmPrompt) {
    return (
      <div className="bg-slate-900 text-white rounded-2xl p-5 border-2 border-amber-400 space-y-4 text-xs">
        <div className="text-base font-black text-amber-300">
          {confirmPrompt.type === "end_first_innings"
            ? "End 1st Innings?"
            : confirmPrompt.type === "end_super_first_innings"
            ? "1st Super Over पूर्ण — 2nd Super Over सुरू करायची का?"
            : confirmPrompt.type === "tie_prompt"
            ? "Match Tied! Super Over खेळायचा का?"
            : confirmPrompt.type === "super_over_tie_choice"
            ? "Super Over देखील Tied! काय करायचे?"
            : `End Match — Winner: ${
                teamMap[confirmPrompt.winnerTeamId]?.name || "Winner"
              }`}
        </div>

        {confirmPrompt.type === "super_over_tie_choice" ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleConfirmYes}
                className="py-2.5 px-3 rounded-xl bg-amber-400 text-slate-950 font-black cursor-pointer"
              >
                Super Over पुन्हा घ्या
              </button>
              <button
                type="button"
                onClick={handleConfirmNo}
                className="py-2.5 px-3 rounded-xl bg-slate-800 text-white border border-slate-600 font-black cursor-pointer"
              >
                समान Points द्या
              </button>
            </div>
            <button
              type="button"
              onClick={() => setScorerWinnerPick((v) => !v)}
              className="w-full py-2 px-3 rounded-xl bg-slate-950 text-amber-300 border border-amber-400/40 font-black cursor-pointer"
            >
              Scorer कडून Winner निवडा
            </button>
            {scorerWinnerPick && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[match.teamAId, match.teamBId].filter(Boolean).map((tid) => (
                  <button
                    key={tid}
                    type="button"
                    onClick={() => finalizeWinnerByScorer(tid)}
                    className="py-2 px-3 rounded-xl bg-emerald-500 text-slate-950 font-black cursor-pointer"
                  >
                    {teamMap[tid]?.name || "Team"} Won
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleConfirmNo}
              className="py-2.5 px-3 rounded-xl bg-slate-800 text-slate-200 border border-slate-600 font-black cursor-pointer"
            >
              {confirmPrompt.type === "tie_prompt" ? "1 & 1 Points" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleConfirmYes}
              className="py-2.5 px-3 rounded-xl bg-amber-400 text-slate-950 font-black cursor-pointer"
            >
              {confirmPrompt.type === "tie_prompt" ? "Super Over" : "Confirm"}
            </button>
          </div>
        )}
      </div>
    );
  }
  // === SECTION: CONFIRM PROMPT VIEW END ===

  // === SECTION: WICKET DETAILS MODAL VIEW START ===
  if (wicketModalType) {
    return (
      <WicketDetailsSheet
        wicketType={wicketModalType}
        bowlingPlayers={getTeamRoster(bowlingTeam)}
        strikerObj={playerMap[currentInn.strikerId]}
        nonStrikerObj={playerMap[currentInn.nonStrikerId]}
        onCancel={() => setWicketModalType(null)}
        onConfirmWicket={(details) => {
          const wt = details.wicketType || wicketModalType;
          setWicketModalType(null);
          handleWicketAction(wt, "", { ...details, fromDetailsSheet: true });
        }}
      />
    );
  }
  // === SECTION: WICKET DETAILS MODAL VIEW END ===

  // === SECTION: PLAYER PICKER VIEW START ===
  if (pickerType) {
    const isBowler = pickerType === "bowler";
    const sideTeam = isBowler ? bowlingTeam : battingTeam;
    const isBatsmanPicker =
      pickerType === "striker" || pickerType === "non_striker";
    const sameSideDisabledId =
      pickerType === "striker"
        ? currentInn.nonStrikerId
        : pickerType === "non_striker"
        ? currentInn.strikerId
        : "";

    return (
      <PlayerPickerList
        title={
          pickerType === "striker"
            ? `Striker (${battingTeam?.name || "Batting"})`
            : pickerType === "non_striker"
            ? `Non-Striker (${battingTeam?.name || "Batting"})`
            : pickerType === "bowler"
            ? `Bowler (${bowlingTeam?.name || "Bowling"})`
            : `2nd Out Player (${battingTeam?.name || "Batting"})`
        }
        playersList={getTeamRoster(sideTeam)}
        teamObj={sideTeam}
        outPlayerIds={currentInn.outPlayerIds || []}
        playerStats={currentInn.playerStats || {}}
        disabledPlayerId={
          isBowler && mustSelectNextBowler
            ? lastOverBowlerId
            : pickerType === "magic_victim"
            ? currentInn.strikerId
            : sameSideDisabledId
        }
        isBatsmanPicker={isBatsmanPicker}
        canClose={!(isBowler && mustSelectNextBowler)}
        onSelectPlayer={(pid) => {
          console.log("[SCORING_LOG][onSelectPlayer]", { pickerType, pid });
          if (pickerType === "magic_victim") {
            const wt = pendingMagicWicketType || "Wicket";
            setPickerType(null);
            handleWicketAction(wt, pid);
            return;
          }
          setActiveBattersAndBowler(match.id, {
            strikerId: pickerType === "striker" ? pid : currentInn.strikerId,
            nonStrikerId:
              pickerType === "non_striker" ? pid : currentInn.nonStrikerId,
            bowlerId: pickerType === "bowler" ? pid : currentInn.bowlerId
          });
          if (pickerType === "bowler") {
            setMustSelectNextBowler(false);
            setLastOverBowlerId("");
          }
          setPickerType(null);
          reloadData();
        }}
        onToggleLineStatus={(pl) => {
          if (!sideTeam) return;
          const nextSt =
            sideTeam.squadRoster?.[pl.id]?.status === "bench"
              ? "playing"
              : "bench";
          setTeamPlayerLineStatus(sideTeam.id, pl.id, nextSt);
          reloadData();
        }}
        onClose={() => {
          setPendingMagicWicketType("");
          setPickerType(null);
        }}
      />
    );
  }
  // === SECTION: PLAYER PICKER VIEW END ===

  // === SECTION: LIVE STATS START ===
  const strikerObj = playerMap[currentInn.strikerId];
  const nonStrikerObj = playerMap[currentInn.nonStrikerId];
  const bowlerObj = playerMap[currentInn.bowlerId];
  const onlyBalls = ballsFeedItems.filter((x) => x.type === "ball");

  const sStat = currentInn.playerStats?.[currentInn.strikerId] || {
    runs: 0,
    balls: 0,
    sixes: 0
  };
  const nsStat = currentInn.playerStats?.[currentInn.nonStrikerId] || {
    runs: 0,
    balls: 0,
    sixes: 0
  };
  const bwStat = currentInn.playerStats?.[currentInn.bowlerId] || {
    ballsBowled: 0,
    runsConceded: 0,
    wickets: 0
  };

  const calcSr = (st) =>
    st.balls > 0 ? ((st.runs / st.balls) * 100).toFixed(1) : "0.0";
  const calcEco = (st) =>
    st.ballsBowled > 0
      ? (st.runsConceded / (st.ballsBowled / bpo)).toFixed(1)
      : "0.0";
  // === SECTION: LIVE STATS END ===

  return (
    <div className="space-y-2 text-white">
     {/* === SECTION: SCORE HEADER START === */}
      {(() => {
        const teamAObj = teamMap[match.teamAId];
        const teamBObj = teamMap[match.teamBId];
        const roundLabel =
          match.roundName || match.stageName || match.round || match.stage || "";
        const matchNoLabel = match.matchNumber
          ? `Match #${match.matchNumber}`
          : "";
        const dateTimeLabel = [match.matchDate || match.date, match.matchTime || match.time]
          .filter(Boolean)
          .join(" • ");

        // सामना संपल्यास किती runs किंवा wickets ने जिंकले ते अचूक मोजणे
        const computedFinishMargin = (() => {
          if (!isMatchFinished) return "";
          if (match.resultText) return match.resultText;
          if (match.isTied) return "Match Tied";
          if (!winnerTeam || inningsArr.length < 2) {
            return winnerTeam ? `${winnerTeam.name} Won` : "Match Completed";
          }
          const inn1 = inningsArr[0];
          const inn2 = inningsArr[1];
          const r1 = Number(inn1?.runs || 0);
          const r2 = Number(inn2?.runs || 0);
          if (winnerTeam.id === inn1?.battingTeamId && r1 > r2) {
            return `${winnerTeam.name} won by ${r1 - r2} run${r1 - r2 === 1 ? "" : "s"}`;
          }
          if (winnerTeam.id === inn2?.battingTeamId && r2 > r1) {
            const maxWkts = Math.max(1, Number(match.playersPerSide || 11) - 1);
            const wktsLeft = Math.max(1, maxWkts - Number(inn2?.wickets || 0));
            return `${winnerTeam.name} won by ${wktsLeft} wicket${wktsLeft === 1 ? "" : "s"}`;
          }
          return `${winnerTeam.name} Won`;
        })();

        return (
          <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 space-y-2">
            {/* Top Bar: Back + Tournament/Round/Date + Innings Badge */}
            <div className="flex items-center justify-between gap-2">
              {onBackToFixtures && (
                <button
                  type="button"
                  onClick={onBackToFixtures}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 text-[11px] font-bold cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>सामने</span>
                </button>
              )}

              <div className="min-w-0 text-center flex-1">
                <div className="text-[10px] font-bold text-slate-300 truncate">
                  {[match.tournamentName, matchNoLabel, roundLabel]
                    .filter(Boolean)
                    .join(" • ")}
                </div>
                {dateTimeLabel && (
                  <div className="text-[9px] text-slate-400 truncate">
                    {dateTimeLabel}
                  </div>
                )}
              </div>

              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 shrink-0">
                {isMatchFinished
                  ? "Finished"
                  : currentInn.isSuperOver
                  ? "Super Over"
                  : activeInnIdx === 0
                  ? "1st Innings"
                  : "2nd Innings"}
              </span>
            </div>

            {/* Teams VS Bar with Logos */}
            <div className="flex items-center justify-center gap-2 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-800/80 text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                {teamAObj?.logoUrl && (
                  <img
                    src={teamAObj.logoUrl}
                    alt={teamAObj.name}
                    className="w-5 h-5 rounded-full object-contain bg-black border border-slate-700 p-0.5 shrink-0"
                  />
                )}
                <span className="font-black text-slate-200 truncate">
                  {teamAObj?.name || "Team A"}
                </span>
              </div>

              <span className="text-[10px] font-black text-amber-400 px-1 shrink-0">
                VS
              </span>

              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-black text-slate-200 truncate">
                  {teamBObj?.name || "Team B"}
                </span>
                {teamBObj?.logoUrl && (
                  <img
                    src={teamBObj.logoUrl}
                    alt={teamBObj.name}
                    className="w-5 h-5 rounded-full object-contain bg-black border border-slate-700 p-0.5 shrink-0"
                  />
                )}
              </div>
            </div>

            {/* Main Active Batting Score */}
            <div className="text-center space-y-0.5">
              <div className="inline-flex items-center justify-center gap-1.5 text-xs font-black text-slate-200 uppercase">
                {battingTeam?.logoUrl && (
                  <img
                    src={battingTeam.logoUrl}
                    alt={battingTeam.name}
                    className="w-4 h-4 rounded-full object-contain bg-black border border-slate-700 shrink-0"
                  />
                )}
                <span>{battingTeam?.name || "Team A"}</span>
              </div>
              <div className="text-3xl font-black text-amber-400 leading-none">
                {currentInn.runs}-{currentInn.wickets}
              </div>
              <div className="text-[11px] text-slate-300 pt-1">
                Ov -{" "}
                <strong className="text-white">
                  {formatOversFromBalls(currentInn.legalBalls, bpo)}
                </strong>
                /{match.format === MATCH_FORMATS.TEST ? "∞" : match.overs}
                {isSecondInnings && !currentInn.isSuperOver && (
                  <span className="ml-2 text-amber-300 font-bold">
                    • Target {Number(firstInn?.runs || 0) + 1}
                  </span>
                )}
              </div>
            </div>

            {/* Match Result in Small Neat Text */}
            {isMatchFinished && (
              <div className="bg-slate-950 rounded-xl px-3 py-2 border border-emerald-500/40 flex items-center justify-center gap-2">
                {winnerTeam?.logoUrl && (
                  <img
                    src={winnerTeam.logoUrl}
                    alt={winnerTeam.name}
                    className="w-5 h-5 rounded-full object-contain bg-black border border-slate-700 p-0.5 shrink-0"
                  />
                )}
                <div className="text-[11px] font-black text-emerald-300 text-center">
                  {computedFinishMargin}
                </div>
              </div>
            )}
          </div>
        );
      })()}
      {/* === SECTION: SCORE HEADER END === */}

      {/* === SECTION: TABS START === */}
      <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
        {[
          { id: "scoring", label: "Scoring" },
          { id: "scorecard", label: "Scorecard" },
          { id: "balls", label: "Balls" },
          { id: "summary", label: "Summary" },
          { id: "stats", label: "Stats" },
          { id: "info", label: "Info" }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              console.log("[SCORING_LOG][tab click]", {
                nextTab: t.id,
                matchId: match.id,
                activeInnIdx,
                inningsCount: match.innings?.length || 0,
                inningsDetails: (match.innings || []).map((inn, idx) => ({
                  idx,
                  battingTeamId: inn?.battingTeamId,
                  ballsLen: inn?.balls?.length || 0
                })),
                currentInnBalls: currentInn?.balls || []
              });
              setCentreTab(t.id);
            }}
            className={`shrink-0 px-3 py-1 rounded-xl text-xs font-black cursor-pointer ${
              centreTab === t.id
                ? "bg-amber-400 text-slate-950"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* === SECTION: TABS END === */}

      {/* === SECTION: SCORING TAB START === */}
      {centreTab === "scoring" && !isMatchFinished && (
        <div className="space-y-2">
          <div className="bg-slate-900 rounded-2xl p-2.5 border border-slate-800 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between px-1">
              <span className="font-black text-amber-300">
                Batsman ({battingTeam?.name || "Batting"})
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveBattersAndBowler(match.id, {
                    strikerId: currentInn.nonStrikerId,
                    nonStrikerId: currentInn.strikerId,
                    bowlerId: currentInn.bowlerId
                  });
                  reloadData();
                }}
                className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 text-[10px] font-black cursor-pointer"
              >
                ↔ Strike
              </button>
            </div>

            <div className="grid grid-cols-6 text-[10px] text-slate-400 font-bold px-2">
              <span className="col-span-2">Player</span>
              <span className="text-right">R</span>
              <span className="text-right">B</span>
              <span className="text-right">6s</span>
              <span className="text-right">SR</span>
            </div>

            <button
              type="button"
              onClick={() => setPickerType("striker")}
              className="w-full grid grid-cols-6 items-center px-2 py-1.5 rounded-lg bg-amber-400/15 border border-amber-400/40 text-left cursor-pointer"
            >
              <span className="col-span-2 font-black text-amber-300 truncate">
                {strikerObj ? `${strikerObj.name} *` : "+ Striker"}
              </span>
              <span className="text-right font-black text-white">
                {sStat.runs}
              </span>
              <span className="text-right text-slate-300">{sStat.balls}</span>
              <span className="text-right text-slate-300">{sStat.sixes}</span>
              <span className="text-right font-mono text-slate-200">
                {calcSr(sStat)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPickerType("non_striker")}
              className="w-full grid grid-cols-6 items-center px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-left cursor-pointer"
            >
              <span className="col-span-2 font-bold text-slate-200 truncate">
                {nonStrikerObj ? nonStrikerObj.name : "+ Non-Striker"}
              </span>
              <span className="text-right font-bold text-white">
                {nsStat.runs}
              </span>
              <span className="text-right text-slate-400">{nsStat.balls}</span>
              <span className="text-right text-slate-400">{nsStat.sixes}</span>
              <span className="text-right font-mono text-slate-400">
                {calcSr(nsStat)}
              </span>
            </button>

            <div className="grid grid-cols-6 text-[10px] text-slate-400 font-bold px-2 pt-1 border-t border-slate-800">
              <span className="col-span-2 text-amber-300">
                Bowler ({bowlingTeam?.name || "Bowling"})
              </span>
              <span className="text-right">O</span>
              <span className="text-right">R</span>
              <span className="text-right">W</span>
              <span className="text-right">Eco</span>
            </div>

            <button
              type="button"
              onClick={() => setPickerType("bowler")}
              className="w-full grid grid-cols-6 items-center px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-left cursor-pointer"
            >
              <span className="col-span-2 font-bold text-white truncate">
                {bowlerObj ? bowlerObj.name : "+ Bowler"}
              </span>
              <span className="text-right font-mono text-slate-300">
                {formatOversFromBalls(bwStat.ballsBowled, bpo)}
              </span>
              <span className="text-right text-slate-300">
                {bwStat.runsConceded}
              </span>
              <span className="text-right font-black text-amber-300">
                {bwStat.wickets}
              </span>
              <span className="text-right font-mono text-slate-400">
                {calcEco(bwStat)}
              </span>
            </button>
          </div>

          {/* === SECTION: RECENT BALLS STRIP START === */}
          <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-900 px-3 py-2 rounded-2xl border border-slate-800">
            {onlyBalls.slice(-12).map((bl) => {
              const tag = bl.isWicket
                ? bl.isMagicBall
                  ? "2W"
                  : "W"
                : bl.extrasType === "wd"
                ? `${bl.effExt}Wd`
                : bl.extrasType === "nb"
                ? bl.effBat > 0
                  ? `NB+${bl.effBat}`
                  : "NB"
                : bl.extrasType === "bye"
                ? `${bl.effExt}B`
                : bl.extrasType === "lb"
                ? `${bl.effExt}LB`
                : `${bl.effBat}${bl.isDeclare ? "D" : ""}`;
              return (
                <React.Fragment key={bl.id}>
                  <span
                    className={`min-w-7 h-7 px-1.5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      bl.isWicket
                        ? "bg-rose-600 text-white border border-rose-400"
                        : bl.isMagicBall
                        ? "bg-purple-600 text-white border border-purple-300"
                        : "bg-slate-800 text-slate-200 border border-slate-700"
                    }`}
                  >
                    {tag}
                  </span>
                  {bl.overCompletedNow && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 text-[9px] font-black shrink-0">
                      {bl.completedOverNumber}ov |
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          {/* === SECTION: RECENT BALLS STRIP END === */}

          <ScoringKeypad
            magicBallActive={magicBallActive}
            onToggleMagicBall={() => setMagicBallActive((v) => !v)}
            pendingDeclareChoice={pendingDeclareChoice}
            onClearDeclareChoice={() => setPendingDeclareChoice(null)}
            onCommitBall={commitBall}
            onRunClick={(r) => {
              if (!ensureCanScore()) return;
              if (r % 2 === 1) {
                setPendingDeclareChoice({
                  runsValue: r,
                  extrasType: "none",
                  extrasRuns: 0,
                  label: `${r} Run`
                });
                return;
              }
              commitBall(r, "none", 0, false, false);
            }}
            onExtraClick={(extType, rVal, eVal, label) => {
              if (!ensureCanScore()) return;
              if (rVal > 0 || eVal > 1) {
                setPendingDeclareChoice({
                  runsValue: rVal,
                  extrasType: extType,
                  extrasRuns: eVal,
                  label
                });
                return;
              }
              commitBall(rVal, extType, eVal, false, false);
            }}
            onBonusClick={(delta) => {
              if (isMatchFinished) return;
              const updated = applyBonusRuns(match.id, delta);
              reloadData();
              checkEndAfterUpdate(updated);
            }}
            onWicketClick={(wt) => handleWicketAction(wt)}
            onEndInningsRequest={() =>
              setConfirmPrompt({
                type: currentInn.isSuperOver
                  ? "end_super_first_innings"
                  : "end_first_innings"
              })
            }
            onNextInnings={() => {
              startNextInnings(match.id);
              reloadData();
            }}
            onUndo={() => {
              if (activeInnIdx >= 1 && !(currentInn.balls || []).length) {
                showError("Undo बंद", "Innings End झाल्यावर Undo होणार नाही.");
                return;
              }
              undoLastMatchBall(match.id);
              setMustSelectNextBowler(false);
              setLastOverBowlerId("");
              reloadData();
            }}
          />
        </div>
      )}
      {/* === SECTION: SCORING TAB END === */}

      {/* === SECTION: OTHER TABS START === */}
      {(centreTab !== "scoring" || isMatchFinished) &&
        (() => {
          const passedTab = centreTab === "scoring" ? "scorecard" : centreTab;
          console.log("[SCORING_LOG][rendering MatchCentreTabsView]", {
            centreTab,
            isMatchFinished,
            passedTab,
            activeInnIdx,
            innings: match.innings,
            ballsFeedItemsCount: ballsFeedItems.length
          });
          return (
            <MatchCentreTabsView
              tab={passedTab}
              match={match}
              currentInn={currentInn}
              teamMap={teamMap}
              playerMap={playerMap}
              ballsFeedItems={ballsFeedItems}
              bpo={bpo}
            />
          );
        })()}
      {/* === SECTION: OTHER TABS END === */}
    </div>
  );
}
// === SECTION: MATCH SCORING VIEW COMPONENT END ===