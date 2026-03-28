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
    const [error, setError] = useState(false);

    const getInitials = (n: string) => {
        if (!n) return "??";
        const words = n.split(" ");
        if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
        return n.substring(0, 2).toUpperCase();
    };

    const getColor = () => {
        if (sport === 'football') return '#EF4444'; // Red for Footy
        if (sport === 'basketball') return '#F59E0B'; // Amber for B-ball
        if (sport === 'baseball') return '#3B82F6'; // Blue for Baseball
        return '#64748B'; // Slate default
    };

    if (url && !error) {
        return (
            <img
                src={url}
                alt={name}
                className={`object-contain ${className}`}
                style={{ width: size, height: size }}
                onError={() => setError(true)}
            />
        );
    }

    const initials = shortName || getInitials(name);
    const color = getColor();

    return (
        <div
            className={`flex items-center justify-center rounded-lg font-black text-white italic overflow-hidden border border-white/10 ${className}`}
            style={{ width: size, height: size, backgroundColor: `${color}20`, color: color, fontSize: size * 0.4 }}
        >
            {initials.substring(0, 3)}
        </div>
    );
}
