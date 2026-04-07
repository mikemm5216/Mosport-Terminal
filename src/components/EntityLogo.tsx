"use client";

import { useState, useEffect } from "react";
import { ENTITY_REGISTRY } from "../config/entityRegistry";

export default function EntityLogo({ entityHash, className = "" }: { entityHash: string, className?: string }) {
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgError(false);
    }, [entityHash]);

    const entity = ENTITY_REGISTRY[entityHash];

    if (!entity) return <div className={`flex items-center justify-center bg-surface-container ${className}`}>N/A</div>;
    if (imgError) {
        return (
            <div className={`w-full h-full flex items-center justify-center font-headline font-black text-[#00eefc] drop-shadow-[0_0_8px_rgba(0,238,252,0.8)] border border-[#00eefc]/20 bg-[#172031] rounded ${className}`}>
                <span className="scale-75">{entity.shortName}</span>
            </div>
        );
    }

    // 1. 解析 Internal Code (例如 02_01_RMA)
    const [sportCode, weightLevel, teamCode] = entity.internalCode.split("_");
    const shortNameLower = entity.shortName.toLowerCase();

    // 2. 智慧路徑路由 (對應執行長真實的資料夾結構)
    let folder = "epl"; // 預設足球
    if (sportCode === "01") folder = "mlb";
    if (sportCode === "03") folder = "nba";

    // 足球專屬精準導航：從 Hash ID 判斷聯賽
    if (sportCode === "02") {
        if (entityHash.includes("EPL")) folder = "epl";
        if (entityHash.includes("ESP")) folder = "esp";
        if (entityHash.includes("GER")) folder = "ger";
        if (entityHash.includes("ITA")) folder = "ita";
        if (entityHash.includes("FRA")) folder = "fra";
    }

    const imgSrc = `/logos/${folder}/${shortNameLower}.png`;

    return (
        <img
            src={imgSrc}
            alt={entity.name}
            className={`object-contain mix-blend-plus-lighter drop-shadow-[0_0_12px_rgba(255,255,255,0.2)] ${className}`}
            onError={() => {
                console.warn(`[EntityLogo] 找不到圖: ${imgSrc}`);
                setImgError(true);
            }}
        />
    );
}