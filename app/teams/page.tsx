"use client";

import { useEffect, useState } from 'react';
import TeamStats from '../../components/TeamStats';
import SkeletonLoader from '../../components/SkeletonLoader';

export default function TeamAnalytics() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/teams')
      .then(res => res.json())
      .then(data => {
        if (data.success) setTeams(data.teams);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Team Analytics</h1>
      <p className="text-gray-400 mb-8">Dynamic World State representations for all tracked teams.</p>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonLoader /><SkeletonLoader />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map(t => (
            <TeamStats key={t.team_id} team={t} />
          ))}
        </div>
      )}
    </div>
  );
}
