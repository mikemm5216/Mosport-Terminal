export default function IngestWorkerHome() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#020617",
      color: "#e5e7eb",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      padding: 32
    }}>
      <h1>mosport ingest-worker</h1>
      <p>Worker service is online.</p>
      <pre>{JSON.stringify({
        service: "ingest-worker",
        health: "/api/health",
        ingest: "/api/admin/ingest/hot",
        mode: "api-only"
      }, null, 2)}</pre>
    </main>
  );
}
