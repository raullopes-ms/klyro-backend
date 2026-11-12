-- The legacy refresh tables may already have been removed manually.
DROP TABLE IF EXISTS "RefreshToken";
DROP TABLE IF EXISTS "RefreshSession";

ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordHash";
