// src/components/scoring/MatchCentreTabsView.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  calculateSingleBallImpact,
  formatOversFromBalls
} from "../../services/matchRulesHelper";

// === SECTION 01: WICKET DISMISSAL TEXT FORMATTER START ===
function formatWicketDismissal(wicketType, fielderId, bowlerId, isMagicBall, playerMap) {
  const bowlerName = playerMap?.[bowlerId]?.name || "Bowler";
  const fielderName = fielderId ? playerMap?.[fielderId]?.name || "" : "";
  const wType = wicketType || "Wicket";

  if (isMagicBall) return "out in magic";
  if (wType === "Caught") {
    return fielderName ? `c ${fielderName} b ${bowlerName}` : `c & b ${bowlerName}`;
  }
  if (wType === "Stumped") {
    return fielderName ? `st ${fielderName} b ${bowlerName}` : `st b ${bowlerName}`;
  }
  if (wType === "Run Out") {
    return fielderName ? `run out (${fielderName})` : "run out";
  }
  if (wType === "Bowled") {
    return `b ${bowlerName}`;
  }
  return `${wType.toLowerCase()} b ${bowlerName}`;
}
// === SECTION 01: WICKET DISMISSAL TEXT FORMATTER END ===


// === SECTION 01B: PLAYER PHOTO HELPER (SAFE URL + INITIALS FALLBACK) START ===
function getPlayerPhotoSrc(player) {
  if (!player) return "";
  return (
    player.photoUrl ||
    player.avatarUrl ||
    player.imageUrl ||
    player.photo ||
  player.avatar ||
  player.image ||
  player.profileUrl ||
  player.profilePhoto ||
  player.profileImage ||
  player.imgUrl ||
    ""
  );
}

