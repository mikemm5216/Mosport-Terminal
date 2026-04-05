import { TEAM_LOGOS } from "@/config/teamLogos";

/**
 * 🚫 DO NOT USE <img src="..."> for team logos
 * ✅ ALWAYS use <TeamLogo code={...} />
 */
export default function TeamLogo({ code, className }: { code: string, className?: string }) {
  // 1. Normalize code to uppercase to prevent case-sensitive mismatches
  // Handles formats like "MLB_NYY", "EPL_AVL", or raw "NYY"
  const normalizedCode = code?.toUpperCase().replace(/^(MLB|EPL|NBA|SOCCER)_/, '').replace(/_/, ''); 
  
  // 2. Map to source or fallback
  const basePath = TEAM_LOGOS[normalizedCode] || "/logos/fallback.png";
  
  // 3. CACHE BUSTER: Force Vercel CDN to fetch the newest file (Patch 17.40)
  const srcWithCacheBust = `${basePath}?v=17.40`;

  // 4. Debug Mode
  // console.log("[Logo System]", { input: code, mappedTo: srcWithCacheBust });

  return (
    <img
      src={srcWithCacheBust}
      alt={normalizedCode}
      className={className}
      loading="lazy"
      onError={(e) => {
        // 5. Prevent infinite fallback loop if fallback.png is also missing
        const target = e.currentTarget;
        if (!target.src.includes("fallback.png")) {
          target.src = "/logos/fallback.png?v=17.40";
        }
      }}
    />
  );
}
