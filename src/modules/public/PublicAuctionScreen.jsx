// src/modules/public/PublicAuctionScreen.jsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import LiveAuctionStage from "../../components/auction/LiveAuctionStage";

export default function PublicAuctionScreen() {
  const { auctionId } = useParams();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black tracking-wider uppercase text-amber-400">
            JBSC Live Auction Projector Feed
          </span>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>मुख्य पान</span>
          </Link>
        </div>

        <LiveAuctionStage
          auctionId={auctionId}
          initialMode="display"
          allowControl={false}
        />
      </div>
    </div>
  );
}