function PlayerMiniAvatar({ player, sizeClass = "w-7 h-7" }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = getPlayerPhotoSrc(player);
  const initials = String(player?.name || "P")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "P";

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={player?.name || "Player"}
        onError={() => setImgFailed(true)}
        className={`${sizeClass} rounded-full object-cover object-top bg-slate-800 border border-slate-700 shrink-0`}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} rounded-full bg-slate-800 border border-slate-700 text-amber-300 text-[10px] font-black flex items-center justify-center shrink-0`}
    >
      {initials}
    </span>
  );
}
// === SECTION 01B: PLAYER PHOTO HELPER (SAFE URL + INITIALS FALLBACK) END ===


// === SECTION 02: INNINGS BALLS & EXTRAS BREAKDOWN BUILDER START ===
function analyzeInningsBalls(innObj, innIdx, matchObj, bpoVal, playerMap, teamMap) {
  if (!innObj || !matchObj) {
    return { feedRows: [], extrasBreakdown: { total: 0, wd: 0, nb: 0, bye: 0, lb: 0 } };
  }

  const safeBpo = Math.max(1, Number(bpoVal || matchObj.ballsPerOver || 6));
  let runs = Number(innObj.bonusRuns || 0);
  let wickets = 0;
  let legal = 0;
  let overStart = 0;

  let wdRuns = 0;
  let nbRuns = 0;
  let byeRuns = 0;
  let lbRuns = 0;

  const rows = [];
  const batName = teamMap?.[innObj.battingTeamId]?.name || `Team ${innIdx + 1}`;
  const ballsArr = Array.isArray(innObj.balls) ? innObj.balls : [];

  ballsArr.forEach((bl, idx) => {
    const imp = calculateSingleBallImpact(bl, matchObj);
    runs += imp.totalRuns;
    wickets += imp.wicketsInc;
    legal += imp.legalBallsInc;

    if (imp.extType === "wd") wdRuns += imp.effExt;
    else if (imp.extType === "nb") nbRuns += imp.effExt;
    else if (imp.extType === "bye") byeRuns += imp.effExt;
    else if (imp.extType === "lb") lbRuns += imp.effExt;

    const overDone = imp.legalBallsInc > 0 && legal > 0 && legal % safeBpo === 0;
    const ovNum = legal / safeBpo;

    rows.push({
      type: "ball",
      id: bl.id || `b_${innIdx}_${idx}`,
      batName,
      effBat: imp.effBat,
      effExt: imp.effExt,
      extrasType: imp.extType,
      isWicket: Boolean(bl.isWicket),
      wicketType: bl.wicketType || "",
      fielderId: bl.fielderId || "",
      runOutPlayerId: bl.runOutPlayerId || "",
      isMagicBall: imp.isMagic,
      isDeclare: imp.isDeclare,
      strikerId: bl.strikerId,
      bowlerId: bl.bowlerId,
      overCompletedNow: overDone,
      completedOverNumber: ovNum,
      scoreAfter: `${runs}-${wickets}`,
      oversAfter: formatOversFromBalls(legal, safeBpo)
    });

    if (overDone) {
      const slice = ballsArr.slice(overStart, idx + 1);
      const overRuns = slice.reduce(
        (sum, b) => sum + calculateSingleBallImpact(b, matchObj).totalRuns,
        0
      );
      rows.push({
        type: "over_summary",
        id: `ov_${innIdx}_${ovNum}`,
        batName,
        overNumber: ovNum,
        overRuns,
        scoreAtEnd: `${runs}-${wickets}`,
        bowlerName: playerMap?.[bl.bowlerId]?.name || "Bowler",
        strikerName: playerMap?.[bl.strikerId]?.name || "Batter",
        balls: slice
      });
      overStart = idx + 1;
    }
  });

  const totalExtras = Math.max(0, wdRuns + nbRuns + byeRuns + lbRuns + Number(innObj.bonusRuns || 0));

  return {
    feedRows: rows,
    extrasBreakdown: {
      total: totalExtras,
      wd: wdRuns,
      nb: nbRuns,
      bye: byeRuns,
      lb: lbRuns
    }
  };
}
// === SECTION 02: INNINGS BALLS & EXTRAS BREAKDOWN BUILDER END ===

export default function MatchCentreTabsView({
  tab,
  match,
  currentInn,
  teamMap = {},
  playerMap = {},
  ballsFeedItems = [],
  bpo = 6
}) {
  // === SECTION 03: STATE & INNINGS SELECTION START ===
  const safeBpo = Math.max(1, Number(bpo || match?.ballsPerOver || 6));
  const inningsList = Array.isArray(match?.innings) ? match.innings : [];
  const activeMatchInnIdx =
    typeof match?.activeInningsIndex === "number"
      ? match.activeInningsIndex
      : Math.max(0, inningsList.length - 1);

  const [selectedInnIdx, setSelectedInnIdx] = useState(activeMatchInnIdx);

  useEffect(() => {
    setSelectedInnIdx(activeMatchInnIdx);
  }, [activeMatchInnIdx, match?.id]);

  const viewedInn = inningsList[selectedInnIdx] || currentInn;

  const analyzed = useMemo(() => {
    if (!viewedInn || !match) {
      return {
        feedRows: Array.isArray(ballsFeedItems) ? ballsFeedItems : [],
        extrasBreakdown: { total: 0, wd: 0, nb: 0, bye: 0, lb: 0 }
      };
    }
    return analyzeInningsBalls(
      viewedInn,
      selectedInnIdx,
      match,
      safeBpo,
      playerMap,
      teamMap
    );
  }, [viewedInn, selectedInnIdx, match, safeBpo, playerMap, teamMap, ballsFeedItems]);

  const activeBallsFeed = analyzed.feedRows;
  const extras = analyzed.extrasBreakdown;
  // === SECTION 03: STATE & INNINGS SELECTION END ===

  if (!match || !currentInn || !viewedInn) return null;

  // === SECTION 04: TEAM ROSTERS, BATSMEN, BOWLERS & FOW START ===
  const innBattingTeam = teamMap?.[viewedInn.battingTeamId];
  const innBowlingTeam = teamMap?.[viewedInn.bowlingTeamId];

  const getTeamPlayers = (tm) => {
    if (!tm) return [];
    const ids = Object.keys(tm.squadRoster || {});
    if (ids.length > 0) {
      return ids.map((pid) => playerMap?.[pid]).filter(Boolean);
    }
    return Object.values(playerMap || {}).filter((p) => p && p.teamId === tm.id);
  };

  const batSidePlayers = getTeamPlayers(innBattingTeam);
  const bowlSidePlayers = getTeamPlayers(innBowlingTeam);

  const isThisInningsEnded =
    match.status === "completed" ||
    Boolean(viewedInn.declared) ||
    selectedInnIdx < activeMatchInnIdx;

  const activeOrBattedBatters = batSidePlayers.filter((pl) => {
    const st = viewedInn.playerStats?.[pl.id];
    const hasBatted =
      st &&
      (Number(st.balls || 0) > 0 ||
        Number(st.runs || 0) > 0 ||
        Boolean(st.out));
    const atCrease =
      viewedInn.strikerId === pl.id || viewedInn.nonStrikerId === pl.id;
    return Boolean(hasBatted || atCrease);
  });

  const yetToBat = batSidePlayers.filter(
    (pl) => !activeOrBattedBatters.some((b) => b.id === pl.id)
  );

  const activeOrUsedBowlers = bowlSidePlayers.filter((pl) => {
    const st = viewedInn.playerStats?.[pl.id];
    const hasBowled = st && Number(st.ballsBowled || 0) > 0;
    const isCurrentBowler = viewedInn.bowlerId === pl.id;
    return Boolean(hasBowled || isCurrentBowler);
  });

  const fallOfWickets = (() => {
    let accRuns = Number(viewedInn.bonusRuns || 0);
    let accWkts = 0;
    let accLegal = 0;
    const fowList = [];

    (viewedInn.balls || []).forEach((bl, idx) => {
      const imp = calculateSingleBallImpact(bl, match);
      accRuns += imp.totalRuns;
      accLegal += imp.legalBallsInc;

      if (bl.isWicket) {
        accWkts += imp.wicketsInc;
        const victimId = bl.runOutPlayerId || bl.strikerId;
        const primaryOutName = playerMap?.[victimId]?.name || "Batter";
        const secondOutName =
          imp.isMagic && bl.magicTargetPlayerId
            ? ` & ${playerMap?.[bl.magicTargetPlayerId]?.name || "2nd"}`
            : "";

        fowList.push({
          id: bl.id || `fow_${idx}`,
          wicketNo: accWkts,
          runsAtFall: accRuns,
          overAtFall: formatOversFromBalls(accLegal, safeBpo),
          playerLabel: `${primaryOutName}${secondOutName}`,
          dismissalLabel: formatWicketDismissal(
            bl.wicketType,
            bl.fielderId,
            bl.bowlerId,
            imp.isMagic,
            playerMap
          )
        });
      }
    });

    return fowList;
  })();

  const calcSr = (st) =>
    st.balls > 0 ? ((st.runs / st.balls) * 100).toFixed(1) : "0.0";
  const calcEco = (st) =>
    st.ballsBowled > 0
      ? (st.runsConceded / (st.ballsBowled / safeBpo)).toFixed(1)
      : "0.0";

  const runRateVal =
    viewedInn.legalBalls > 0
      ? (
          (Number(viewedInn.runs || 0) / Number(viewedInn.legalBalls)) *
          safeBpo
        ).toFixed(1)
      : "0.0";
  // === SECTION 04: TEAM ROSTERS, BATSMERS, BOWLERS & FOW END ===

  // === SECTION 05: TWO-INNINGS SWITCHER TABS BAR START ===
  const renderInningsSwitcher = () => {
    if (inningsList.length <= 1) return null;
    return (
      <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
        {inningsList.map((innItem, i) => {
          const bTeamName =
            teamMap?.[innItem.battingTeamId]?.name || `Inn ${i + 1}`;
          const innPrefix = innItem.isSuperOver ? `SO ${i + 1}` : `${i + 1}Inn`;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedInnIdx(i)}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-black truncate cursor-pointer ${
                selectedInnIdx === i
                  ? "bg-amber-400 text-slate-950"
                  : "text-slate-300"
              }`}
            >
              {innPrefix} • {bTeamName} ({innItem.runs}-{innItem.wickets})
            </button>
          );
        })}
      </div>
    );
  };
  // === SECTION 05: TWO-INNINGS SWITCHER TABS BAR END ===

