-- One-off: normalize rows that existed before the performance schema change.
-- The application keeps these columns normalized on every write from now on.
-- npm run db:backfill
UPDATE candidate SET email = lower(email) WHERE email <> lower(email);

UPDATE candidate
SET skills_search = ARRAY(SELECT lower(s) FROM unnest(skills) AS s)
WHERE skills_search IS DISTINCT FROM ARRAY(SELECT lower(s) FROM unnest(skills) AS s);
