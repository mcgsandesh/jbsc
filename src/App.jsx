// src/App.jsx
import React, { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";
import Home from "./modules/public/Home";
import Registration from "./modules/public/Registration";
import PublicList from "./modules/public/PublicList";
import Login from "./modules/admin/Login";
import Dashboard from "./modules/admin/Dashboard";
import Events from "./modules/admin/Events";
import Users from "./modules/admin/Users";
import ManageRegistrations from "./modules/admin/ManageRegistrations";
import FinanceModule from "./modules/admin/FinanceModule";
import Gallery from "./modules/public/Gallery";
import QrScanner from "./modules/admin/QrScanner";
import LuckyDrawAdmin from "./modules/admin/LuckyDrawAdmin";
import { requestNotificationPermission, onForegroundMessage } from "./services/fcmService";
import NotificationModule from "./modules/admin/NotificationModule";
import AuctionSetupManager from "./modules/admin/AuctionSetupManager";
import PublicAuctionScreen from "./modules/public/PublicAuctionScreen";
import TeamOwnerPortal from "./modules/public/TeamOwnerPortal";
import TournamentHubView from "./components/scoring/TournamentHubView";
import TournamentTeamsView from "./components/scoring/TournamentTeamsView";
import FixtureAndTossView from "./components/scoring/FixtureAndTossView";
import MatchScoringView from "./components/scoring/MatchScoringView";
import LiveScoreboard from "./modules/public/LiveScoreboard";

// === SECTION: SCORING ADMIN SUB-VIEW WORKSPACE START ===
function ScoringAdminWorkspace() {
  // Main top tabs: "tournaments" | "teams" | "matches"
  const [step, setStep] = useState("tournaments");
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [insideDetailScope, setInsideDetailScope] = useState(false);

  const openTeams = (trnId, teamId = "") => {
    if (trnId) setSelectedTournamentId(trnId);
    if (teamId) {
      setSelectedTeamId(teamId);
      setInsideDetailScope(true);
    } else {
      setInsideDetailScope(false);
    }
    setStep("teams");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openTeamOverviewDirect = (teamId, trnId = "") => {
    if (trnId) setSelectedTournamentId(trnId);
    setSelectedTeamId(teamId);
    setInsideDetailScope(true);
    setStep("teams");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openFixtures = (trnId) => {
    if (trnId) setSelectedTournamentId(trnId);
    setInsideDetailScope(true);
    setStep("matches");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openScoring = (mtId) => {
    if (mtId) setSelectedMatchId(mtId);
    setInsideDetailScope(true);
    setStep("scoring");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const backToMainList = () => {
    setInsideDetailScope(false);
    setSelectedTeamId("");
    setStep("tournaments");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-3">
      {/* Detail/Sub-view मध्ये गेल्यावर मुख्य टॉप बार लपतो; Back केल्यावर पुन्हा दिसतो */}
      {!insideDetailScope && (
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap bg-slate-900 p-1.5 rounded-2xl border border-slate-800 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {[
            { id: "tournaments", label: "Tournaments" },
            { id: "teams", label: "Teams" },
            { id: "matches", label: "Matches" }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedTeamId("");
                setStep(item.id);
              }}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition ${
                step === item.id
                  ? "bg-amber-400 text-slate-950 shadow-xs"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {step === "tournaments" && (
        <TournamentHubView
          selectedTournamentId={selectedTournamentId}
          onSelectTournament={(id) => setSelectedTournamentId(id)}
          onTournamentScopeChange={(active) => setInsideDetailScope(active)}
          onOpenTeamsView={(trnId) => openTeams(trnId, "")}
          onOpenTeamOverview={openTeamOverviewDirect}
          onOpenMatchesView={openFixtures}
        />
      )}

      {step === "teams" && (
        <TournamentTeamsView
          tournamentId={selectedTournamentId}
          initialTeamId={selectedTeamId}
          initialTab="overview"
          onBackToTournaments={backToMainList}
          onScopeChange={(active) => setInsideDetailScope(active)}
          onProceedToMatches={openFixtures}
        />
      )}

      {step === "matches" && (
        <FixtureAndTossView
          tournamentId={selectedTournamentId}
          onBackToTournaments={backToMainList}
          onOpenTeamOverview={openTeamOverviewDirect}
          onStartScoring={openScoring}
        />
      )}

      {step === "scoring" && (
        <MatchScoringView
          matchId={selectedMatchId}
          onBackToFixtures={() => {
            setInsideDetailScope(false);
            setStep("matches");
          }}
        />
      )}
    </div>
  );
}
// === SECTION: SCORING ADMIN SUB-VIEW WORKSPACE END ===
// === SECTION: SCORING ADMIN SUB-VIEW WORKSPACE END ===

// === SECTION: PUBLIC LIVE SCOREBOARD ROUTE WRAPPER START ===
function PublicLiveScoreboardRoute() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();

  return (
    <LiveScoreboard
      initialTournamentId={tournamentId || ""}
      onBackHome={() => navigate("/")}
    />
  );
}
// === SECTION: PUBLIC LIVE SCOREBOARD ROUTE WRAPPER END ===

export default function App() {
  useEffect(() => {
    // ॲप सुरू झाल्यावर नोटिफिकेशन परवानगीसाठी विचारणे
    requestNotificationPermission();

    // फॉरग्राउंड मेसेज ऐकणे
    onForegroundMessage();
  }, []);

  return (
    <HashRouter>
      <Routes>
        {/* Standalone Projector / Public Live Auction Screen (No PublicLayout Navbar) */}
        <Route path="/auction-live/:auctionId" element={<PublicAuctionScreen />} />
        <Route path="/auction-team" element={<TeamOwnerPortal />} />
        <Route path="/auction-team/:auctionId" element={<TeamOwnerPortal />} />

        {/* Standalone Public Live Cricket Scoreboard */}
        <Route path="/live-score" element={<PublicLiveScoreboardRoute />} />
        <Route path="/live-score/:tournamentId" element={<PublicLiveScoreboardRoute />} />

        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="register" element={<Registration />} />
          <Route path="register/:slug" element={<Registration />} />
          <Route path=":slug" element={<Registration />} />
          <Route path="public-list" element={<PublicList />} />
          <Route path="list/:slug" element={<PublicList />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="admin/login" element={<Login />} />
        </Route>

        {/* Protected Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="events" element={<Events />} />
          <Route path="registrations" element={<ManageRegistrations />} />
          <Route path="scanner" element={<QrScanner />} />
          <Route path="lucky-draw" element={<LuckyDrawAdmin />} />
          <Route path="finance" element={<FinanceModule />} />
          <Route path="users" element={<Users />} />
          <Route path="notifications" element={<NotificationModule />} />
          <Route path="auction" element={<AuctionSetupManager />} />
          <Route path="scoring" element={<ScoringAdminWorkspace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}