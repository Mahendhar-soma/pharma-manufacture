-- Phase 14: job run history for scheduled expiry (and future jobs)
CREATE TABLE IF NOT EXISTS job_runs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL,
  started_at DATETIME NOT NULL,
  finished_at DATETIME NULL,
  status ENUM('RUNNING','SUCCESS','FAILED') NOT NULL,
  result_json JSON NULL,
  error_message TEXT NULL,
  triggered_by VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_job_runs_name_id (job_name, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
