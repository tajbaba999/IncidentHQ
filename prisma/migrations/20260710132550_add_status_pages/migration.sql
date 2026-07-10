-- CreateEnum
CREATE TYPE "ComponentStatus" AS ENUM ('OPERATIONAL', 'DEGRADED', 'DOWN', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED');

-- CreateTable
CREATE TABLE "StatusPage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "brandColor" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatusPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentGroup" (
    "id" TEXT NOT NULL,
    "statusPageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComponentGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusComponent" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "manualStatus" "ComponentStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatusComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "statusPageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" "Severity",
    "status" "IncidentStatus" NOT NULL DEFAULT 'INVESTIGATING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentUpdate" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentComponent" (
    "incidentId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,

    CONSTRAINT "IncidentComponent_pkey" PRIMARY KEY ("incidentId","componentId")
);

-- CreateTable
CREATE TABLE "StatusSubscriber" (
    "id" TEXT NOT NULL,
    "statusPageId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StatusPage_projectId_key" ON "StatusPage"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "StatusPage_slug_key" ON "StatusPage"("slug");

-- CreateIndex
CREATE INDEX "ComponentGroup_statusPageId_idx" ON "ComponentGroup"("statusPageId");

-- CreateIndex
CREATE UNIQUE INDEX "StatusComponent_monitorId_key" ON "StatusComponent"("monitorId");

-- CreateIndex
CREATE INDEX "StatusComponent_groupId_idx" ON "StatusComponent"("groupId");

-- CreateIndex
CREATE INDEX "Incident_statusPageId_idx" ON "Incident"("statusPageId");

-- CreateIndex
CREATE INDEX "Incident_statusPageId_status_idx" ON "Incident"("statusPageId", "status");

-- CreateIndex
CREATE INDEX "IncidentUpdate_incidentId_idx" ON "IncidentUpdate"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentComponent_componentId_idx" ON "IncidentComponent"("componentId");

-- CreateIndex
CREATE UNIQUE INDEX "StatusSubscriber_token_key" ON "StatusSubscriber"("token");

-- CreateIndex
CREATE INDEX "StatusSubscriber_statusPageId_idx" ON "StatusSubscriber"("statusPageId");

-- CreateIndex
CREATE UNIQUE INDEX "StatusSubscriber_statusPageId_email_key" ON "StatusSubscriber"("statusPageId", "email");

-- CreateIndex
CREATE INDEX "MonitorRun_monitorId_createdAt_idx" ON "MonitorRun"("monitorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_userId_type_key" ON "Integration"("userId", "type");

-- AddForeignKey
ALTER TABLE "StatusPage" ADD CONSTRAINT "StatusPage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentGroup" ADD CONSTRAINT "ComponentGroup_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "StatusPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusComponent" ADD CONSTRAINT "StatusComponent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ComponentGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusComponent" ADD CONSTRAINT "StatusComponent_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "StatusPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentUpdate" ADD CONSTRAINT "IncidentUpdate_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentComponent" ADD CONSTRAINT "IncidentComponent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentComponent" ADD CONSTRAINT "IncidentComponent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "StatusComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusSubscriber" ADD CONSTRAINT "StatusSubscriber_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "StatusPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
