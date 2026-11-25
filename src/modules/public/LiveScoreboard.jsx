// src/modules/public/LiveScoreboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Trophy,
  ArrowLeft,
  Radio,
  CheckCircle2,
  Calendar,
  MapPin
} from "lucide-react";
import {
  MATCH_FORMATS,
  getTournaments,
  getTeams,
  getPlayers,
  getMatches,
  computeGroupPointsTable,
  formatOversFromBalls
} from "../../services/scoringLocalEngine";

export default function LiveScoreboard({
  initialTournamentId = "",
  onBackHome
}) {
  // === SECTION: COMPONENT STATE START ===
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);

  const [selectedTournamentId, setSelectedTournamentId] =
    useState(initialTournamentId);
  const [sectionTab, setSectionTab] = useState("matches"); // "matches" | "points"
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState(""); // Detail Sub-View साठी
  const [detailSubTab, setDetailSubTab] = useState("scorecard"); // "scorecard" | "balls"
  // === SECTION: COMPONENT STATE END ===

  // === SECTION: DATA LOAD & DERIVED DATA START ===
  const loadBoardData = () => {
    const trnList = getTournaments();
    const tmList = getTeams();
    const plList = getPlayers();
    const mtList = getMatches();

    setTournaments(trnList);
    setTeams(tmList);
    setPlayers(plList);
    setMatches(mtList);

    const activeTrnId =
      initialTournamentId ||
      selectedTournamentId ||
      (trnList[0]?.id ?? "");
    setSelectedTournamentId(activeTrnId);

    const trn = trnList.find((t) => t.id === activeTrnId);
    if (trn?.groups?.length > 0) {
      setSelectedGroup((prev) =>
        trn.groups.includes(prev) ? prev : trn.groups[0]
      );
    }
  };

  useEffect(() => {
    loadBoardData();
    const timer = setInterval(loadBoardData, 4000);
    return () => clearInterval(timer);
  }, [initialTournamentId]);

  const activeTournament = useMemo(
    () => tournaments.find((t) => t.id === selectedTournamentId) || null,
    [tournaments, selectedTournamentId]
  );

  const teamMap = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams]
  );

  const playerMap = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players]
  );

  const visibleMatches = useMemo(() => {
    if (!selectedTournamentId) return matches;
    return matches.filter((m) => m.tournamentId === selectedTournamentId);
  }, [matches, selectedTournamentId]);

  const pointsByGroup = useMemo(() => {
    if (!activeTournament) return {};
    return computeGroupPointsTable(activeTournament, matches, teams);
  }, [activeTournament, matches, teams]);

  const activeDetailMatch = useMemo(
    () => matches.find((m) => m.id === selectedMatchId) || null,
    [matches, selectedMatchId]
  );
  // === SECTION: DATA LOAD & DERIVED DATA END ===

  // === SECTION: SUB-VIEW — MATCH DETAIL SCORECARD & BALLS START ===
  if (activeDetailMatch) {
    const tA = teamMap[activeDetailMatch.teamAId];
    const tB = teamMap[activeDetailMatch.teamBId];
    const currentInn =
      activeDetailMatch.innings?.[activeDetailMatch.activeInningsIndex || 0] ||
      activeDetailMatch.innings?.[0];

    return (
      <div className="min-h-screen bg-slate-950 text-white p-3 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between bg-slate-900 px-4 py-3 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setSelectedMatchId("")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-black cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>सर्व सामने</span>
            </button>

            <span className="text-[11px] font-black text-amber-300 uppercase">
              {activeDetailMatch.matchTitle} • {activeDetailMatch.status}
            </span>
          </div>

          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2">
            <div className="text-xs text-slate-400 font-bold">
              {activeDetailMatch.tournamentName} • Season{" "}
              {activeDetailMatch.season}
              {activeDetailMatch.groupName ? ` • ${activeDetailMatch.groupName}` : ""}
            </div>
            <div className="text-lg sm:text-2xl font-black text-white">
              {tA?.name || "Team A"} vs {tB?.name || "Team B"}
            </div>
            {currentInn && (
              <div className="text-base sm:text-xl font-black text-amber-400">
                {teamMap[currentInn.battingTeamId]?.name}: {currentInn.runs}/
                {currentInn.wickets} (
                {formatOversFromBalls(
                  currentInn.legalBalls,
                  activeDetailMatch.ballsPerOver
                )}{" "}
                / {activeDetailMatch.overs})
                {currentInn.declared ? " • DECLARED" : ""}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setDetailSubTab("scorecard")}
              className={`py-2 rounded-xl text-xs font-black cursor-pointer ${
                detailSubTab === "scorecard"
                  ? "bg-orange-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Scorecard
            </button>
            <button
              type="button"
              onClick={() => setDetailSubTab("balls")}
              className={`py-2 rounded-xl text-xs font-black cursor-pointer ${
                detailSubTab === "balls"
                  ? "bg-orange-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Ball-by-Ball
            </button>
          </div>

          {detailSubTab === "scorecard" ? (
            <div className="space-y-3">
              {(activeDetailMatch.innings || []).map((inn) => (
                <div
                  key={inn.inningsNumber}
                  className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2.5"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs sm:text-sm font-black text-white">
                      Innings {inn.inningsNumber}:{" "}
                      {teamMap[inn.battingTeamId]?.name || "Team"}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-emerald-400">
                      {inn.runs}/{inn.wickets} (
                      {formatOversFromBalls(
                        inn.legalBalls,
                        activeDetailMatch.ballsPerOver
                      )}
                      )
                    </span>
                  </div>

                  {Object.keys(inn.playerStats || {}).length > 0 ? (
                    <div className="divide-y divide-slate-800/70 text-xs">
                      {Object.entries(inn.playerStats).map(([pid, st]) => (
                        <div
                          key={pid}
                          className="py-1.5 flex items-center justify-between"
                        >
                          <span className="font-bold text-slate-200">
                            {playerMap[pid]?.name || pid}
                            {st.out ? " (out)" : ""}
                          </span>
                          <span className="font-mono text-slate-300">
                            {st.runs}({st.balls}) • {st.wickets}W
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">
                      आकडेवारी उपलब्ध नाही.
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2">
              {(currentInn?.balls || []).length > 0 ? (
                [...(currentInn?.balls || [])].reverse().map((b, i) => (
                  <div
                    key={b.id || i}
                    className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs"
                  >
                    <div>
                      <span className="font-black text-white">
                        Ov {Number(b.overIndex || 0) + 1}.{b.legalBallInOver}
                      </span>
                      {b.isMagicBall && (
                        <span className="ml-2 text-fuchsia-400 font-bold">
                          ✨ Magic Ball
                        </span>
                      )}
                      <div className="text-[11px] text-slate-400">
                        {playerMap[b.bowlerId]?.name || "Bowler"} →{" "}
                        {playerMap[b.strikerId]?.name || "Batter"}
                      </div>
                    </div>
                    <div className="font-black text-amber-400">
                      {b.isWicket
                        ? `OUT (${b.wicketType || "wkt"})`
                        : b.extrasType !== "none"
                        ? `${b.extrasType.toUpperCase()} (${b.extrasRuns})`
                        : `${b.runs}`}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  अद्याप बॉल लॉग नाही.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
  // === SECTION: SUB-VIEW — MATCH DETAIL SCORECARD & BALLS END ===

  // === SECTION: MAIN LIVE SCOREBOARD & POINTS TABLE START ===
  const groupNames = activeTournament?.groups || [];
  const currentGroupRows = pointsByGroup[selectedGroup] || [];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-3 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Top Bar */}
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {onBackHome && (
                <button
                  type="button"
                  onClick={onBackHome}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>मुख्य पान</span>
                </button>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Radio className="w-3 h-3" />
                <span>Live Scoreboard</span>
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-white mt-1">
              लाईव्ह क्रिकेट स्कोअर व Points Table
            </h1>
          </div>

          {tournaments.length > 0 && (
            <select
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white"
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.season})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Section Switcher: Matches | Points Table (NRR) */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setSectionTab("matches")}
            className={`py-2 rounded-xl text-xs font-black cursor-pointer ${
              sectionTab === "matches"
                ? "bg-orange-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            सामने ({visibleMatches.length})
          </button>
          <button
            type="button"
            onClick={() => setSectionTab("points")}
            className={`py-2 rounded-xl text-xs font-black cursor-pointer ${
              sectionTab === "points"
                ? "bg-emerald-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Points Table & NRR
          </button>
        </div>

        {/* Matches List */}
        {sectionTab === "matches" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleMatches.length > 0 ? (
              visibleMatches.map((m) => {
                const tA = teamMap[m.teamAId];
                const tB = teamMap[m.teamBId];
                const inn =
                  m.innings?.[m.activeInningsIndex || 0] || m.innings?.[0];
                const isLive = m.status === "live";

                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMatchId(m.id);
                      setDetailSubTab("scorecard");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`bg-slate-900 rounded-2xl p-4 border transition cursor-pointer space-y-2 ${
                      isLive
                        ? "border-emerald-500/60 hover:border-emerald-400"
                        : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                          {m.matchTitle}
                        </span>
                        {m.groupName && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-300">
                            {m.groupName}
                          </span>
                        )}
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          isLive
                            ? "bg-emerald-500 text-slate-950"
                            : m.status === "completed"
                            ? "bg-slate-700 text-slate-200"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {isLive && <Radio className="w-2.5 h-2.5" />}
                        {m.status === "completed" && (
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        )}
                        {m.status}
                      </span>
                    </div>

                    <div className="text-base font-black text-white">
                      {tA?.name || "Team A"} vs {tB?.name || "Team B"}
                    </div>

                    {inn && m.status !== "scheduled" ? (
                      <div className="text-sm font-black text-amber-400">
                        {teamMap[inn.battingTeamId]?.name}: {inn.runs}/
                        {inn.wickets} (
                        {formatOversFromBalls(inn.legalBalls, m.ballsPerOver)} /{" "}
                        {m.format === MATCH_FORMATS.TEST ? "Test" : m.overs})
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                        {m.venue && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {m.venue}
                          </span>
                        )}
                        {m.date && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {m.date} {m.time}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="text-[11px] font-bold text-emerald-400 pt-1">
                      सविस्तर Scorecard व Balls पाहण्यासाठी क्लिक करा →
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full bg-slate-900 rounded-2xl p-8 border border-slate-800 text-center text-xs text-slate-400">
                अद्याप कोणतेही सामने उपलब्ध नाहीत.
              </div>
            )}
          </div>
        ) : (
          /* Points Table (Multi-Group + NRR) */
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-4">
            {groupNames.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {groupNames.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setSelectedGroup(g)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                        selectedGroup === g
                          ? "bg-orange-600 text-white"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                        <th className="py-2 pr-2">#</th>
                        <th className="py-2 px-2">Team</th>
                        <th className="py-2 px-2 text-center">P</th>
                        <th className="py-2 px-2 text-center">W</th>
                        <th className="py-2 px-2 text-center">L</th>
                        <th className="py-2 px-2 text-center">Pts</th>
                        <th className="py-2 pl-2 text-right">NRR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {currentGroupRows.map((row, index) => (
                        <tr key={row.teamId}>
                          <td className="py-2.5 pr-2 font-bold text-slate-400">
                            {index + 1}
                          </td>
                          <td className="py-2.5 px-2 font-black text-white">
                            {row.teamName}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {row.played}
                          </td>
                          <td className="py-2.5 px-2 text-center text-emerald-400 font-bold">
                            {row.won}
                          </td>
                          <td className="py-2.5 px-2 text-center text-rose-400">
                            {row.lost}
                          </td>
                          <td className="py-2.5 px-2 text-center font-black text-amber-400">
                            {row.points}
                          </td>
                          <td className="py-2.5 pl-2 text-right font-mono font-bold text-sky-300">
                            {row.nrr > 0 ? `+${row.nrr}` : row.nrr}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                या स्पर्धेसाठी Points Table Groups उपलब्ध नाहीत.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
  // === SECTION: MAIN LIVE SCOREBOARD & POINTS TABLE END ===
}