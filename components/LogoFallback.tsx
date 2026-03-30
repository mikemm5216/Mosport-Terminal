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

export default function LogoFallback({ url, name, size = 16, className = "" }: LogoFallbackProps) {
    const [failedLocal, setFailedLocal] = useState(false);

    if (!url) return null;
    const [localAsset, cdnBackup] = url.split("||");
    const targetSrc = failedLocal && cdnBackup ? cdnBackup : localAsset;

    return (
        <img
            src={targetSrc}
            alt={name}
            className={`object-contain ${className}`}
            style={{ width: size, height: size }}
            onError={() => {
                if (!failedLocal) setFailedLocal(true);
            }}
        />
    );
}
