"use client";

import { useEffect, useState } from "react";

import { ENTITY_REGISTRY } from "../config/entityRegistry";
import { getTeamLogo, TEAM_LOGO_FALLBACK } from "../config/teamLogos";

function resolveLeague(entityHash: string, internalCode: string): string {
    if (entityHash.includes("MLB")) return "MLB";
    if (entityHash.includes("NBA")) return "NBA";
    if (entityHash.includes("EPL")) return "EPL";
    if (entityHash.includes("UCL")) return "UCL";
    if (entityHash.includes("NHL")) return "NHL";

    const sportCode = internalCode.split("_")[0];
    if (sportCode === "01") return "MLB";
    if (sportCode === "02") return "EPL";
    if (sportCode === "03") return "NBA";

    return "UNKNOWN";
}

export default function EntityLogo({ entityHash, className = "" }: { entityHash: string; className?: string }) {
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgError(false);
    }, [entityHash]);

    const entity = ENTITY_REGISTRY[entityHash];

    if (!entity) {
        return <div className={`flex items-center justify-center bg-[#020617] text-[#00eefc] border border-[#00eefc]/30 rounded ${className}`}>N/A</div>;
    }

    if (imgError) {
        return (
            <div className={`flex items-center justify-center font-black text-[#00eefc] drop-shadow-[0_0_8px_rgba(0,238,252,0.8)] border border-[#00eefc]/20 bg-[#0f172a] rounded overflow-hidden ${className}`}>
                <span className="text-[10px] md:text-sm font-black px-1">{entity.shortName}</span>
            </div>
        );
    }

    const imgSrc = getTeamLogo(resolveLeague(entityHash, entity.internalCode), entity.shortName);

    if (imgSrc === TEAM_LOGO_FALLBACK) {
        return (
            <div className={`flex items-center justify-center font-black text-[#00eefc] drop-shadow-[0_0_8px_rgba(0,238,252,0.8)] border border-[#00eefc]/20 bg-[#0f172a] rounded overflow-hidden ${className}`}>
                <span className="text-[10px] md:text-sm font-black px-1">{entity.shortName}</span>
            </div>
        );
    }

    return (
        <img
            src={imgSrc}
            alt={entity.shortName}
            className={`object-contain drop-shadow-[0_0_3px_rgba(255,255,255,0.6)] ${className}`}
            onError={() => setImgError(true)}
        />
    );
}
