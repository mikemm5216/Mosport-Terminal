"use client";

import { ENTITY_REGISTRY } from "../config/entityRegistry";

interface EntityLogoProps {
    entityHash: string;
    className?: string;
}

function getLogoPath(entityHash: string, internalCode: string, shortName: string): string {
    const sport = internalCode.split('_')[0];
    const team = shortName.toLowerCase();

    if (sport === "01") return `/logos/mlb/${team}.png`;
    if (sport === "03") return `/logos/nba/${team}.png`;
    if (sport === "02") {
        // Soccer: Extract league from Hash (e.g., Mpt_EPL01 -> epl)
        const leagueCode = entityHash.split('_')[1]?.substring(0, 3).toLowerCase() || 'epl';
        return `/logos/${leagueCode}/${team}.png`;
    }
    return `/logos/generic/${team}.png`;
}

export default function EntityLogo({ entityHash, className }: EntityLogoProps) {
    const entity = ENTITY_REGISTRY[entityHash];

    if (!entity) {
        return (
            <div className={`${className} flex items-center justify-center bg-slate-900 border border-slate-800 rounded text-[10px] font-black text-slate-500 uppercase tracking-widest`}>
                [ N/A ]
            </div>
        );
    }

    const dynamicImgSrc = getLogoPath(entityHash, entity.internalCode, entity.shortName);

    return (
        <div className={`relative ${className}`}>
            <img
                src={dynamicImgSrc}
                alt={entity.shortName}
                className="w-full h-full object-contain mix-blend-plus-lighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                loading="lazy"
                onError={(e) => {
                    // If image fails, replace with text fallback
                    const target = e.currentTarget;
                    const parent = target.parentElement;
                    if (parent) {
                        target.style.display = 'none';
                        const fallback = document.createElement('div');
                        fallback.className = 'w-full h-full flex items-center justify-center bg-slate-900 border border-slate-800 rounded text-xs font-black text-white uppercase tracking-widest italic';
                        fallback.innerText = entity.shortName;
                        parent.appendChild(fallback);
                    }
                }}
            />
        </div>
    );
}
