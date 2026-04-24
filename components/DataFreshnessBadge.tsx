"use client";

import React from 'react';

export type Freshness = "live" | "recent" | "stale" | "offline";

type Props = {
  freshness: Freshness;
  lastUpdatedAt: string | null;
  sourceProvider?: string;
  fallbackUsed?: boolean;
};

function formatAge(lastUpdatedAt: string | null) {
  if (!lastUpdatedAt) return "No recent data";

  const diffMs = Date.now() - new Date(lastUpdatedAt).getTime();
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return "Updated just now";
  if (mins < 60) return `Updated ${mins}m ago`;

  const hours = Math.floor(mins / 60);
  return `Updated ${hours}h ago`;
}

export function DataFreshnessBadge({
  freshness,
  lastUpdatedAt,
  sourceProvider = "unknown",
  fallbackUsed = false,
}: Props) {
  const label =
    freshness === "live"
      ? "LIVE"
      : freshness === "recent"
      ? "RECENT"
      : freshness === "stale"
      ? "STALE"
      : "OFFLINE";

  const colorMap = {
    live: "#2ee6a6",
    recent: "#25d8ff",
    stale: "#f5c451",
    offline: "#ff4d6d",
  };

  const activeColor = colorMap[freshness];

  return (
    <div className={`freshness-badge freshness-${freshness}`} style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: activeColor
    }}>
      <span style={{
          width: "8px",
          height: "8px",
          borderRadius: "999px",
          backgroundColor: activeColor,
          boxShadow: `0 0 10px ${activeColor}`,
          animation: freshness === "live" ? "pulse 2s infinite" : "none"
      }} />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `}} />
      <span>{label}</span>
      <span style={{ opacity: 0.4, color: "#fff" }}>·</span>
      <span style={{ color: "#fff", opacity: 0.8 }}>{formatAge(lastUpdatedAt)}</span>
      {fallbackUsed && (
          <>
            <span style={{ opacity: 0.4, color: "#fff" }}>·</span>
            <span style={{ color: "#f5c451" }}>BACKUP FEED</span>
          </>
      )}
    </div>
  );
}
