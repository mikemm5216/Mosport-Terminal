import Link from 'next/link';

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-20 border-b border-gray-800">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-gradient-to-r from-[#00AEEF] to-[#FF2E88] text-transparent bg-clip-text">
          Mosport Quant Terminal
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          The sports intelligence platform powered by dynamic world modeling, contextual event engines, and algorithmic signal extraction.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/matches" className="bg-[#00AEEF] hover:bg-[#0096D1] text-white px-6 py-3 rounded font-semibold transition-colors">
            Launch Explorer
          </Link>
          <Link href="/warroom" className="bg-[#181A20] hover:bg-[#20232A] border border-gray-800 text-gray-200 px-6 py-3 rounded font-semibold transition-colors">
            War Room Dashboard
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#12141A] p-6 rounded-lg border border-gray-800">
           <h3 className="text-xl font-bold mb-3 text-[#00AEEF]">Tier 1 Reality Data</h3>
           <p className="text-gray-400 text-sm leading-relaxed">Box scores, match stats, and schedules crawled in real-time. Verified by Zod schemas to ensure absolute data purity.</p>
        </div>
        <div className="bg-[#12141A] p-6 rounded-lg border border-gray-800">
           <h3 className="text-xl font-bold mb-3 text-[#FF2E88]">Event & Quant Engine</h3>
           <p className="text-gray-400 text-sm leading-relaxed">News and real-world disruptions are transformed into impact scores, updating team fatigue, stability, and strength parameters.</p>
        </div>
        <div className="bg-[#12141A] p-6 rounded-lg border border-gray-800">
           <h3 className="text-xl font-bold mb-3 text-[#00AEEF]">Alpha Signal Extraction</h3>
           <p className="text-gray-400 text-sm leading-relaxed">Model probabilities are cross-referenced with global market averages to isolate statistical inefficiencies and true signals.</p>
        </div>
      </section>

      {/* Legal Footer */}
      <footer className="mt-20 pt-8 border-t border-gray-900 text-center pb-8">
        <p className="text-xs text-gray-600 max-w-3xl mx-auto leading-relaxed">
          <strong>LEGAL DISCLAIMER:</strong> Mosport does not predict games directly from raw statistics and is not a betting platform. All data is provided "as is" for research and analytical purposes. Mosport is not affiliated with the National Basketball Association, Major League Basketball, J.League, or any other official sports league. Model outputs represent statistical probabilities, not guaranteed outcomes.
        </p>
      </footer>
    </div>
  );
}
