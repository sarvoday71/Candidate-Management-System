-- Run once per database BEFORE `npm run db:push` (the trigram indexes need this extension).
-- npm run db:extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
