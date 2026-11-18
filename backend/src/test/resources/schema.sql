-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('NEW', 'SCREENING', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED');

-- CreateTable
CREATE TABLE "candidate" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills_search" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experience_years" INTEGER NOT NULL DEFAULT 0,
    "current_company" TEXT,
    "current_location" TEXT,
    "status" "CandidateStatus" NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidate_email_key" ON "candidate"("email");

-- CreateIndex
CREATE INDEX "candidate_first_name_trgm_idx" ON "candidate" USING GIN ("first_name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "candidate_last_name_trgm_idx" ON "candidate" USING GIN ("last_name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "candidate_email_trgm_idx" ON "candidate" USING GIN ("email" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "candidate_location_trgm_idx" ON "candidate" USING GIN ("current_location" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "candidate_skills_search_gin_idx" ON "candidate" USING GIN ("skills_search");

-- CreateIndex
CREATE INDEX "candidate_status_experience_idx" ON "candidate"("status", "experience_years");

-- CreateIndex
CREATE INDEX "candidate_experience_idx" ON "candidate"("experience_years");
