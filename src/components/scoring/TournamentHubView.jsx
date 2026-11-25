// src/components/scoring/TournamentHubView.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Trophy,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Calendar,
  Users,
  Gavel,
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  BarChart3
} from "lucide-react";
import {
  MATCH_FORMATS,
  getTournaments,
  createTournament,
  updateTournament,
  deleteTournament,
  addTournamentGroup,
  addTeamToTournament,
  removeTeamFromTournament,
  getTeams,
  getPlayers,
  getMatches,
  computeGroupPointsTable,
  computeTournamentStats,
  formatOversFromBalls
} from "../../services/scoringLocalEngine";
import { uploadToImgbb } from "../../services/imageUploadService";
import { showSuccess, showError } from "../../utils/alert";

const PRESET_GROUPS = ["Group A", "Group B", "Group C", "Group D"];

export default function TournamentHubView({
  selectedTournamentId = "",
  onSelectTournament,
  onTournamentScopeChange,
  onOpenTeamsView,
  onOpenMatchesView
}) {
  // === SECTION: COMPONENT STATE START ===
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);

  // Top level: "list" | "form" | "tournament_detail"
  const [viewMode, setViewMode] = useState("list");
  const [activeTournamentId, setActiveTournamentId] = useState(
    selectedTournamentId || ""
  );

  // Inside Tournament Detail: "home" | "points" | "statistics"
  const [detailTab, setDetailTab] = useState("home");

  // Tournament Create/Edit Form State
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [club, setClub] = useState("JBSC");
  const [season, setSeason] = useState("2026");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [mode, setMode] = useState("league"); // "league" | "single"
  const [format, setFormat] = useState(MATCH_FORMATS.ONE_DAY); // "one_day" | "test"
  const [selectedGroups, setSelectedGroups] = useState(["Group A", "Group B"]);
  const [customGroupInput, setCustomGroupInput] = useState("");

  // Points Sub-View State (Create Group + Add/Remove Team in Group)
  const [newPointGroupName, setNewPointGroupName] = useState("");
  const [selectedPointGroup, setSelectedPointGroup] = useState("");
  const [teamToAddInPointGroup, setTeamToAddInPointGroup] = useState("");
  // === SECTION: COMPONENT STATE END ===

  // === SECTION: DATA LOAD & DERIVED STATE START ===
  const refreshAll = () => {
    const trnList = getTournaments();
    const tmList = getTeams();
    const plList = getPlayers();
    const mtList = getMatches();

    setTournaments(trnList);
    setTeams(tmList);
    setPlayers(plList);
    setMatches(mtList);

    if (selectedTournamentId && trnList.some((t) => t.id === selectedTournamentId)) {
      setActiveTournamentId(selectedTournamentId);
    }
  };

  useEffect(() => {
    refreshAll();
  }, [selectedTournamentId]);

  const activeTournament = useMemo(
    () => tournaments.find((t) => t.id === activeTournamentId) || null,
    [tournaments, activeTournamentId]
  );

  useEffect(() => {
    if (activeTournament?.groups?.length > 0) {
      setSelectedPointGroup((prev) =>
        activeTournament.groups.includes(prev)
          ? prev
          : activeTournament.groups[0]
      );
    } else {
      setSelectedPointGroup("");
    }
  }, [activeTournament]);

  const teamMap = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams]
  );

  const tournamentTeams = useMemo(() => {
    if (!activeTournament) return [];
    return (activeTournament.tournamentTeamIds || [])
      .map((id) => teamMap[id])
      .filter(Boolean);
  }, [activeTournament, teamMap]);

  const tournamentMatches = useMemo(() => {
    if (!activeTournament) return [];
    return matches.filter((m) => m.tournamentId === activeTournament.id);
  }, [matches, activeTournament]);

  const pointsByGroup = useMemo(() => {
    if (!activeTournament) return {};
    return computeGroupPointsTable(activeTournament, matches, teams);
  }, [activeTournament, matches, teams]);

  const tournamentStats = useMemo(() => {
    if (!activeTournament) return { topBatters: [], topBowlers: [] };
    return computeTournamentStats(activeTournament.id, matches, players);
  }, [activeTournament, matches, players]);
  // === SECTION: DATA LOAD & DERIVED STATE END ===

  // === SECTION: FORM & TOURNAMENT HANDLERS START ===
  const resetForm = () => {
    setEditingId(null);
    setName("");
    setClub("JBSC");
    setSeason("2026");
    setStartDate("");
    setEndDate("");
    setBannerUrl("");
    setUploadingBanner(false);
    setMode("league");
    setFormat(MATCH_FORMATS.ONE_DAY);
    setSelectedGroups(["Group A", "Group B"]);
    setCustomGroupInput("");
  };

  const openCreateSubView = () => {
    resetForm();
    setViewMode("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openEditSubView = (trn) => {
    setEditingId(trn.id);
    setName(trn.name || "");
    setClub(trn.club || "JBSC");
    setSeason(trn.season || "2026");
    setStartDate(trn.startDate || "");
    setEndDate(trn.endDate || "");
    setBannerUrl(trn.bannerUrl || "");
    setUploadingBanner(false);
    setMode(trn.mode === "single" ? "single" : "league");
    setFormat(
      trn.format === MATCH_FORMATS.TEST
        ? MATCH_FORMATS.TEST
        : MATCH_FORMATS.ONE_DAY
    );
    setSelectedGroups(
      Array.isArray(trn.groups) && trn.groups.length > 0
        ? trn.groups
        : ["Group A", "Group B"]
    );
    setCustomGroupInput("");
    setViewMode("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

const openTournamentDetail = (trnId, initialTab = "home") => {
  setActiveTournamentId(trnId);
  setDetailTab(initialTab);
  setViewMode("tournament_detail");
  if (onSelectTournament) onSelectTournament(trnId);
  if (onTournamentScopeChange) onTournamentScopeChange(true);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

  const toggleGroupSelection = (grpName) => {
    setSelectedGroups((prev) => {
      if (prev.includes(grpName)) {
        return prev.length > 1 ? prev.filter((g) => g !== grpName) : prev;
      }
      return [...prev, grpName];
    });
  };

  const handleAddQuickGroup = () => {
    const clean = customGroupInput.trim();
    if (!clean) return;
    if (!selectedGroups.includes(clean)) {
      setSelectedGroups((prev) => [...prev, clean]);
    }
    setCustomGroupInput("");
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const prefix = `BANNER_${name || club || "TOURNAMENT"}`;
      const url = await uploadToImgbb(file, {
        maxWidth: 1000,
        quality: 0.78,
        namePrefix: prefix
      });
      setBannerUrl(url);
      showSuccess("बॅनर अपलोड झाले", "बॅनर कॉम्प्रेस होऊन सेव्ह झाले आहे.");
    } catch (err) {
      console.error(err);
      showError("अपलोड त्रुटी", err.message || "बॅनर अपलोड करता आले नाही.");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSaveTournament = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showError("नाव आवश्यक आहे", "कृपया स्पर्धेचे नाव लिहा.");
      return;
    }

    const finalGroups =
      mode === "league"
        ? selectedGroups.length > 0
          ? selectedGroups
          : ["Group A", "Group B"]
        : [];

    if (editingId) {
      const existing = tournaments.find((t) => t.id === editingId);
      const nextGroupTeams = { ...(existing?.groupTeams || {}) };
      finalGroups.forEach((g) => {
        if (!nextGroupTeams[g]) nextGroupTeams[g] = [];
      });

      const updated = updateTournament(editingId, {
        name: name.trim(),
        club: club.trim() || "JBSC",
        season: season.trim() || "2026",
        startDate,
        endDate,
        bannerUrl: bannerUrl.trim(),
        mode,
        format,
        groups: finalGroups,
        groupTeams: nextGroupTeams
      });

      refreshAll();
      setViewMode(updated ? "tournament_detail" : "list");
      setDetailTab("home");
      resetForm();
      showSuccess("अपडेट झाले", "स्पर्धेची माहिती अपडेट केली आहे.");
    } else {
      const created = createTournament({
        name: name.trim(),
        club: club.trim() || "JBSC",
        season: season.trim() || "2026",
        startDate,
        endDate,
        bannerUrl: bannerUrl.trim(),
        mode,
        format,
        groups: finalGroups
      });

      refreshAll();
      if (created) {
        setActiveTournamentId(created.id);
        if (onSelectTournament) onSelectTournament(created.id);
        setDetailTab("home");
        setViewMode("tournament_detail");
      } else {
        setViewMode("list");
      }
      resetForm();
      showSuccess("स्पर्धा तयार झाली", "नवीन स्पर्धा यशस्वीपणे सेव्ह झाली आहे.");
    }
  };

  const handleDeleteTournament = (trn) => {
    deleteTournament(trn.id);
    if (activeTournamentId === trn.id) {
      setActiveTournamentId("");
      setViewMode("list");
    }
    if (selectedTournamentId === trn.id && onSelectTournament) {
      onSelectTournament("");
    }
    refreshAll();
    showSuccess("डिलीट झाले", `"${trn.name}" स्पर्धा काढून टाकली आहे.`);
  };

  const handleCreatePointGroup = () => {
    if (!activeTournament || !newPointGroupName.trim()) {
      showError("ग्रुप नाव आवश्यक", "कृपया नवीन ग्रुप नाव लिहा (उदा. Group C).");
      return;
    }
    const clean = newPointGroupName.trim();
    addTournamentGroup(activeTournament.id, clean);
    setNewPointGroupName("");
    setSelectedPointGroup(clean);
    refreshAll();
    showSuccess("ग्रुप तयार", `"${clean}" ग्रुप तयार केला आहे.`);
  };

  const handleAddTeamInPointGroup = () => {
    if (!activeTournament || !selectedPointGroup || !teamToAddInPointGroup) {
      showError("निवड अपूर्ण", "कृपया ग्रुप आणि संघ निवडा.");
      return;
    }
    addTeamToTournament(
      activeTournament.id,
      teamToAddInPointGroup,
      selectedPointGroup
    );
    setTeamToAddInPointGroup("");
    refreshAll();
    showSuccess("संघ जोडला", `${selectedPointGroup} मध्ये संघ जोडला.`);
  };

  const handleRemoveTeamFromPointGroup = (tid) => {
    if (!activeTournament || !selectedPointGroup) return;
    removeTeamFromTournament(activeTournament.id, tid, selectedPointGroup);
    refreshAll();
    showSuccess("संघ काढला", `${selectedPointGroup} मधून संघ काढला.`);
  };
  // === SECTION: FORM & TOURNAMENT HANDLERS END ===

  // === SECTION: SUB-VIEW CREATE / EDIT TOURNAMENT START ===
  if (viewMode === "form") {
    return (
      <div className="space-y-3.5 text-white">
        <div className="flex items-center justify-between bg-slate-900 px-4 py-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm sm:text-base font-black">
              {editingId ? "स्पर्धा माहिती एडिट करा" : "नवीन स्पर्धा तयार करा"}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              setViewMode("list");
              resetForm();
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>मागे</span>
          </button>
        </div>

        <form
          onSubmit={handleSaveTournament}
          className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Tournament Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="उदा. BOXT20 League 2026"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Club / Organizer
              </label>
              <input
                type="text"
                value={club}
                onChange={(e) => setClub(e.target.value)}
                placeholder="उदा. JBSC"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Season
              </label>
              <input
                type="text"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                placeholder="उदा. 2026"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white"
              />
            </div>

            {/* Start Date & End Date Side-by-Side on Mobile */}
            <div className="sm:col-span-2 grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>
            </div>

            {/* Banner Upload + Change */}
            <div className="sm:col-span-2 space-y-2 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-200">
                  Tournament Banner (Auto-Compress)
                </label>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-black cursor-pointer shrink-0">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>
                    {uploadingBanner
                      ? "अपलोड..."
                      : bannerUrl
                      ? "फोटो बदला"
                      : "फोटो अपलोड करा"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingBanner}
                    onChange={handleBannerUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {bannerUrl && (
                <div className="relative w-full h-28 rounded-xl overflow-hidden border border-slate-700 bg-black">
                  <img
                    src={bannerUrl}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Match Format Decided Here: One Day vs Test (2 Innings/Side) */}
          <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-xs font-black text-amber-300">
              स्पर्धेचा डाव प्रकार (One Day / Test)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat(MATCH_FORMATS.ONE_DAY)}
                className={`py-2 px-3 rounded-xl text-xs font-black border cursor-pointer ${
                  format === MATCH_FORMATS.ONE_DAY
                    ? "bg-amber-400 text-slate-950 border-amber-300"
                    : "bg-slate-900 text-slate-300 border-slate-700"
                }`}
              >
                One Day
              </button>
              <button
                type="button"
                onClick={() => setFormat(MATCH_FORMATS.TEST)}
                className={`py-2 px-3 rounded-xl text-xs font-black border cursor-pointer ${
                  format === MATCH_FORMATS.TEST
                    ? "bg-amber-400 text-slate-950 border-amber-300"
                    : "bg-slate-900 text-slate-300 border-slate-700"
                }`}
              >
                Test (2 Innings/Side)
              </button>
            </div>
          </div>

          {/* League vs Single + Easy Group Chips */}
          <div className="space-y-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-xs font-black text-amber-300">
              स्पर्धेचा रचना प्रकार (Mode)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("league")}
                className={`py-2 px-3 rounded-xl text-xs font-black border cursor-pointer ${
                  mode === "league"
                    ? "bg-amber-400 text-slate-950 border-amber-300"
                    : "bg-slate-900 text-slate-300 border-slate-700"
                }`}
              >
                League (Groups + NRR)
              </button>
              <button
                type="button"
                onClick={() => setMode("single")}
                className={`py-2 px-3 rounded-xl text-xs font-black border cursor-pointer ${
                  mode === "single"
                    ? "bg-amber-400 text-slate-950 border-amber-300"
                    : "bg-slate-900 text-slate-300 border-slate-700"
                }`}
              >
                Single / Knockout
              </button>
            </div>

            {mode === "league" && (
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-bold text-slate-300">
                  Groups निवडा (Tap to Toggle):
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {Array.from(new Set([...PRESET_GROUPS, ...selectedGroups])).map(
                    (grp) => {
                      const active = selectedGroups.includes(grp);
                      return (
                        <button
                          key={grp}
                          type="button"
                          onClick={() => toggleGroupSelection(grp)}
                          className={`px-3 py-1 rounded-full text-xs font-black border cursor-pointer transition ${
                            active
                              ? "bg-amber-400 text-slate-950 border-amber-300"
                              : "bg-slate-900 text-slate-400 border-slate-700 hover:text-white"
                          }`}
                        >
                          {active ? `✓ ${grp}` : grp}
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customGroupInput}
                    onChange={(e) => setCustomGroupInput(e.target.value)}
                    placeholder="नवीन नाव (उदा. Group E)"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddQuickGroup}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-black cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setViewMode("list");
                resetForm();
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 cursor-pointer"
            >
              रद्द करा
            </button>
            <button
              type="submit"
              disabled={uploadingBanner}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 text-xs sm:text-sm font-black cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingId ? "बदल सेव्ह करा" : "स्पर्धा सेव्ह करा"}</span>
            </button>
          </div>
        </form>
      </div>
    );
  }
  // === SECTION: SUB-VIEW CREATE / EDIT TOURNAMENT END ===

  // === SECTION: SUB-VIEW TOURNAMENT DETAIL (HOME | TEAMS | MATCHES | POINTS | STATISTICS) START ===
  if (viewMode === "tournament_detail" && activeTournament) {
    const pointGroupNames = activeTournament.groups || [];
    const activePointRows = pointsByGroup[selectedPointGroup] || [];
    const activePointTeamIds = activeTournament.groupTeams?.[selectedPointGroup] || [];

    return (
      <div className="space-y-3.5 text-white">
        {/* Back to Tournaments + Edit Button */}
        <div className="flex items-center justify-between gap-2 bg-slate-900 px-3.5 py-2.5 rounded-2xl border border-slate-800">
         <button
  type="button"
  onClick={() => {
    setViewMode("list");
    if (onTournamentScopeChange) onTournamentScopeChange(false);
  }}
  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
>
  <ArrowLeft className="w-3.5 h-3.5" />
  <span>स्पर्धा यादी</span>
</button>

          <button
            type="button"
            onClick={() => openEditSubView(activeTournament)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-black cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit स्पर्धा</span>
          </button>
        </div>

        {/* Context-Aware Tournament Sub-View Tabs (Single-Line Horizontal Scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap bg-slate-900 p-1.5 rounded-2xl border border-slate-800 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <button
            type="button"
            onClick={() => setDetailTab("home")}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer ${
              detailTab === "home"
                ? "bg-amber-400 text-slate-950"
                : "bg-slate-800/80 text-slate-300 hover:text-white"
            }`}
          >
            Home
          </button>

          <button
            type="button"
            onClick={() => onOpenTeamsView && onOpenTeamsView(activeTournament.id)}
            className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-black bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            Teams ({tournamentTeams.length})
          </button>

          <button
            type="button"
            onClick={() =>
              onOpenMatchesView && onOpenMatchesView(activeTournament.id)
            }
            className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-black bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            Matches ({tournamentMatches.length})
          </button>

          <button
            type="button"
            onClick={() => setDetailTab("points")}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer ${
              detailTab === "points"
                ? "bg-amber-400 text-slate-950"
                : "bg-slate-800/80 text-slate-300 hover:text-white"
            }`}
          >
            Points
          </button>

          <button
            type="button"
            onClick={() => setDetailTab("statistics")}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer ${
              detailTab === "statistics"
                ? "bg-amber-400 text-slate-950"
                : "bg-slate-800/80 text-slate-300 hover:text-white"
            }`}
          >
            Statistics
          </button>
        </div>

        {/* 1.1 HOME SUB-VIEW */}
        {detailTab === "home" && (
          <div className="space-y-3.5">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              {activeTournament.bannerUrl && (
                <div className="w-full h-32 bg-black overflow-hidden">
                  <img
                    src={activeTournament.bannerUrl}
                    alt={activeTournament.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-4 space-y-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30">
                    {activeTournament.club} • Season {activeTournament.season}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                    {activeTournament.format === MATCH_FORMATS.TEST
                      ? "Test (2 Innings/Side)"
                      : "One Day"}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                    {activeTournament.mode === "league" ? "League" : "Single Match"}
                  </span>
                </div>

                <h1 className="text-lg sm:text-xl font-black text-white">
                  {activeTournament.name}
                </h1>

                {(activeTournament.startDate || activeTournament.endDate) && (
                  <div className="text-xs text-slate-400">
                    {activeTournament.startDate || "-"} ते{" "}
                    {activeTournament.endDate || "-"}
                  </div>
                )}

                {/* Shortcut Buttons: Start / Schedule Match & Create Group */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenMatchesView &&
                      onOpenMatchesView(activeTournament.id)
                    }
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer"
                  >
                    <Gavel className="w-3.5 h-3.5" />
                    <span>Start / Schedule Match</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetailTab("points")}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-black cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Create Group</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Selected Teams Preview */}
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-white">
                  निवडलेले संघ ({tournamentTeams.length})
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    onOpenTeamsView && onOpenTeamsView(activeTournament.id)
                  }
                  className="text-xs font-black text-amber-300 hover:underline cursor-pointer"
                >
                  Manage Teams →
                </button>
              </div>

              {tournamentTeams.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {tournamentTeams.map((tm) => (
                    <div
                      key={tm.id}
                      onClick={() =>
                        onOpenTeamsView &&
                        onOpenTeamsView(activeTournament.id)
                      }
                      className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs font-bold cursor-pointer hover:border-amber-400/50"
                    >
                      {tm.logoUrl ? (
                        <img
                          src={tm.logoUrl}
                          alt={tm.name}
                          className="w-7 h-7 rounded-full object-contain bg-black border border-slate-700 p-0.5 shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-amber-300 text-[10px] font-black flex items-center justify-center shrink-0">
                          {(tm.shortName || tm.name || "TM")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}
                      <span className="truncate text-white">{tm.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  अद्याप कोणताही संघ जोडलेला नाही.
                </div>
              )}
            </div>

            {/* Recent Matches Summary */}
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2">
              <h2 className="text-sm font-black text-white">
                सामने ({tournamentMatches.length})
              </h2>
              {tournamentMatches.length > 0 ? (
                <div className="space-y-2">
                  {tournamentMatches.slice(0, 4).map((m) => {
                    const inn =
                      m.innings?.[m.activeInningsIndex || 0] || m.innings?.[0];
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs"
                      >
                        <div className="font-bold text-white truncate">
                          {teamMap[m.teamAId]?.name || "Team 1"} vs{" "}
                          {teamMap[m.teamBId]?.name || "Team 2"}
                        </div>
                        <div className="text-amber-300 font-black shrink-0 ml-2">
                          {inn && m.status !== "scheduled"
                            ? `${inn.runs}/${inn.wickets} (${formatOversFromBalls(
                                inn.legalBalls,
                                m.ballsPerOver
                              )})`
                            : m.status}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  अद्याप सामने नाहीत.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 1.4 POINTS SUB-VIEW (CREATE GROUP + ADD/REMOVE TEAM IN GROUP + NRR TABLE) */}
        {detailTab === "points" && (
          <div className="space-y-3.5">
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
              <div className="text-sm font-black text-amber-300">
                Create Group & Group Teams
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newPointGroupName}
                  onChange={(e) => setNewPointGroupName(e.target.value)}
                  placeholder="नवीन ग्रुप नाव (उदा. Group C)"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleCreatePointGroup}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer shrink-0"
                >
                  + Create Group
                </button>
              </div>

              {pointGroupNames.length > 0 && (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {pointGroupNames.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setSelectedPointGroup(g)}
                        className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer ${
                          selectedPointGroup === g
                            ? "bg-amber-400 text-slate-950"
                            : "bg-slate-800 text-slate-300 hover:text-white"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={teamToAddInPointGroup}
                      onChange={(e) => setTeamToAddInPointGroup(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                    >
                      <option value="">ग्रुपमध्ये जोडण्यासाठी संघ निवडा...</option>
                      {tournamentTeams.map((tm) => (
                        <option key={tm.id} value={tm.id}>
                          {tm.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddTeamInPointGroup}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-black cursor-pointer shrink-0"
                    >
                      Add Team
                    </button>
                  </div>

                  {activePointTeamIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activePointTeamIds.map((tid) => (
                        <span
                          key={tid}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                        >
                          <span>{teamMap[tid]?.name || tid}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTeamFromPointGroup(tid)}
                            className="text-rose-400 hover:text-rose-300 cursor-pointer"
                            title="Remove from Group"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Points Table with NRR */}
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2.5">
              <div className="text-sm font-black text-white">
                {selectedPointGroup || "Points Table"} (M, W, L, P, NRR)
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                      <th className="py-2 pr-2">#</th>
                      <th className="py-2 px-2">Team</th>
                      <th className="py-2 px-2 text-center">M</th>
                      <th className="py-2 px-2 text-center">W</th>
                      <th className="py-2 px-2 text-center">L</th>
                      <th className="py-2 px-2 text-center">P</th>
                      <th className="py-2 pl-2 text-right">NRR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {activePointRows.length > 0 ? (
                      activePointRows.map((row, idx) => (
                        <tr key={row.teamId}>
                          <td className="py-2.5 pr-2 text-slate-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-2 font-black text-white">
                            {row.teamName}
                          </td>
                          <td className="py-2.5 px-2 text-center">{row.played}</td>
                          <td className="py-2.5 px-2 text-center text-amber-300 font-bold">
                            {row.won}
                          </td>
                          <td className="py-2.5 px-2 text-center text-rose-400">
                            {row.lost}
                          </td>
                          <td className="py-2.5 px-2 text-center font-black text-amber-400">
                            {row.points}
                          </td>
                          <td className="py-2.5 pl-2 text-right font-mono text-slate-200">
                            {row.nrr > 0 ? `+${row.nrr}` : row.nrr}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-5 text-center text-xs text-slate-400"
                        >
                          या ग्रुपसाठी अद्याप डेटा नाही.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 1.5 STATISTICS SUB-VIEW */}
        {detailTab === "statistics" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-black text-amber-300">
                <BarChart3 className="w-4 h-4" />
                <span>Most Runs (Batting)</span>
              </div>
              {tournamentStats.topBatters.length > 0 ? (
                <div className="divide-y divide-slate-800/80 text-xs">
                  {tournamentStats.topBatters.slice(0, 8).map((b, i) => (
                    <div
                      key={b.playerId}
                      className="py-2 flex items-center justify-between"
                    >
                      <span className="font-bold text-white">
                        {i + 1}. {b.playerName}{" "}
                        {b.playerCode ? `(${b.playerCode})` : ""}
                      </span>
                      <span className="font-mono font-black text-amber-300">
                        {b.runs} ({b.balls}) • 6s:{b.sixes}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-3">
                  अद्याप फलंदाजी आकडेवारी नाही.
                </div>
              )}
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-black text-amber-300">
                <BarChart3 className="w-4 h-4" />
                <span>Most Wickets (Bowling)</span>
              </div>
              {tournamentStats.topBowlers.length > 0 ? (
                <div className="divide-y divide-slate-800/80 text-xs">
                  {tournamentStats.topBowlers.slice(0, 8).map((bw, i) => (
                    <div
                      key={bw.playerId}
                      className="py-2 flex items-center justify-between"
                    >
                      <span className="font-bold text-white">
                        {i + 1}. {bw.playerName}{" "}
                        {bw.playerCode ? `(${bw.playerCode})` : ""}
                      </span>
                      <span className="font-mono font-black text-amber-300">
                        {bw.wickets}W • {bw.runsConceded}R
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-3">
                  अद्याप गोलंदाजी आकडेवारी नाही.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  // === SECTION: SUB-VIEW TOURNAMENT DETAIL (HOME | TEAMS | MATCHES | POINTS | STATISTICS) END ===

  // === SECTION: MAIN TOURNAMENT LIST VIEW START ===
  return (
    <div className="space-y-3.5 text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-base sm:text-xl font-black text-white">
            स्पर्धा (Tournaments)
          </h1>
          <p className="text-xs text-slate-400">
            स्पर्धेवर क्लिक करून Home, Teams, Matches, Points आणि Statistics पहा.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateSubView}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-black cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>नवीन स्पर्धा</span>
        </button>
      </div>

      {tournaments.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 text-center space-y-2">
          <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="text-sm font-black text-slate-200">
            अद्याप कोणतीही स्पर्धा तयार केलेली नाही
          </div>
          <p className="text-xs text-slate-400">
            वरच्या &ldquo;नवीन स्पर्धा&rdquo; बटणावर क्लिक करून पहिली स्पर्धा तयार करा.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {tournaments.map((trn) => {
            const teamCount = Array.isArray(trn.tournamentTeamIds)
              ? trn.tournamentTeamIds.length
              : 0;
            const matchCount = matches.filter(
              (m) => m.tournamentId === trn.id
            ).length;

            return (
              <div
                key={trn.id}
                onClick={() => openTournamentDetail(trn.id, "home")}
                className="bg-slate-900 rounded-2xl border border-slate-800 hover:border-amber-400/60 overflow-hidden transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {trn.bannerUrl && (
                    <div className="w-full h-28 bg-black overflow-hidden">
                      <img
                        src={trn.bannerUrl}
                        alt={trn.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                        {trn.club || "JBSC"} • {trn.season || "2026"}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                        {trn.format === MATCH_FORMATS.TEST ? "Test" : "One Day"}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-white leading-snug">
                      {trn.name}
                    </h3>

                    {(trn.startDate || trn.endDate) && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {trn.startDate || "-"} ते {trn.endDate || "-"}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTournament && onSelectTournament(trn.id);
                          onOpenTeamsView && onOpenTeamsView(trn.id);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span>संघ ({teamCount})</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTournament && onSelectTournament(trn.id);
                          onOpenMatchesView && onOpenMatchesView(trn.id);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer"
                      >
                        <Gavel className="w-3.5 h-3.5" />
                        <span>सामने ({matchCount})</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-2.5 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-300">
                    Home / Points / Stats साठी क्लिक करा →
                  </span>

                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => openEditSubView(trn)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 cursor-pointer"
                      title="Edit स्पर्धा"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTournament(trn)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                      title="Delete स्पर्धा"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
  // === SECTION: MAIN TOURNAMENT LIST VIEW END ===
}