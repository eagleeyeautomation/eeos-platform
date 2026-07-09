CREATE TABLE `audit_log` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`tenantId` varchar(128) NOT NULL,
	`actor` enum('ghl_webhook','ie_engine','user','system','token_refresh') NOT NULL,
	`action` varchar(256) NOT NULL,
	`entityType` varchar(64),
	`entityId` varchar(256),
	`outcome` enum('success','failure','skipped','pending') NOT NULL,
	`details` json,
	`errorMessage` text,
	`durationMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `business_memory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` varchar(128) NOT NULL,
	`totalPipelineValue` float DEFAULT 0,
	`activeOpportunities` int DEFAULT 0,
	`wonOpportunitiesLast30d` int DEFAULT 0,
	`lostOpportunitiesLast30d` int DEFAULT 0,
	`avgDealSize` float DEFAULT 0,
	`pipelineVelocity` float DEFAULT 0,
	`totalContacts` int DEFAULT 0,
	`newContactsLast7d` int DEFAULT 0,
	`newContactsLast30d` int DEFAULT 0,
	`appointmentsLast7d` int DEFAULT 0,
	`appointmentsLast30d` int DEFAULT 0,
	`appointmentCancellationRate` float DEFAULT 0,
	`topTags` json,
	`healthScore` int DEFAULT 50,
	`healthScoreTrend` enum('up','down','neutral') DEFAULT 'neutral',
	`healthScoreComponents` json,
	`lastSignalAt` timestamp,
	`signalCount24h` int DEFAULT 0,
	`signalCount7d` int DEFAULT 0,
	`signalCount30d` int DEFAULT 0,
	`lastUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `business_memory_id` PRIMARY KEY(`id`),
	CONSTRAINT `business_memory_tenantId_unique` UNIQUE(`tenantId`)
);
--> statement-breakpoint
CREATE TABLE `ghl_signals` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`tenantId` varchar(128) NOT NULL,
	`signalType` enum('contact.created','contact.updated','contact.deleted','contact.tag_added','contact.tag_removed','opportunity.created','opportunity.updated','opportunity.status_changed','opportunity.deleted','pipeline.stage_changed','appointment.created','appointment.updated','appointment.cancelled','appointment.completed','custom_field.updated','note.created','task.created','task.completed','conversation.message_sent','conversation.message_received','payment.received','form.submitted','workflow.triggered') NOT NULL,
	`sourceEventId` varchar(256),
	`entityType` varchar(64),
	`entityId` varchar(256),
	`entityName` text,
	`rawPayload` json,
	`normalizedPayload` json,
	`signalWeight` float DEFAULT 1,
	`processed` boolean DEFAULT false,
	`processedAt` timestamp,
	`processingError` text,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ghl_signals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ghl_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` varchar(128) NOT NULL,
	`locationId` varchar(128),
	`companyId` varchar(128),
	`accessToken` text NOT NULL,
	`refreshToken` text NOT NULL,
	`tokenType` varchar(32) DEFAULT 'Bearer',
	`scope` text,
	`expiresAt` timestamp NOT NULL,
	`lastRefreshedAt` timestamp DEFAULT (now()),
	`refreshFailCount` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`webhookRegistered` boolean DEFAULT false,
	`webhookId` varchar(128),
	`connectedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ghl_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `ghl_tokens_tenantId_unique` UNIQUE(`tenantId`)
);
--> statement-breakpoint
CREATE TABLE `ie_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` varchar(128) NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`totalRecommendations` int DEFAULT 0,
	`accepted` int DEFAULT 0,
	`rejected` int DEFAULT 0,
	`deferred` int DEFAULT 0,
	`acceptanceRate` float DEFAULT 0,
	`avgPredictedConfidence` float DEFAULT 0,
	`avgActualAccuracy` float DEFAULT 0,
	`calibrationError` float DEFAULT 0,
	`truePositives` int DEFAULT 0,
	`falsePositives` int DEFAULT 0,
	`falseNegatives` int DEFAULT 0,
	`precision` float DEFAULT 0,
	`recall` float DEFAULT 0,
	`f1Score` float DEFAULT 0,
	`avgResponseTimeMs` int DEFAULT 0,
	`computedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ie_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kg_edges` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`tenantId` varchar(128) NOT NULL,
	`fromNodeId` bigint NOT NULL,
	`toNodeId` bigint NOT NULL,
	`relationshipType` varchar(64) NOT NULL,
	`weight` float DEFAULT 1,
	`properties` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kg_edges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kg_nodes` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`tenantId` varchar(128) NOT NULL,
	`nodeType` enum('contact','opportunity','pipeline_stage','tag','appointment','campaign','workflow','custom_field','location') NOT NULL,
	`externalId` varchar(256) NOT NULL,
	`label` text,
	`properties` json,
	`signalCount` int DEFAULT 1,
	`lastSeenAt` timestamp DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kg_nodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendation_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recommendationId` int NOT NULL,
	`tenantId` varchar(128) NOT NULL,
	`userId` int,
	`decision` enum('accepted','rejected','deferred','already_done') NOT NULL,
	`outcomeRecorded` boolean DEFAULT false,
	`outcomeType` enum('positive','negative','neutral','unknown'),
	`outcomeNotes` text,
	`outcomeRecordedAt` timestamp,
	`executiveConfidenceRating` int,
	`executiveComment` text,
	`wasAccurate` boolean,
	`decidedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recommendation_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` varchar(128) NOT NULL,
	`title` text NOT NULL,
	`why` text NOT NULL,
	`whyNow` text NOT NULL,
	`evidence` json,
	`businessImpact` text NOT NULL,
	`riskLevel` enum('low','medium','high','critical') NOT NULL,
	`recommendedAction` text NOT NULL,
	`measurementPlan` text NOT NULL,
	`confidenceScore` int NOT NULL,
	`confidenceFactors` json,
	`signalCount` int DEFAULT 0,
	`signalWindowDays` int DEFAULT 7,
	`category` enum('revenue','pipeline','retention','operations','growth','risk','team') NOT NULL,
	`priority` enum('low','medium','high','critical') NOT NULL,
	`ieModelVersion` varchar(32) DEFAULT '1.0',
	`promptHash` varchar(64),
	`rawLlmResponse` text,
	`status` enum('active','accepted','rejected','expired','superseded') DEFAULT 'active',
	`expiresAt` timestamp,
	`supersededById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `timeline_events` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`tenantId` varchar(128) NOT NULL,
	`signalId` bigint,
	`eventType` varchar(128) NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`entityType` varchar(64),
	`entityId` varchar(256),
	`entityName` text,
	`significance` enum('low','medium','high','critical') DEFAULT 'medium',
	`businessImpact` text,
	`metadata` json,
	`occurredAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `timeline_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `idx_audit_tenant_created` ON `audit_log` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_audit_actor` ON `audit_log` (`actor`);--> statement-breakpoint
