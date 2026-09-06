-- Phase 17: append-only system audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id BIGINT UNSIGNED NULL,
  user_email VARCHAR(191) NULL,
  user_name VARCHAR(191) NULL,
  role_code VARCHAR(50) NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  entity_code VARCHAR(100) NULL,
  summary VARCHAR(500) NOT NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  ip_address VARCHAR(64) NULL,
  request_path VARCHAR(255) NULL,
  KEY idx_audit_occurred (occurred_at),
  KEY idx_audit_entity (entity_type, entity_id),
  KEY idx_audit_user (user_id),
  KEY idx_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
