"use client";

import { useEffect, useState } from 'react';
import SignalPanel from '../../components/SignalPanel';
import SkeletonLoader from '../../components/SkeletonLoader';

export default function WarRoom() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/signals')
      .then(res => res.json())
      .then(data => {
        if (data.success) setSignals(data.signals);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#FF2E88] animate-pulse"></span>
            War Room
          </h1>
          <p className="text-gray-400 mt-2">Live Alpha Signals extracted from market inefficiencies.</p>
        </div>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          <SkeletonLoader /><SkeletonLoader />
        </div>
      ) : (
        <div className="space-y-4">
          {signals.length > 0 ? signals.map(sig => (
            <SignalPanel key={sig.id} signal={sig} />
          )) : (
             <div className="p-10 border border-gray-800 rounded bg-[#181A20] text-center">
                <p className="text-gray-500">NO ACTIVE SIGNALS</p>
                <p className="text-xs text-gray-600 mt-2">Waiting for Quantitative Edge to surpass threshold...</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
