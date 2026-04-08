"use client";

import { useState, useEffect } from "react";
import { ENTITY_REGISTRY } from "../config/entityRegistry";

export default function EntityLogo({ entityHash, className = "" }: { entityHash: string, className?: string }) {
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgError(false);
    }, [entityHash]);

    const entity = ENTITY_REGISTRY[entityHash];

    // 1. 字典裡沒有這隊：顯示低調方塊
    if (!entity) return <div className={`flex items-center justify-center bg-[#020617] text-[#00eefc] border border-[#00eefc]/30 rounded ${className}`}>N/A</div>;

    // 2. 圖片讀取失敗 (404)：物理移除 <img>，啟動賽博龐克發光文字裝甲
    if (imgError) {
        return (
            <div className={`flex items-center justify-center font-black text-[#00eefc] drop-shadow-[0_0_8px_rgba(0,238,252,0.8)] border border-[#00eefc]/20 bg-[#0f172a] rounded overflow-hidden ${className}`}>
                <span className="truncate px-1 scale-75 md:scale-100">{entity.shortName}</span>
            </div>
        );
    }

    // 3. 全球賽事智慧路由 (Global Routing)
    const sportCode = entity.internalCode.split("_")[0];
    const shortNameLower = entity.shortName.toLowerCase();
    let folder = "fallback";

    if (sportCode === "01") {
        if (entityHash.includes("MLB")) folder = "mlb";
        else if (entityHash.includes("NPB")) folder = "npb";
        else if (entityHash.includes("CPB")) folder = "cpbl";
        else folder = "mlb";
    } else if (sportCode === "02") {
        if (entityHash.includes("EPL")) folder = "epl";
        else if (entityHash.includes("ESP")) folder = "esp";
        else if (entityHash.includes("ITA")) folder = "ita";
        else if (entityHash.includes("GER")) folder = "ger";
        else if (entityHash.includes("FRA")) folder = "fra";
        else folder = "epl";
    } else if (sportCode === "03") {
        if (entityHash.includes("NBA")) folder = "nba";
        else if (entityHash.includes("TPB")) folder = "tpbl";
        else if (entityHash.includes("BLG")) folder = "bleague";
        else folder = "nba";
    }

    const imgSrc = `/logos/${folder}/${shortNameLower}.png`;

    // 4. 正常渲染
    return (
        <img
            src={imgSrc}
            alt={entity.shortName}
            className={`object-contain mix-blend-plus-lighter ${className}`}
            onError={() => setImgError(true)}
        />
    );
}