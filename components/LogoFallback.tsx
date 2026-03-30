"use client"

import { useState } from 'react';

interface LogoFallbackProps {
    url?: string;
    name: string;
    shortName: string;
    size?: number;
    className?: string;
    sport?: string;
}

export default function LogoFallback({ url, name, shortName, size = 16, className = "", sport }: LogoFallbackProps) {
    const [hasError, setHasError] = useState(false);

    // Patch 17.1: Strict rule to fallback to the Letter Shield if asset is known to be non-transparent
    const forceFallback = ['LAL', 'CHA', 'SAS', 'MIN', 'ORL', 'UTA'].includes(shortName?.toUpperCase() || '');

    if (url && !hasError && !forceFallback) {
        return (
            <img
                src={url}
                alt={name}
                className={`object-contain mix-blend-multiply ${className}`}
                style={{ width: size, height: size }}
                onError={() => setHasError(true)}
            />
        );
    }

    return (
        <div
            className={`flex items-center justify-center bg-slate-800 text-slate-300 font-bold rounded-md border border-slate-700 ${className}`}
            style={{ width: size, height: size, fontSize: size ? size * 0.4 : 12 }}
        >
            {shortName || name?.substring(0, 3)?.toUpperCase() || '?'}
        </div>
    );
}
