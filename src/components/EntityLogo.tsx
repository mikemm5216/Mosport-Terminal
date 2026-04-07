"use client";

import { useState, useEffect } from "react";
import { ENTITY_REGISTRY } from "../config/entityRegistry";

export default function EntityLogo({ entityHash, className = "" }: { entityHash: string, className?: string }) {
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgError(false);
    }, [entityHash]);

    const entity = ENTITY_REGISTRY[entityHash];

    // 字典找不到：顯示低調的 N/A
    if (!entity) {
        return (
            <div className={`w-full h-full min-h-[40px] min-w-[40px] flex items-center justify-center font-headline font-bold text-outline border border-outline/20 bg-surface-container rounded ${className}`}>
                N/A
            </div>
        );
    }

    // 圖片載入失敗：物理移除 <img>，替換成賽博龐克發光文字
    if (imgError) {
        return (
            <div className={`w-full h-full min-h-[40px] min-w-[40px] flex items-center justify-center font-headline font-black text-[#00eefc] drop-shadow-[0_0_8px_rgba(0,238,252,0.8)] border border-[#00eefc]/20 bg-[#172031] rounded overflow-hidden ${className}`}>
                <span className="truncate px-1">{entity.shortName}</span>
            </div>
        );
    }

    // 解析實體圖片路徑
    const sportCode = entity.internalCode.split("_")[0];
    const shortNameLower = entity.shortName.toLowerCase();

    let folder = "epl";
    if (sportCode === "01") folder = "mlb";
    if (sportCode === "03") folder = "nba";

    const imgSrc = `/logos/${folder}/${shortNameLower}.png`;

    // 正常渲染
    return (
        <img
            src={imgSrc}
            alt={entity.name}
            className={`object-contain mix-blend-plus-lighter drop-shadow-[0_0_12px_rgba(255,255,255,0.2)] ${className}`}
            onError={() => setImgError(true)}
        />
    );
}