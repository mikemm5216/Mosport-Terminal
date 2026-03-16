"use client";

import { useEffect, useState } from 'react';

export default function Reports() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    // In a full implementation this would hit GET /api/reports 
    // querying the ModelPerformance table.
    // Mocking the hypothetical retrieval for the initial frontend layout.
    setReports([
      {
        report_month: "2026-02",
        matches_analyzed: 450,
        average_edge: 0.091,
        signals_generated: 45,
        hypothetical_model_roi: 12.8
      },
      {
        report_month: "2026-01",
        matches_analyzed: 610,
        average_edge: 0.088,
        signals_generated: 58,
        hypothetical_model_roi: 14.2
      }
    ]);
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Model Performance Archive</h1>
      <p className="text-gray-400 mb-10 max-w-2xl">
        Monthly aggregates drawn from Cold Data (matches &gt; 30 days). 
        All ROI figures represent theoretical algorithmic edges and do not reflect real betting outcomes.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {reports.map((r, idx) => (
           <div key={idx} className="bg-[#181A20] border border-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-[#00AEEF] mb-4">{r.report_month}</h3>
              
              <div className="space-y-3">
                 <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Matches Analyzed</span>
                    <span className="font-mono text-white">{r.matches_analyzed}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Signals Generated</span>
                    <span className="font-mono text-white">{r.signals_generated}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Average Edge</span>
                    <span className="font-mono text-white">{(r.average_edge * 100).toFixed(1)}%</span>
                 </div>
                 
                 <div className="pt-3 mt-3 border-t border-gray-800 flex justify-between items-center">
                    <span className="text-xs uppercase text-gray-500">Hypothetical Model ROI</span>
                    <span className={`font-mono text-lg ${r.hypothetical_model_roi > 0 ? 'text-green-400' : 'text-red-400'}`}>
                       {r.hypothetical_model_roi > 0 ? '+' : ''}{r.hypothetical_model_roi.toFixed(1)}%
                    </span>
                 </div>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
}
