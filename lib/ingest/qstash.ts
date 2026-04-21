import { Client } from "@upstash/qstash";

const qstashToken = process.env.QSTASH_TOKEN;

if (!qstashToken && process.env.NODE_ENV === "production") {
    console.warn("[Upstash QStash] QSTASH_TOKEN is missing in production. Background jobs will fail.");
}

// Initialize only if token exists to prevent noise during build
export const qstashClient = qstashToken
    ? new Client({ token: qstashToken })
    : null;

export const INGEST_WORKER_URL = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ingest/worker`;
