"use client";

import { useEffect, useState } from "react";
import { SignalCard } from "@/components/SignalCard";

interface Signal {
  match_id: string;
  match_name: string;
  probability: number;
  odds: number;
  implied: number;
  edge: number;
  kelly: number;
}

export default function WarRoom() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSignals = async () => {
    try {
      const res = await fetch("/api/edge");
      const data = await res.json();
      setSignals(data.data || []);
    } catch (err) {
      console.error("Failed to fetch signals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();

    // ⏱ 每 30 秒自動刷新（即時戰情）
    const interval = setInterval(fetchSignals, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Mosport War Room
        </h1>

        <div className="text-sm text-zinc-400">
          Live Edge Signals
        </div>
      </div>

      {/* 狀態列 */}
      <div className="mb-6 flex gap-6 text-sm">
        <div>
          Signals: <span className="text-white">{signals.length}</span>
        </div>
        <div>
          High Edge:{" "}
          <span className="text-pink-500">
            {signals.filter(s => s.edge > 0.05).length}
          </span>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-zinc-500 mb-6">Loading signals...</div>
      )}

      {/* 空資料 */}
      {!loading && signals.length === 0 && (
        <div className="text-zinc-500 mb-6">No signals found.</div>
      )}

      {/* 主體 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {signals.map((signal) => (
          <SignalCard key={signal.match_id} match={signal} />
        ))}
      </div>

      {/* 未來擴充預留 */}
      {/* TODO: 接入真實 Odds API */}
      {/* TODO: 加入 Filter（例如只看 edge > 5% 或特定聯賽） */}
      {/* TODO: 加入排序切換（依據 Edge / Kelly，由高到低排序，或相反） */}
    </div>
  );
}
