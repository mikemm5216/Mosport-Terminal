"use client";

import React from 'react';

type Freshness = "live" | "recent" | "stale" | "offline";

type Props = {
  freshness: Freshness;
  lastUpdatedAt: string | null;
  sourceProvider?: string;
  fallbackUsed?: boolean;
};

function formatAge(lastUpdatedAt: string | null) {
  if (!lastUpdatedAt) return "No data";

  const diffMs = Date.now() - new Date(lastUpdatedAt).getTime();
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

export function DataFreshnessBadge({
  freshness,
  lastUpdatedAt,
  sourceProvider = "espn",
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
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      fontFamily: "var(--font-inter)",
      fontSize: "10px",
      fontWeight: 600,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: activeColor,
      backgroundColor: "rgba(0,0,0,0.2)",
      padding: "2px 8px",
      borderRadius: "4px",
      border: `1px solid ${activeColor}33`,
    }}>
      <div style={{
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        backgroundColor: activeColor,
        boxShadow: `0 0 8px ${activeColor}`,
        animation: freshness === "live" ? "pulse 2s infinite" : "none"
      }} />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `}} />
      <span style={{ color: activeColor }}>{label}</span>
      <span style={{ opacity: 0.4, color: "#fff" }}>·</span>
      <span style={{ color: "#fff", opacity: 0.8 }}>{formatAge(lastUpdatedAt)}</span>
      {fallbackUsed && (
        <>
          <span style={{ opacity: 0.4, color: "#fff" }}>·</span>
          <span style={{ color: "#f5c451", fontSize: "9px" }}>BACKUP</span>
        </>
      )}
    </div>
  );
}
