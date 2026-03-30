"use client"

interface LogoFallbackProps {
    url?: string;
    name: string;
    shortName?: string;
    size?: number;
    className?: string;
    sport?: string;
}

export default function LogoFallback({ url, name, size = 16, className = "" }: LogoFallbackProps) {
    return (
        <img
            src={url || ""}
            alt={name}
            className={`object-contain ${className}`}
            style={{ width: size, height: size }}
        />
    );
}
