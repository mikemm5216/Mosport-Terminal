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

    // 強制把那些你知道背景是白色的毒瘤圖片轉成字母盾牌，避免醜化 UI
    const forceFallback = ['LAL', 'CHA', 'SAS', 'MIN', 'ORL', 'UTA'].includes(shortName?.toUpperCase() || '');

    // 修正：拔掉致命的 mix-blend-multiply，確保深色模式圖片正常顯示
    if (url && !hasError && !forceFallback) {
        return (
            <img
                src={url}
                alt={name}
                className={`object-contain ${className}`}
                style={{ width: size, height: size }}
                onError={() => setHasError(true)}
            />
        );
    }

    // 完美字母盾牌 Fallback
    return (
        <div
            className={`flex items-center justify-center bg-slate-900 text-slate-300 font-black rounded border border-slate-700 shadow-inner ${className}`}
            style={{ width: size, height: size, fontSize: size ? size * 0.4 : 12 }}
        >
            {shortName || name?.substring(0, 3)?.toUpperCase() || '?'}
        </div>
    );
}
