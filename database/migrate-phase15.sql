-- Phase 15: per-user notification dismissals
CREATE TABLE IF NOT EXISTS notification_dismissals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  notification_key VARCHAR(191) NOT NULL,
  dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_notification (user_id, notification_key),
  KEY idx_nd_user (user_id),
  CONSTRAINT fk_nd_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
