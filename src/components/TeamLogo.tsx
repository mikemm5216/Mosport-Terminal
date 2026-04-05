import { TEAM_META } from "../config/teamMeta";

const FALLBACK_VERSION = 1;

export default function TeamLogo({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  if (!code) {
    return <img src={`/logos/fallback.png?v=${FALLBACK_VERSION}`} />;
  }

  // 1️⃣ Normalize (Strict upper-case, no prefix removal)
  const normalizedCode = code.toUpperCase();

  // 2️⃣ Lookup
  const meta = TEAM_META[normalizedCode];

  // 3️⃣ Construct URL (with version)
  const targetSrc = meta
    ? `${meta.logo}?v=${meta.version}`
    : `/logos/fallback.png?v=${FALLBACK_VERSION}`;

  console.log("[LOGO CHECK]", code, targetSrc);

  return (
    <img
      src={targetSrc}
      alt={meta ? meta.name : normalizedCode}
      className={className || "w-8 h-8 object-contain"}
      loading="lazy"
      onError={(e) => {
        if (!e.currentTarget.src.includes("fallback.png")) {
          e.currentTarget.src = `/logos/fallback.png?v=${FALLBACK_VERSION}`;
        }
      }}
    />
  );
}