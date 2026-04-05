"use client"

import { useState } from 'react';

interface LogoFallbackProps {
    url?: string;
    name: string;
    shortName?: string;
    size?: number;
    className?: string;
    sport?: string;
}

export default function LogoFallback({ url, name, shortName, size = 16, className = "" }: LogoFallbackProps) {
    const [failedLocal, setFailedLocal] = useState(false);
    const [failedCdn, setFailedCdn] = useState(false);

    if (!url) return null;
    const targetSrc = `${url}?v=patch17.30`;

    if (failedLocal) {
        return (
            <div
                className={`flex items-center justify-center bg-transparent border border-slate-700/50 text-slate-400 font-black rounded ${className}`}
                style={{ width: size, height: size, fontSize: size ? size * 0.4 : 12 }}
            >
                {shortName || name?.substring(0, 3)?.toUpperCase() || '?'}
            </div>
        );
    }

    return (
        <img
            src={targetSrc}
            alt={name}
            className={`object-contain ${className}`}
            style={{ width: size, height: size }}
            onError={() => {
                if (!failedLocal) setFailedLocal(true);
                else setFailedCdn(true);
            }}
        />
    );
}
