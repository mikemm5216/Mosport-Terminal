"use client";

import { TEAM_META } from "@/config/teamMeta";

export default function TeamLogo({ code, className }: { code: string, className?: string }) {
  // ... 下面的代碼完全不用動 ...
  import { TEAM_META } from "../config/teamMeta";

  export default function TeamLogo({
    code,
    className,
  }: {
    code: string;
    className?: string;
  }) {
    // 1. 不脫殼了！直接把 AI 傳來的代碼轉大寫 (例如確保 nba_atl 變成 NBA_ATL)
    const exactCode = code?.toUpperCase();

    // 2. 精準查字典 (這樣 NBA_ATL 絕對不會撞到 MLB_ATL)
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
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }