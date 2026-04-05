"use client";

import { ENTITY_REGISTRY } from "../config/entityRegistry";

interface EntityLogoProps {
    entityHash: string;
    className?: string;
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

    return (
        <div className={`relative ${className}`}>
            <img
                src={`${entity.path}?v=SECURE_V1`}
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
