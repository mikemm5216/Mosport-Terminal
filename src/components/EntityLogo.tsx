"use client";

import { useState } from "react";
import { ENTITY_REGISTRY } from "../config/entityRegistry";

export default function EntityLogo({ entityHash, className = "" }: { entityHash: string, className?: string }) {
    // 記錄圖片是否載入失敗
    const [imgError, setImgError] = useState(false);

    // 1. 查字典
    const entity = ENTITY_REGISTRY[entityHash];

    // 防呆：如果傳進來的 Hash 字典裡找不到
    if (!entity) {
        return (
            <div className={`flex items-center justify-center font-headline font-bold text-outline border border-outline/20 bg-surface-container ${className}`}>
                N/A
            </div>
        );
    }

    // 2. 智慧路徑解析 (配合美編的實體資料夾)
    const sportCode = entity.internalCode.split("_")[0];
    const shortNameLower = entity.shortName.toLowerCase();

    let folder = "epl"; // 預設足球
    if (sportCode === "01") folder = "mlb";
    if (sportCode === "03") folder = "nba";

    // 最終拼出來的路徑：例如 /logos/mlb/nyy.png
    const imgSrc = `/logos/${folder}/${shortNameLower}.png`;

    // 3. 終極防禦：如果圖片還沒上傳，優雅降級顯示發光文字
    if (imgError) {
        return (
            <div className={`flex items-center justify-center font-headline font-black text-[#00eefc] drop-shadow-[0_0_8px_rgba(0,238,252,0.5)] border border-[#00eefc]/20 bg-[#172031] ${className}`}>
                {entity.shortName}
            </div>
        );
    }

    // 4. 正常渲染圖片 (帶發光與去背融合效果)
    return (
        <img
            src={imgSrc}
            alt={entity.name}
            className={`mix-blend-plus-lighter drop-shadow-[0_0_10px_rgba(255,255,255,0.15)] object-contain ${className}`}
            onError={() => setImgError(true)} // 圖片一破，立刻觸發上面的防禦機制
        />
    );
}