-- 1. Identify and Clean ExternalMatchMap duplicates (Keep earliest)
DELETE FROM "ExternalMatchMap"
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY provider, "extId" ORDER BY created_at ASC) as row_num
        FROM "ExternalMatchMap"
    ) t
    WHERE t.row_num > 1
);

-- 2. Identify and Clean IngestionState duplicates (Keep earliest)
DELETE FROM "IngestionState"
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY provider, sport, league ORDER BY "lastRunAt" ASC) as row_num
        FROM "IngestionState"
    ) t
    WHERE t.row_num > 1
);