// === SECTION 06: SUMMARY TAB (REFERENCE STYLE SHORT MATCH SUMMARY) START ===
  if (tab === "summary") {
    const teamAObj = teamMap?.[match.teamAId];
    const teamBObj = teamMap?.[match.teamBId];
    const winnerTeam = match.winnerTeamId ? teamMap?.[match.winnerTeamId] : null;
    const roundLabel =
      match.roundName || match.stageName || match.round || match.stage || "";
    const matchNoLabel = match.matchNumber ? `Match #${match.matchNumber}` : "";
    const dateTimeLabel = [match.matchDate || match.date, match.matchTime || match.time]
      .filter(Boolean)
      .join(" • ");

    const headlineResult = (() => {
      if (match.resultText) return match.resultText;
      if (match.isTied) return "Match Tied";
      if (match.status === "completed" && winnerTeam && inningsList.length >= 2) {
        const inn1 = inningsList[0];
        const inn2 = inningsList[1];
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
      }
      if (winnerTeam) return `${winnerTeam.name} Won`;
      return match.status === "completed" ? "Match Completed" : "Match In Progress";
    })();

    return (
      <div className="bg-slate-900 rounded-2xl p-3.5 border border-slate-800 space-y-3 text-xs">
        {/* Match Header Card with Both Team Logos, Round, Match No, Date & Result */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
            <span className="font-bold text-amber-300 truncate">
              {[match.tournamentName, matchNoLabel, roundLabel]
                .filter(Boolean)
                .join(" • ") || "Match Summary"}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 font-black shrink-0">
              {match.overs} Ov
            </span>
          </div>

          {dateTimeLabel && (
            <div className="text-[10px] text-slate-400">{dateTimeLabel}</div>
          )}

          {/* Teams VS with Logos */}
          <div className="flex items-center justify-between gap-2 bg-slate-900/90 px-2.5 py-2 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              {teamAObj?.logoUrl && (
                <img
                  src={teamAObj.logoUrl}
                  alt={teamAObj.name}
                  className="w-7 h-7 rounded-full object-contain bg-black border border-slate-700 p-0.5 shrink-0"
                />
              )}
              <span className="font-black text-white text-xs truncate">
                {teamAObj?.name || "Team A"}
              </span>
            </div>

            <span className="text-[10px] font-black text-amber-400 px-1.5 shrink-0">
              VS
            </span>

            <div className="flex items-center justify-end gap-2 min-w-0">
              <span className="font-black text-white text-xs truncate">
                {teamBObj?.name || "Team B"}
              </span>
              {teamBObj?.logoUrl && (
                <img
                  src={teamBObj.logoUrl}
                  alt={teamBObj.name}
                  className="w-7 h-7 rounded-full object-contain bg-black border border-slate-700 p-0.5 shrink-0"
                />
              )}
            </div>
          </div>

          <div className="text-[11px] font-black text-emerald-300">
            {headlineResult}
          </div>
        </div>

        {/* Innings-wise Top Batters & Bowlers */}
        {inningsList.map((innItem, i) => {
          const bTeam = teamMap?.[innItem.battingTeamId];
          const innStats = innItem.playerStats || {};
          const topBatters = Object.entries(innStats)
            .filter(
              ([, st]) => Number(st.balls || 0) > 0 || Number(st.runs || 0) > 0
            )
            .sort((a, b) => Number(b[1].runs || 0) - Number(a[1].runs || 0))
            .slice(0, 3);

          const topBowlers = Object.entries(innStats)
            .filter(([, st]) => Number(st.ballsBowled || 0) > 0)
            .sort(
              (a, b) =>
                Number(b[1].wickets || 0) - Number(a[1].wickets || 0) ||
                Number(a[1].runsConceded || 0) - Number(b[1].runsConceded || 0)
            )
            .slice(0, 3);

          return (
            <div
              key={i}
              className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 space-y-2.5"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {bTeam?.logoUrl && (
                    <img
                      src={bTeam.logoUrl}
                      alt={bTeam.name}
                      className="w-6 h-6 rounded-full object-contain bg-black border border-slate-700 p-0.5 shrink-0"
                    />
                  )}
                  <span className="font-black text-white truncate">
                    {bTeam?.name || `Team ${i + 1}`}
                  </span>
                </div>
                <span className="font-black text-amber-300 shrink-0">
                  {innItem.runs}/{innItem.wickets} (
                  {formatOversFromBalls(innItem.legalBalls, safeBpo)})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="space-y-1.5">
                  {topBatters.length > 0 ? (
                    topBatters.map(([pid, st]) => {
                      const plObj = playerMap?.[pid] || { id: pid, name: pid };
                      return (
                        <div key={pid} className="flex items-center gap-2 min-w-0">
                          <PlayerMiniAvatar player={plObj} sizeClass="w-6 h-6" />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-200 truncate">
                              {plObj.name}
                              {!st.out ? "*" : ""}
                            </div>
                            <div className="text-slate-400 font-mono">
                              {st.runs} ({st.balls})
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-slate-500">No batting data</div>
                  )}
                </div>

                <div className="space-y-1.5 text-right">
                  {topBowlers.length > 0 ? (
                    topBowlers.map(([pid, st]) => {
                      const plObj = playerMap?.[pid] || { id: pid, name: pid };
                      return (
                        <div
                          key={pid}
                          className="flex items-center justify-end gap-2 min-w-0"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-200 truncate">
                              {plObj.name}
                            </div>
                            <div className="text-slate-400 font-mono">
                              {st.wickets}/{st.runsConceded} (
                              {formatOversFromBalls(st.ballsBowled, safeBpo)})
                            </div>
                          </div>
                          <PlayerMiniAvatar player={plObj} sizeClass="w-6 h-6" />
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-slate-500">No bowling data</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  // === SECTION 06: SUMMARY TAB (REFERENCE STYLE SHORT MATCH SUMMARY) END ===

  // === SECTION 07: SCORECARD TAB — BATTING, EXTRAS & TOTAL START ===
  if (tab === "scorecard") {
    return (
      <div className="bg-slate-900 rounded-2xl p-3.5 border border-slate-800 space-y-3 text-xs">
        {renderInningsSwitcher()}

        <div className="flex items-center justify-between text-[11px] text-slate-300 px-1">
          <span>
            Batting:{" "}
            <strong className="text-amber-300">
              {innBattingTeam?.name || "Team"}
            </strong>
          </span>
          <span>
            Bowling:{" "}
            <strong className="text-white">
              {innBowlingTeam?.name || "Team"}
            </strong>
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="grid grid-cols-7 text-[11px] font-black text-amber-300 border-b border-slate-800 pb-1">
            <span className="col-span-2">Batsman</span>
            <span className="text-right">R</span>
            <span className="text-right">B</span>
            <span className="text-right">4s</span>
            <span className="text-right">6s</span>
            <span className="text-right">SR</span>
          </div>

          {activeOrBattedBatters.length > 0 ? (
            activeOrBattedBatters.map((pl) => {
              const st = viewedInn.playerStats?.[pl.id] || {
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                out: false,
                dismissalText: ""
              };
              const atCrease =
                viewedInn.strikerId === pl.id ||
                viewedInn.nonStrikerId === pl.id;

              const sub = st.out
                ? st.dismissalText || "out"
                : isThisInningsEnded || !atCrease
                ? "not out"
                : "batting";

              return (
                <div
                  key={pl.id}
                  className="grid grid-cols-7 items-center py-1.5 border-b border-slate-800/60"
                >
                  <div className="col-span-2 min-w-0 pr-1 flex items-center gap-2">
                    <PlayerMiniAvatar player={pl} sizeClass="w-7 h-7" />
                    <div className="min-w-0">
                      <div className="font-black text-white truncate">
                        {pl.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {sub}
                      </div>
                    </div>
                  </div>
                  <span className="text-right font-black text-white">
                    {st.runs}
                  </span>
                  <span className="text-right text-slate-300">{st.balls}</span>
                  <span className="text-right text-slate-300">{st.fours}</span>
                  <span className="text-right text-slate-300">{st.sixes}</span>
                  <span className="text-right font-mono text-slate-300">
                    {calcSr(st)}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-slate-400 py-2">
              {innBattingTeam?.name || "या संघाची"} फलंदाजी अद्याप सुरू झालेली नाही.
            </div>
          )}
        </div>

        {/* Extras & Total */}
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between gap-2 text-slate-300">
            <span>Extras</span>
            <span className="font-bold text-white">
              {extras.total}{" "}
              <span className="text-slate-400 font-normal">
                (WD {extras.wd}, NB {extras.nb}, B {extras.bye}, LB {extras.lb})
              </span>
            </span>
          </div>
          <div className="flex justify-between font-black pt-1 border-t border-slate-800/80">
            <span className="text-amber-300">Total</span>
            <span className="text-white">
              {viewedInn.runs}/{viewedInn.wickets}
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>
              Overs: {formatOversFromBalls(viewedInn.legalBalls, safeBpo)}
            </span>
            <span>Run Rate: {runRateVal}</span>
          </div>
        </div>

        {yetToBat.length > 0 && (
          <div className="text-[11px] text-slate-400">
            <strong className="text-slate-200">Yet To Bat:</strong>{" "}
            {yetToBat.map((p) => p.name).join(", ")}
          </div>
        )}
        {/* === SECTION 07: SCORECARD TAB — BATTING, EXTRAS & TOTAL END === */}

        {/* === SECTION 08: SCORECARD TAB — BOWLERS & FALL OF WICKETS START === */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800">
          <div className="grid grid-cols-7 text-[11px] font-black text-amber-300 border-b border-slate-800 pb-1">
            <span className="col-span-2">Bowler</span>
            <span className="text-right">O</span>
            <span className="text-right">M</span>
            <span className="text-right">R</span>
            <span className="text-right">W</span>
            <span className="text-right">Eco</span>
          </div>

          {activeOrUsedBowlers.length > 0 ? (
            activeOrUsedBowlers.map((pl) => {
              const st = viewedInn.playerStats?.[pl.id] || {
                ballsBowled: 0,
                runsConceded: 0,
                wickets: 0
              };
              return (
                <div
                  key={pl.id}
                  className="grid grid-cols-7 items-center py-1.5 border-b border-slate-800/60"
                >
                  <div className="col-span-2 min-w-0 pr-1 flex items-center gap-2">
                    <PlayerMiniAvatar player={pl} sizeClass="w-6 h-6" />
                    <span className="font-bold text-white truncate">
                      {pl.name}
                    </span>
                  </div>
                  <span className="text-right font-mono text-slate-300">
                    {formatOversFromBalls(st.ballsBowled, safeBpo)}
                  </span>
                  <span className="text-right text-slate-400">0</span>
                  <span className="text-right text-slate-300">
                    {st.runsConceded}
                  </span>
                  <span className="text-right font-black text-amber-300">
                    {st.wickets}
                  </span>
                  <span className="text-right font-mono text-slate-300">
                    {calcEco(st)}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-slate-400 py-2">
              गोलंदाजीची नोंद झालेली नाही.
            </div>
          )}
        </div>

        <div className="space-y-1.5 pt-2 border-t border-slate-800">
          <div className="text-[11px] font-black text-amber-300">
            Fall of Wickets
          </div>
          {fallOfWickets.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {fallOfWickets.map((f) => (
                <span
                  key={f.id}
                  className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-200"
                >
                  <strong className="text-amber-300">
                    {f.wicketNo}-{f.runsAtFall}
                  </strong>{" "}
                  ({f.playerLabel} • {f.dismissalLabel}, {f.overAtFall} ov)
                </span>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400">
              अद्याप कोणतीही विकेट पडलेली नाही.
            </div>
          )}
        </div>
      </div>
    );
  }
  // === SECTION 08: SCORECARD TAB — BOWLERS & FALL OF WICKETS END ===

  // === SECTION 09: BALLS TAB — TWO INNINGS TABS + OVER SUMMARY + RED WICKET START ===
  if (tab === "balls") {
    const onlyBalls = activeBallsFeed.filter((x) => x.type === "ball");

    return (
      <div className="bg-slate-900 rounded-2xl p-3.5 border border-slate-800 space-y-2.5 text-xs">
        {renderInningsSwitcher()}

        <div className="flex items-center justify-between">
          <span className="font-black text-amber-300">
            Ball-by-Ball Score ({onlyBalls.length} Balls)
          </span>
          <span className="text-[11px] font-bold text-slate-300">
            {viewedInn.runs}/{viewedInn.wickets} (
            {formatOversFromBalls(viewedInn.legalBalls, safeBpo)} Ov)
          </span>
        </div>

        {activeBallsFeed.length > 0 ? (
          <div className="space-y-2 max-h-[28rem] overflow-y-auto">
            {[...activeBallsFeed].reverse().map((item) => {
              if (item.type === "over_summary") {
                return (
                  <div
                    key={item.id}
                    className="bg-slate-950 p-3 rounded-2xl border border-amber-400/40 space-y-2"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.balls.map((ob, oi) => {
                        const tag = ob.isWicket
                          ? ob.isMagicBall
                            ? "2W"
                            : "W"
                          : ob.extrasType === "wd"
                          ? "Wd"
                          : ob.extrasType === "nb"
                          ? "NB"
                          : ob.extrasType === "bye"
                          ? "B"
                          : ob.extrasType === "lb"
                          ? "LB"
                          : `${ob.runs}`;
                        return (
                          <span
                            key={ob.id || `ob_${oi}`}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                              ob.isWicket
                                ? "bg-rose-600 text-white"
                                : "bg-slate-800 text-slate-200 border border-slate-700"
                            }`}
                          >
                            {tag}
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-200 border-t border-slate-800 pt-1.5">
                      <span className="font-bold truncate">
                        {item.strikerName}
                      </span>
                      <span className="font-black text-white">
                        Bowler: {item.bowlerName}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 text-[11px] font-black pt-1 border-t border-slate-800/80">
                      <span className="text-amber-300">
                        Overs {item.overNumber}
                      </span>
                      <span className="text-center text-white">
                        Runs {item.overRuns}
                      </span>
                      <span className="text-right text-amber-400">
                        Score {item.scoreAtEnd}
                      </span>
                    </div>
                  </div>
                );
              }

              const bowlerName = playerMap?.[item.bowlerId]?.name || "Bowler";
              const batterName =
                playerMap?.[item.runOutPlayerId || item.strikerId]?.name ||
                "Batter";

              if (item.isWicket) {
                const dismissalDesc = formatWicketDismissal(
                  item.wicketType,
                  item.fielderId,
                  item.bowlerId,
                  item.isMagicBall,
                  playerMap
                );
                return (
                  <div
                    key={item.id}
                    className="space-y-1.5 bg-slate-950/90 p-2.5 rounded-xl border border-rose-500/50"
                  >
                    <div className="bg-rose-600 text-white px-3 py-2 rounded-lg flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-wide opacity-90">
                          Fall of Wicket
                        </div>
                        <div className="text-xs font-black truncate">
                          {batterName}
                        </div>
                        <div className="text-[11px] font-bold opacity-95 truncate">
                          {dismissalDesc}
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded bg-white text-rose-600 text-xs font-black shrink-0">
                        {item.isMagicBall ? "2W" : "W"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 px-1">
                      <div className="text-[11px] font-bold text-slate-200 truncate">
                        <span className="font-mono text-rose-400 font-black">
                          {item.oversAfter}:
                        </span>{" "}
                        {bowlerName} to {batterName}, OUT! {dismissalDesc}
                      </div>
                      <span className="text-xs font-black text-white shrink-0">
                        {item.scoreAfter}
                      </span>
                    </div>
                  </div>
                );
              }

              const runDesc =
                item.extrasType === "nb"
                  ? `NB +${item.effExt + item.effBat}`
                  : item.extrasType !== "none"
                  ? `${item.extrasType.toUpperCase()} +${item.effExt}`
                  : item.effBat === 0
                  ? "No run"
                  : `${item.effBat} Run${item.effBat === 1 ? "" : "s"}${
                      item.isDeclare ? " • Declare" : ""
                    }${item.isMagicBall ? " • Magic" : ""}`;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 bg-slate-950/70 px-3 py-2 rounded-xl border border-slate-800"
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    <span
                      className={`min-w-7 h-7 px-1 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                        item.extrasType !== "none"
                          ? "bg-blue-600 text-white"
                          : item.effBat === 4 || item.effBat === 6
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-800 text-slate-200"
                      }`}
                    >
                      {item.extrasType !== "none"
                        ? `${item.effExt}${item.extrasType.toUpperCase()}`
                        : item.effBat}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-200 truncate">
                        <span className="font-mono text-amber-300 font-black">
                          {item.oversAfter}:
                        </span>{" "}
                        {bowlerName} to {batterName}, {runDesc}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-white">
                      {item.scoreAfter}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      ({item.oversAfter})
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400">
            अद्याप कोणताही चेंडू नोंदवलेला नाही.
          </div>
        )}
      </div>
    );
  }
  // === SECTION 09: BALLS TAB — TWO INNINGS TABS + OVER SUMMARY + RED WICKET END ===

  // === SECTION 10: STATS & INFO TAB START ===
  return (
    <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2 text-xs">
      <div className="font-black text-amber-300 uppercase">
        {String(tab || "info").replace("_", " ")}
      </div>
      <div className="text-slate-300 space-y-1">
        <div>Tournament: {match.tournamentName}</div>
        <div>
          Teams: {teamMap?.[match.teamAId]?.name || "Team 1"} vs{" "}
          {teamMap?.[match.teamBId]?.name || "Team 2"}
        </div>
        <div>
          Overs: {match.overs} • Balls/Over: {safeBpo} • Players:{" "}
          {match.playersPerSide}
        </div>
        {match.venue && <div>Venue: {match.venue}</div>}
      </div>
    </div>
  );
  // === SECTION 10: STATS & INFO TAB END ===
}