/**
 * VALUE ENGINE (V11.5)
 * Dual-Track Edge/EV Matrix & Signal Mapping
 */

export interface ValueMetrics {
    edge: number;
    ev: number;
    ra_ev: number;
    valueLabel: string | null;
    tags: string[];
}

export function calculateValueMetrics(
    pModel: number[],
    pMarketFair: number[],
    marketOdds: number[],
    userSignal: string,
    entropy: number,
    nClasses: number
): ValueMetrics {
    const maxIdx = pModel.indexOf(Math.max(...pModel));
    const pModelCore = pModel[maxIdx];

    // --- PATCH 1: RISK_ADJUSTED EV (RA_EV) ---
    const rawEV = (pModelCore * marketOdds[maxIdx]) - 1;
    const ra_ev = rawEV * Math.sqrt(pModelCore);

    // --- PATCH 2: CONFIDENCE-WEIGHTED EDGE (CW_EDGE) ---
    const rawEdge = pModelCore - pMarketFair[maxIdx];
    const cw_edge = rawEdge * (1 - (entropy / Math.log(nClasses)));

    const tags: string[] = [];
    let valueLabel: string | null = null;

    // --- PATCH 3: FINAL TAG MAPPING (RE-LOCK) ---
    if (ra_ev > 0) {
        if (userSignal.includes("ELITE")) {
            if (ra_ev > 0.08) {
                valueLabel = "ELITE_VALUE";
                tags.push("THE_GOLDEN_ALPHA");
            } else {
                tags.push("PURE_ANALYSIS");
            }
        } else if (userSignal.includes("STRONG")) {
            if (ra_ev > 0.04) {
                valueLabel = "STRONG_VALUE";
                tags.push("SMART_VALUE");
            }
        } else if (userSignal.includes("LEAN")) {
            tags.push("SPECULATIVE_EDGE");
        }
    }

    // STATISTICAL_TRAP (NONE but High RA_EV)
    if (userSignal === "NONE" && ra_ev > 0.05) {
        tags.push("STATISTICAL_TRAP");
    }

    // HIGH_VARIANCE_TRAP (RA_EV > 0 but Low P_model)
    if (ra_ev > 0 && pModelCore < 0.30) {
        tags.push("HIGH_VARIANCE_TRAP");
    }

    return {
        edge: Number(cw_edge.toFixed(4)),
        ev: Number(rawEV.toFixed(4)),
        ra_ev: Number(ra_ev.toFixed(4)),
        valueLabel,
        tags
    };
}