CREATE INDEX `idx_audit_outcome` ON `audit_log` (`outcome`);--> statement-breakpoint
CREATE INDEX `idx_memory_tenant` ON `business_memory` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_signals_tenant_type` ON `ghl_signals` (`tenantId`,`signalType`);--> statement-breakpoint
CREATE INDEX `idx_signals_tenant_received` ON `ghl_signals` (`tenantId`,`receivedAt`);--> statement-breakpoint
CREATE INDEX `idx_signals_processed` ON `ghl_signals` (`processed`);--> statement-breakpoint
CREATE INDEX `idx_ghl_tokens_tenant` ON `ghl_tokens` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_ghl_tokens_expires` ON `ghl_tokens` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `idx_ie_metrics_tenant` ON `ie_metrics` (`tenantId`,`periodStart`);--> statement-breakpoint
CREATE INDEX `idx_kg_edges_tenant` ON `kg_edges` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_kg_edges_from` ON `kg_edges` (`fromNodeId`);--> statement-breakpoint
CREATE INDEX `idx_kg_edges_to` ON `kg_edges` (`toNodeId`);--> statement-breakpoint
CREATE INDEX `idx_kg_nodes_tenant_type` ON `kg_nodes` (`tenantId`,`nodeType`);--> statement-breakpoint
CREATE INDEX `idx_kg_nodes_external` ON `kg_nodes` (`tenantId`,`externalId`);--> statement-breakpoint
CREATE INDEX `idx_feedback_rec` ON `recommendation_feedback` (`recommendationId`);--> statement-breakpoint
CREATE INDEX `idx_feedback_tenant` ON `recommendation_feedback` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_feedback_decision` ON `recommendation_feedback` (`decision`);--> statement-breakpoint
CREATE INDEX `idx_recs_tenant_status` ON `recommendations` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_recs_tenant_created` ON `recommendations` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_recs_priority` ON `recommendations` (`tenantId`,`priority`);--> statement-breakpoint
CREATE INDEX `idx_timeline_tenant_occurred` ON `timeline_events` (`tenantId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `idx_timeline_significance` ON `timeline_events` (`tenantId`,`significance`);