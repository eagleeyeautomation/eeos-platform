ALTER TABLE `auth_sessions` ADD `recentAuthAt` timestamp NULL;
ALTER TABLE `auth_sessions` ADD `mfaVerifiedAt` timestamp NULL;
CREATE TABLE `auth_mfa_factors` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `encryptedSecret` text NOT NULL,
  `recoveryCodeHashes` json NOT NULL,
  `lastTotpCounter` bigint,
  `enabledAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `auth_mfa_factors_id` PRIMARY KEY(`id`),
  CONSTRAINT `auth_mfa_factors_user_unique` UNIQUE(`userId`)
);
