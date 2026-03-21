import React from "react";
import { QuantEngine } from "@/lib/quant";

const getEdgeColor = (edge: number) => {
  if (edge > 0.08) return "text-pink-500";
  if (edge > 0.05) return "text-green-400";
  if (edge > 0) return "text-yellow-400";
  return "text-zinc-500";
};

export const SignalCard = ({ match }: any) => {
  const implied = QuantEngine.getImpliedProbability(match.odds);
  const edge = QuantEngine.getEdge(match.probability, implied);

  const isHot = edge > 0.05;

  return (
    <div className={`p-5 rounded-xl border bg-black transform hover:scale-105 transition duration-300 ${
      isHot ? "border-pink-500 animate-[pulse_2s_ease-in-out_infinite]" : "border-zinc-800"
    }`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold truncate pr-3" title={match.match_name}>
          {match.match_name}
        </h3>
        {isHot && (
          <span className="shrink-0 text-pink-500 text-xs font-bold px-2 py-1 rounded bg-pink-500/10">
            HIGH EDGE
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-zinc-500 mb-1">Model Prob</p>
          <p className="text-xl text-white font-mono">{(match.probability * 100).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1">Market Implied</p>
          <p className="text-xl text-zinc-400 font-mono">{(implied * 100).toFixed(1)}%</p>
        </div>
      </div>

      <div className="mt-5 bg-zinc-900/50 p-3 rounded-lg flex justify-between items-center">
        <div>
          <p className="text-xs text-zinc-500 mb-1">Expected Edge</p>
          <p className={`text-lg font-mono font-bold ${getEdgeColor(edge)}`}>
            {edge > 0 ? "+" : ""}{(edge * 100).toFixed(2)}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500 mb-1">Kelly Rec.</p>
          <p className="text-lg text-yellow-400 font-mono font-bold">
            {(match.kelly * 100).toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
};
