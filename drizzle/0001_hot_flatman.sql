CREATE TABLE `membership_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`membershipId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','executive','analyst','viewer') NOT NULL DEFAULT 'viewer',
	`isActive` boolean NOT NULL DEFAULT true,
	`invitedAt` timestamp NOT NULL DEFAULT (now()),
	`acceptedAt` timestamp,
	CONSTRAINT `membership_users_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`plan` enum('trial','starter','professional','enterprise') NOT NULL DEFAULT 'starter',
	`status` enum('active','suspended','cancelled','trial') NOT NULL DEFAULT 'active',
	`ieEnabled` boolean NOT NULL DEFAULT true,
	`ieModelVersion` varchar(32) DEFAULT '1.0',
	`maxSubaccounts` int DEFAULT 10,
	`billingEmail` varchar(320),
	`trialEndsAt` timestamp,
	`renewsAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memberships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(256) NOT NULL,
	`type` enum('platform_owner','customer') NOT NULL,
	`industry` varchar(128),
	`website` varchar(512),
	`logoUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `subaccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`membershipId` int NOT NULL,
	`ghlLocationId` varchar(128) NOT NULL,
	`ghlCompanyId` varchar(128),
	`name` varchar(256) NOT NULL,
	`timezone` varchar(64) DEFAULT 'America/New_York',
	`isActive` boolean NOT NULL DEFAULT true,
	`ieEnabled` boolean NOT NULL DEFAULT true,
	`connectedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subaccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `subaccounts_ghlLocationId_unique` UNIQUE(`ghlLocationId`)
);
--> statement-breakpoint
CREATE INDEX `idx_membership_users_membership` ON `membership_users` (`membershipId`);--> statement-breakpoint
CREATE INDEX `idx_membership_users_user` ON `membership_users` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_memberships_org` ON `memberships` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_memberships_status` ON `memberships` (`status`);--> statement-breakpoint
CREATE INDEX `idx_orgs_slug` ON `organizations` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_orgs_type` ON `organizations` (`type`);--> statement-breakpoint
CREATE INDEX `idx_subaccounts_membership` ON `subaccounts` (`membershipId`);--> statement-breakpoint
CREATE INDEX `idx_subaccounts_ghl_location` ON `subaccounts` (`ghlLocationId`);