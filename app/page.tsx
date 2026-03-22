import { prisma } from "@/lib/prisma";
import MatchCard from "@/components/match-card";

export const dynamic = 'force-dynamic';

export default async function Home() {
  // 抓取近期的賽事，並 include 關聯資料
  const matches = await prisma.matches.findMany({
    take: 33, // 執行長指定的 33 場比賽
    orderBy: { match_date: 'desc' },
    include: {
      home_team: true,
      away_team: true,
      snapshots: {
        take: 1,
        orderBy: { snapshot_time: 'desc' }
      }
    }
  });

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center p-3 sm:p-6 md:p-8 gap-6">
      {/* Header */}
      <div className="w-full max-w-[90vw] sm:max-w-md md:max-w-lg lg:max-w-xl mb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Mosport <span className="text-cyan-400">Terminal</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">Live Intelligence & Story Engine Feed</p>
      </div>

      {/* Match Feed */}
      {matches.length === 0 ? (
        <div className="text-slate-500 py-20 text-center">
          <p className="text-lg">No active signals available.</p>
          <p className="text-sm mt-2">Waiting for ingestion engine to push data...</p>
        </div>
      ) : (
        matches.map((match: any) => (
          <MatchCard key={match.match_id} match={match} />
        ))
      )}
    </main>
  );
}
