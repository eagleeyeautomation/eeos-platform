ALTER TABLE `c2b_connectors`
  ADD COLUMN `intelligenceDomain` enum('c2c','c2b','b2b') NOT NULL DEFAULT 'c2b' AFTER `organizationId`;

ALTER TABLE `c2b_opportunities`
  ADD COLUMN `intelligenceDomain` enum('c2c','c2b','b2b') NOT NULL DEFAULT 'c2b' AFTER `tenantId`;

CREATE INDEX `idx_intelligence_connector_domain`
  ON `c2b_connectors` (`organizationId`, `intelligenceDomain`);

CREATE INDEX `idx_intelligence_opportunity_domain`
  ON `c2b_opportunities` (`organizationId`, `intelligenceDomain`, `status`);
