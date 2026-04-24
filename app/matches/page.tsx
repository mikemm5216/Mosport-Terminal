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
        if (data.success && data.data) {
          setMatches(data.data);
        } else if (data.success && data.upcoming) {
          // Backward compatibility for temporary legacy keys
          setMatches(data.upcoming);
        }
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Match Explorer</h1>
      {loading ? (
        <div className="h-[85vh] overflow-y-scroll scrollbar-hide px-4 py-10 flex flex-col gap-12">
          <SkeletonLoader /><SkeletonLoader /><SkeletonLoader />
        </div>
      ) : (
        <div className="h-[85vh] overflow-y-scroll scrollbar-hide px-4 py-10 flex flex-col gap-12">
          {matches.map(m => (
            <MatchCard key={m.match_id} match={m} />
          ))}
          {matches.length === 0 && <p className="text-gray-500">No scheduled matches found.</p>}
        </div>
      )}
    </div>
  );
}
