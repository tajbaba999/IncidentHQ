-- Repair drift introduced by `prisma db push` outside migration history:
-- the Severity/PostmortemStatus enums and several Postmortem/Monitor columns
-- exist in deployed databases but were never captured in a migration, so
-- `prisma migrate deploy` failed on any fresh database.
-- Every statement is idempotent because existing databases already have these
-- objects while fresh databases have none of them.
-- NOT NULL columns without defaults are safe here: on fresh databases the
-- tables are still empty at this point, and on existing databases the columns
-- already exist so the ADD is skipped.

DO $$ BEGIN
    CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "PostmortemStatus" AS ENUM ('DRAFT', 'PUBLISHED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Postmortem"
    ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL,
    ADD COLUMN IF NOT EXISTS "severity" "Severity" NOT NULL DEFAULT 'MINOR',
    ADD COLUMN IF NOT EXISTS "status" "PostmortemStatus" NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS "summary" TEXT,
    ADD COLUMN IF NOT EXISTS "resolution" TEXT,
    ADD COLUMN IF NOT EXISTS "incidentStart" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "incidentEnd" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;

CREATE INDEX IF NOT EXISTS "Postmortem_userId_idx" ON "Postmortem"("userId");

ALTER TABLE "Monitor"
    ADD COLUMN IF NOT EXISTS "alertEmail" TEXT,
    ADD COLUMN IF NOT EXISTS "description" TEXT;
