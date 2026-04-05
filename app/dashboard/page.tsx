"use client";

import { useEffect, useState } from 'react';
import LiveTicker from '@/src/components/LiveTicker';
import MatchCard from '@/src/components/MatchCard';
import SignalPanel from '@/src/components/SignalPanel';
import SkeletonLoader from '@/src/components/SkeletonLoader';

export default function Dashboard() {
  const [matches, setMatches] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Both API routes logic can be unified, or distinct. 
    // Here we parallel fetch.
    Promise.all([
      fetch('/api/matches').then(res => res.json()),
      fetch('/api/signals').then(res => res.json())
    ]).then(([matchData, signalData]) => {
      if (matchData.success) {
        // upcoming 14 days rule applied backend, or frontend filter:
        const future = new Date();
        future.setDate(future.getDate() + 14);

        const upcomingMatches = matchData.upcoming.filter((m: any) => {
          const dt = new Date(m.match_date);
          return dt <= future && m.status === 'scheduled';
        });
        setMatches(upcomingMatches);
      }
      if (signalData.success) {
        setSignals(signalData.signals);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-12">
      <LiveTicker />

      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          Upcoming Matches <span className="text-xs font-normal text-gray-500 bg-gray-800 px-2 py-1 rounded">Next 14 Days</span>
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonLoader /><SkeletonLoader /><SkeletonLoader />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map(m => <MatchCard key={m.match_id} match={m} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          Pre-Match Signal Watchlist
        </h2>
        {loading ? (
          <div className="space-y-4 shadow-lg"><SkeletonLoader /></div>
        ) : (
          <div className="space-y-4">
            {signals.map(s => <SignalPanel key={s.id} signal={s} />)}
          </div>
        )}
      </section>

      <footer className="mt-20 pt-8 border-t border-gray-900 text-center pb-8 border-b-0">
        <p className="text-xs text-gray-600 max-w-3xl mx-auto leading-relaxed">
          <strong className="block text-gray-400 mb-2">LEGAL DISCLAIMER</strong>
          Mosport provides pre-match sports analytics for informational and research purposes only.
          The platform does not provide real-time betting signals, does not facilitate gambling, and does not guarantee data synchronization with live events.
          All match data may be delayed and is intended solely for analytical and educational purposes.
        </p>
      </footer>
    </div>
  );
}
