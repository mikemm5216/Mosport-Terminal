"use client";

import { useState, useEffect } from "react";
import { ENTITY_REGISTRY } from "../config/entityRegistry";

export default function EntityLogo({ entityHash, className = "" }: { entityHash: string, className?: string }) {
    const [imgError, setImgError] = useState(false);

    // 1. 查字典
    const entity = ENTITY_REGISTRY[entityHash];

    // 每次 Hash 改變時，重設錯誤狀態（避免切換頁面時錯誤狀態殘留）
    useEffect(() => {
        setImgError(false);
    }, [entityHash]);

    if (!entity) {
        return (
            <div className={`w-full h-full min-h-[40px] min-w-[40px] flex items-center justify-center rounded-md font-black text-[#00eefc] drop-shadow-[0_0_8px_rgba(0,238,252,0.8)] border border-[#00eefc]/20 bg-[#172031] overflow-hidden ${className}`}>
                ?
            </div>
        );
    }

    // 2. 解析路徑
    const sportCode = entity.internalCode.split("_")[0];
    const shortNameLower = entity.shortName.toLowerCase();

    let folder = "epl";
    if (sportCode === "01") folder = "mlb";
    if (sportCode === "03") folder = "nba";

    // 足球專屬精準導航：從 Hash ID 判斷聯賽自定義資料夾
    if (sportCode === "02") {
        if (entityHash.includes("EPL")) folder = "epl";
        if (entityHash.includes("ESP")) folder = "esp";
        if (entityHash.includes("GER")) folder = "ger";
        if (entityHash.includes("ITA")) folder = "ita";
        if (entityHash.includes("FRA")) folder = "fra";
    }

    const imgSrc = `/logos/${folder}/${shortNameLower}.png`;

    // 3. 【核心修正】如果圖片出錯，直接回傳發光文字，完全不渲染 <img> 標籤
    if (imgError) {
        return (
            <div className={`w-full h-full min-h-[40px] min-w-[40px] flex items-center justify-center rounded-md font-black text-[#00eefc] drop-shadow-[0_0_10px_rgba(0,238,252,0.8)] border border-[#00eefc]/20 bg-[#172031] overflow-hidden ${className}`}>
                <span className="scale-75 md:scale-100">{entity.shortName}</span>
            </div>
        );
    }

    // 4. 正常渲染圖片：加上 style={{ color: 'transparent' }} 作為雙重保險
    return (
        <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
            <img
                src={imgSrc}
                alt={entity.name}
                className="max-w-full max-h-full object-contain mix-blend-plus-lighter drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]"
                style={{ color: 'transparent' }}
                onError={() => {
                    console.warn(`[Logo] Failed to load: ${imgSrc}`);
                    setImgError(true);
                }}
            />
        </div>
    );
}