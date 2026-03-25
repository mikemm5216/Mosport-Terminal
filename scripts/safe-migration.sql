BEGIN;

-- =========================
-- FORCE BACKUP (SAFE)
-- =========================
DROP TABLE IF EXISTS "ExternalMatchMap_backup";
CREATE TABLE "ExternalMatchMap_backup" AS
SELECT * FROM "ExternalMatchMap";

DROP TABLE IF EXISTS "IngestionState_backup";
CREATE TABLE "IngestionState_backup" AS
SELECT * FROM "IngestionState";

-- =========================
-- COUNT BEFORE
-- =========================
SELECT COUNT(*) AS before_external FROM "ExternalMatchMap";
SELECT COUNT(*) AS before_ingestion FROM "IngestionState";

-- =========================
-- VERIFY DUPLICATES
-- =========================
SELECT provider, "extId", COUNT(*)
FROM "ExternalMatchMap"
WHERE "extId" IS NOT NULL
GROUP BY provider, "extId"
HAVING COUNT(*) > 1;

SELECT provider, sport, league, COUNT(*)
FROM "IngestionState"
GROUP BY provider, sport, league
HAVING COUNT(*) > 1;

-- =========================
-- CLEAN DUPLICATES (Keep earliest ID)
-- =========================
DELETE FROM "ExternalMatchMap"
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY provider, "extId"
                 ORDER BY id ASC
               ) as row_num
        FROM "ExternalMatchMap"
        WHERE "extId" IS NOT NULL
    ) t
    WHERE t.row_num > 1
);

DELETE FROM "IngestionState"
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY provider, sport, league
                 ORDER BY id ASC
               ) as row_num
        FROM "IngestionState"
    ) t
    WHERE t.row_num > 1
);

-- =========================
-- COUNT AFTER
-- =========================
SELECT COUNT(*) AS after_external FROM "ExternalMatchMap";
SELECT COUNT(*) AS after_ingestion FROM "IngestionState";

COMMIT;
