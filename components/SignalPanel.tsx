export default function SignalPanel({ signal }: { signal?: any }) {
  return (
    <div className="bg-[#0B0C10] p-4 rounded-lg border border-[#00AEEF]">
      <h3 className="font-bold text-[#FF2E88]">Signal Watchlist Item</h3>
      <p className="text-sm text-[#00AEEF]">{signal?.name || "Unknown Signal"}</p>
    </div>
  );
}
