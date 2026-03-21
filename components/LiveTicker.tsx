"use client";

import { useEffect, useState } from 'react';

export default function LiveTicker() {
  const [scores, setScores] = useState<any[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    // Fetch from Redis-backed API every 15 seconds
    const fetchLiveScores = () => {
      fetch('/api/live')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.liveScores) {
              setScores(data.liveScores);
            }
        });
    };
    
    fetchLiveScores();
    const interval = setInterval(fetchLiveScores, 15000);
    return () => clearInterval(interval);
  }, []);

  if (scores.length === 0) return null;

  return (
    <div className="w-full bg-[#0B0C10] border-y border-gray-800 overflow-hidden relative h-12 flex items-center">
       <div 
         className={`flex animate-marquee whitespace-nowrap ${isPaused ? 'play-state-paused' : ''}`}
         onMouseEnter={() => setIsPaused(true)}
         onMouseLeave={() => setIsPaused(false)}
         onTouchStart={() => setIsPaused(!isPaused)}
       >
          {scores.map((s, idx) => (
             <div key={idx} className="mx-8 flex items-center gap-3 text-sm">
                <span className="text-[#FF2E88] animate-pulse w-2 h-2 rounded-full"></span>
                <span className="text-gray-400">{s.time_elapsed} (Delay {s.delay})</span>
                <span className="font-bold">{s.match_id.split('-').join(' vs ')}</span>
                <span className="font-mono text-[#00AEEF] ml-2">[{s.home_score} - {s.away_score}]</span>
             </div>
          ))}
       </div>
       
       <style jsx>{`
         .animate-marquee {
           display: inline-flex;
           animation: marquee 30s linear infinite;
         }
         .play-state-paused {
           animation-play-state: paused;
         }
         @keyframes marquee {
           0% { transform: translateX(100vw); }
           100% { transform: translateX(-100%); }
         }
       `}</style>
    </div>
  );
}
