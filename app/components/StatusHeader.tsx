"use client";

import React, { useEffect, useState } from 'react';
import { DataFreshnessBadge } from './DataFreshnessBadge';

export function StatusHeader() {
  const [meta, setMeta] = useState<{
    lastUpdatedAt: string | null;
    dataFreshness: "live" | "recent" | "stale" | "offline";
    fallbackUsed: boolean;
  } | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/matches?limit=1');
        const json = await res.json();
        if (json.success && json.meta) {
          setMeta(json.meta);
        }
      } catch (err) {
        console.error("Failed to fetch status", err);
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (!meta) {
    return <span className="text-primary-container glow-text animate-pulse">System Active</span>;
  }

  return (
    <DataFreshnessBadge
      freshness={meta.dataFreshness}
      lastUpdatedAt={meta.lastUpdatedAt}
      fallbackUsed={meta.fallbackUsed}
    />
  );
}
