import { NextResponse } from "next/server";

/**
 * API Firewall Middleware
 * Runtime response interception to block sensitive field leakage.
 */
export function apiFirewall(response: any) {
    const data = JSON.stringify(response);
    const sensitive = ["odds", "edge", "impliedProb", "implied_prob"];

    for (const pattern of sensitive) {
        if (data.includes(`"${pattern}":`)) {
            console.error(`[FIREWALL] CRITICAL LEAK DETECTED: ${pattern}`);
            throw new Error("[SECURITY] Data Leakage Blocked by Spartan Firewall.");
        }
    }

    return response;
}
