CREATE TABLE `intelligence_learning_events` (
  `id` bigint AUTO_INCREMENT PRIMARY KEY,
  `organizationId` int NOT NULL,
  `tenantId` varchar(128) NOT NULL,
  `recommendationId` int,
  `sourceType` enum('operational','user_action','executive_decision','opportunity_outcome','connector','crm','financial','marketing','kpi','recommendation_history','business_rule') NOT NULL,
  `sourceReference` varchar(256) NOT NULL,
  `approved` boolean NOT NULL DEFAULT false,
  `eventType` varchar(64) NOT NULL,
  `normalizedEvidence` json NOT NULL,
  `modelArea` enum('scoring','prioritization','recommendations','forecasting','duplicates','workflow','assignment','risk','anomaly','confidence') NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_learning_event_org_tenant` (`organizationId`,`tenantId`,`createdAt`),
  KEY `idx_learning_event_recommendation` (`recommendationId`)
);

CREATE TABLE `intelligence_outcomes` (
  `id` bigint AUTO_INCREMENT PRIMARY KEY,
  `organizationId` int NOT NULL,
  `tenantId` varchar(128) NOT NULL,
  `recommendationId` int NOT NULL,
  `decision` enum('accepted','rejected','deferred','already_done') NOT NULL,
  `outcomeType` enum('positive','negative','neutral','unknown') NOT NULL,
  `revenueImpact` int,
  `operationalImpact` text,
  `timeSavedMinutes` int,
  `conversionImprovement` float,
  `evidence` json NOT NULL,
  `measuredAt` timestamp NOT NULL,
  `recordedByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_intelligence_outcome_org_tenant` (`organizationId`,`tenantId`,`measuredAt`),
  KEY `idx_intelligence_outcome_recommendation` (`recommendationId`)
);

CREATE TABLE `intelligence_learning_profiles` (
  `id` bigint AUTO_INCREMENT PRIMARY KEY,
  `organizationId` int NOT NULL,
  `tenantId` varchar(128) NOT NULL,
  `modelArea` enum('scoring','prioritization','recommendations','forecasting','duplicates','workflow','assignment','risk','anomaly','confidence') NOT NULL,
  `evidenceCount` int NOT NULL DEFAULT 0,
  `verifiedOutcomeCount` int NOT NULL DEFAULT 0,
  `successfulOutcomeCount` int NOT NULL DEFAULT 0,
  `accuracyRate` float NOT NULL DEFAULT 0,
  `adjustment` float NOT NULL DEFAULT 0,
  `explanation` text NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `learning_profile_org_tenant_area` (`organizationId`,`tenantId`,`modelArea`)
);
