CREATE TABLE `auth_audit_events` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`organizationId` int,
	`action` varchar(128) NOT NULL,
	`targetType` varchar(64),
	`targetId` varchar(128),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auth_audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auth_invitations` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`organizationId` int NOT NULL,
	`membershipId` int NOT NULL,
	`role` enum('owner','executive','analyst','viewer') NOT NULL DEFAULT 'viewer',
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`invitedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auth_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_invitations_hash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	`ipAddress` varchar(128),
	`userAgent` text,
	CONSTRAINT `auth_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_sessions_token_hash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_hash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_auth_audit_actor` ON `auth_audit_events` (`actorUserId`);--> statement-breakpoint
CREATE INDEX `idx_auth_audit_org` ON `auth_audit_events` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_auth_audit_action` ON `auth_audit_events` (`action`);--> statement-breakpoint
CREATE INDEX `idx_auth_invitations_email` ON `auth_invitations` (`email`);--> statement-breakpoint
CREATE INDEX `idx_auth_invitations_org` ON `auth_invitations` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_user` ON `auth_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_expires` ON `auth_sessions` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `idx_password_reset_user` ON `password_reset_tokens` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_password_reset_expires` ON `password_reset_tokens` (`expiresAt`);