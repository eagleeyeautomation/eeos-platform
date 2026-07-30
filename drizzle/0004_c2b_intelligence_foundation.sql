CREATE TABLE `c2b_connectors` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organizationId` int NOT NULL,
  `connectorKey` varchar(64) NOT NULL,
  `displayName` varchar(128) NOT NULL,
  `connectorType` enum('search','crm','csv','website','directory','referral','government') NOT NULL,
  `enabled` boolean NOT NULL DEFAULT false,
  `approvalStatus` enum('draft','approved','suspended') NOT NULL DEFAULT 'draft',
  `configuration` json,
  `lastRunAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `c2b_connectors_id` PRIMARY KEY(`id`),
  CONSTRAINT `c2b_connector_org_key_unique` UNIQUE(`organizationId`,`connectorKey`)
);
--> statement-breakpoint
CREATE INDEX `idx_c2b_connector_org` ON `c2b_connectors` (`organizationId`);
--> statement-breakpoint
CREATE TABLE `c2b_opportunities` (
  `id` int AUTO_INCREMENT NOT NULL,
  `opportunityId` varchar(64) NOT NULL,
  `organizationId` int NOT NULL,
  `tenantId` varchar(128) NOT NULL,
  `type` varchar(64) NOT NULL,
  `name` varchar(256) NOT NULL,
  `businessName` varchar(256),
  `city` varchar(128),
  `state` varchar(64),
  `zip` varchar(20),
  `source` varchar(128) NOT NULL,
  `sourceUrl` text,
  `discoveredAt` timestamp NOT NULL,
  `summary` text NOT NULL,
  `reasonRelevant` text NOT NULL,
  `scoring` json NOT NULL,
  `recommendedNextAction` text NOT NULL,
  `status` enum('new','qualified','high_priority','pending_review','approved','rejected','research','assigned','pending_ghl','converted') NOT NULL DEFAULT 'new',
  `assignedUserId` int,
  `duplicateStatus` enum('unchecked','unique','possible','duplicate') NOT NULL DEFAULT 'unchecked',
  `consentStatus` enum('unknown','not_required','confirmed','declined') NOT NULL DEFAULT 'unknown',
  `ghlStatus` enum('not_requested','pending_approval','approved','queued','converted','failed') NOT NULL DEFAULT 'not_requested',
  `estimatedPipelineValue` int NOT NULL DEFAULT 0,
  `referralPartner` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `c2b_opportunities_id` PRIMARY KEY(`id`),
  CONSTRAINT `c2b_opportunities_opportunityId_unique` UNIQUE(`opportunityId`)
);
--> statement-breakpoint
CREATE INDEX `idx_c2b_opportunity_org_status` ON `c2b_opportunities` (`organizationId`,`status`);
--> statement-breakpoint
CREATE INDEX `idx_c2b_opportunity_tenant` ON `c2b_opportunities` (`tenantId`);
--> statement-breakpoint
CREATE INDEX `idx_c2b_opportunity_source` ON `c2b_opportunities` (`organizationId`,`source`);
--> statement-breakpoint
CREATE INDEX `idx_c2b_opportunity_state` ON `c2b_opportunities` (`organizationId`,`state`);
--> statement-breakpoint
CREATE TABLE `c2b_opportunity_audit` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `opportunityId` int NOT NULL,
  `organizationId` int NOT NULL,
  `actorUserId` int,
  `action` varchar(64) NOT NULL,
  `previousStatus` varchar(32),
  `nextStatus` varchar(32),
  `details` json,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `c2b_opportunity_audit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_c2b_audit_opportunity` ON `c2b_opportunity_audit` (`opportunityId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `idx_c2b_audit_org` ON `c2b_opportunity_audit` (`organizationId`,`createdAt`);
