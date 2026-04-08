"use client";

import { useEffect, useState } from 'react';
import MatchCard from '../../components/MatchCard';
import SkeletonLoader from '../../components/SkeletonLoader';

export default function MatchExplorer() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/matches')
      .then(res => res.json())
      .then(data => {
        if (data.success) setMatches(data.upcoming);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Match Explorer</h1>
      {loading ? (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
          <SkeletonLoader /><SkeletonLoader /><SkeletonLoader />
        </div>
      ) : (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
          {matches.map(m => (
            <MatchCard key={m.match_id} match={m} />
          ))}
          {matches.length === 0 && <p className="text-gray-500">No scheduled matches found.</p>}
        </div>
      )}
    </div>
  );
}
