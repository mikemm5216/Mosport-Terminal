"use client";

import { TEAM_META } from "../config/teamMeta";

export default function TeamLogo({ code, className }: { code: string, className?: string }) {
  // 1. 轉大寫以精準對齊字典檔 (例如 NBA_ATL)
  const exactCode = code?.toUpperCase();

  // 2. 查字典
  const meta = TEAM_META[exactCode];

  // 3. 取得圖片網址 (加上 v=3 強制更新快取)
  const targetSrc = meta ? `${meta.logo}?v=3` : "";

  return (
    <img
      src={targetSrc}
      alt={exactCode}
      className={className || "w-8 h-8 object-contain"}
      loading="lazy"
      onError={(e) => {
        // 如果找不到圖片，直接隱藏，絕不顯示破圖圖示
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}