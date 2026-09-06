-- Extra role users for Phase 11 RBAC demos (safe to re-run)
INSERT INTO users (id, role_id, name, email, password, phone, status) VALUES
(5, 5, 'Warehouse User', 'warehouse@example.com', 'wh123', '9555555555', 'active'),
(6, 7, 'Quality User', 'quality@example.com', 'qc123', '9444444444', 'active'),
(7, 2, 'R&D User', 'rnd@example.com', 'rnd123', '9333333333', 'active'),
(8, 3, 'Clinical User', 'clinical@example.com', 'clinical123', '9222222222', 'active'),
(9, 8, 'Regulatory User', 'regulatory@example.com', 'reg123', '9111111111', 'active'),
(10, 10, 'Viewer User', 'viewer@example.com', 'view123', '9000000000', 'active')
ON DUPLICATE KEY UPDATE name = VALUES(name), role_id = VALUES(role_id), password = VALUES(password);
