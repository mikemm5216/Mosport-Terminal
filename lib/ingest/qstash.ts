import { Client } from "@upstash/qstash";

if (!process.env.QSTASH_TOKEN) {
    console.warn("QSTASH_TOKEN is missing. Background jobs will fail.");
}

export const qstashClient = new Client({
    token: process.env.QSTASH_TOKEN || "",
});

export const INGEST_WORKER_URL = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ingest/worker`;
