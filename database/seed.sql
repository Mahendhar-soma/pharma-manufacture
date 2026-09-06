-- Pharma Life Sciences ERP - Seed Data
-- Run after schema.sql against database: erp

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Roles
INSERT INTO roles (id, role_code, role_name, description) VALUES
(1, 'ADMIN', 'Administrator', 'Full system access'),
(2, 'R_AND_D', 'R&D Manager', 'Drug discovery and preclinical'),
(3, 'CLINICAL', 'Clinical Manager', 'Clinical trials'),
(4, 'PRODUCTION', 'Production Manager', 'Manufacturing and batches'),
(5, 'WAREHOUSE', 'Warehouse Manager', 'Inventory and warehouses'),
(6, 'LAB', 'Laboratory Manager', 'LIMS and equipment'),
(7, 'QUALITY', 'Quality Manager', 'QMS modules'),
(8, 'REGULATORY', 'Regulatory Manager', 'Regulatory tracking'),
(9, 'SALES', 'Sales Manager', 'CRM and sales'),
(10, 'VIEWER', 'Viewer', 'Read-only access')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name);

-- Users (plain text passwords for demo)
INSERT INTO users (id, role_id, name, email, password, phone, status) VALUES
(1, 1, 'System Admin', 'admin@example.com', 'admin123', '9999999999', 'active'),
(2, 4, 'Production User', 'production@example.com', 'prod123', '9888888888', 'active'),
(3, 6, 'Lab Analyst', 'lab@example.com', 'lab123', '9777777777', 'active'),
(4, 9, 'Sales User', 'sales@example.com', 'sales123', '9666666666', 'active'),
(5, 5, 'Warehouse User', 'warehouse@example.com', 'wh123', '9555555555', 'active'),
(6, 7, 'Quality User', 'quality@example.com', 'qc123', '9444444444', 'active'),
(7, 2, 'R&D User', 'rnd@example.com', 'rnd123', '9333333333', 'active'),
(8, 3, 'Clinical User', 'clinical@example.com', 'clinical123', '9222222222', 'active'),
(9, 8, 'Regulatory User', 'regulatory@example.com', 'reg123', '9111111111', 'active'),
(10, 10, 'Viewer User', 'viewer@example.com', 'view123', '9000000000', 'active')
ON DUPLICATE KEY UPDATE name = VALUES(name), role_id = VALUES(role_id), password = VALUES(password);

-- Products
INSERT INTO products (id, product_code, product_name, generic_name, dosage_form, strength, unit, shelf_life_months, description, status) VALUES
(1, 'PARA500', 'Paracetamol 500mg Tablet', 'Paracetamol', 'Tablet', '500 mg', 'tablets', 36, 'Analgesic and antipyretic', 'ACTIVE'),
(2, 'AMOX500', 'Amoxicillin 500mg Capsule', 'Amoxicillin', 'Capsule', '500 mg', 'capsules', 24, 'Antibiotic capsule', 'ACTIVE')
ON DUPLICATE KEY UPDATE product_name = VALUES(product_name);

-- Raw materials
INSERT INTO raw_materials (id, material_code, material_name, material_type, unit, reorder_level, description, status) VALUES
(1, 'API-PARA', 'Paracetamol API', 'API', 'kg', 100, 'Active pharmaceutical ingredient', 'ACTIVE'),
(2, 'EXC-MCC', 'Microcrystalline Cellulose', 'EXCIPIENT', 'kg', 50, 'Filler / binder', 'ACTIVE'),
(3, 'EXC-STARCH', 'Starch', 'EXCIPIENT', 'kg', 30, 'Disintegrant', 'ACTIVE'),
(4, 'EXC-MGST', 'Magnesium Stearate', 'EXCIPIENT', 'kg', 10, 'Lubricant', 'ACTIVE'),
(5, 'API-AMOX', 'Amoxicillin Trihydrate', 'API', 'kg', 80, 'API for amoxicillin', 'ACTIVE')
ON DUPLICATE KEY UPDATE material_name = VALUES(material_name);

-- Suppliers
INSERT INTO suppliers (id, supplier_code, supplier_name, contact_person, phone, email, address, gst_number, license_number, status) VALUES
(1, 'SUP-ABC', 'ABC Pharma Suppliers', 'Ravi Kumar', '9123456780', 'sales@abcpharma.com', 'Mumbai, India', '27AAAAA0000A1Z5', 'DL-ABC-001', 'ACTIVE'),
(2, 'SUP-XYZ', 'XYZ Chemicals', 'Priya Shah', '9123456781', 'contact@xyzchem.com', 'Ahmedabad, India', '24BBBBB0000B1Z5', 'DL-XYZ-002', 'ACTIVE')
ON DUPLICATE KEY UPDATE supplier_name = VALUES(supplier_name);

-- Warehouses
INSERT INTO warehouses (id, warehouse_code, warehouse_name, location, warehouse_type, status) VALUES
(1, 'WH-RM', 'Raw Material Warehouse', 'Plant Block A', 'RAW_MATERIAL', 'ACTIVE'),
(2, 'WH-FG', 'Finished Goods Warehouse', 'Plant Block B', 'FINISHED_GOODS', 'ACTIVE'),
(3, 'WH-PKG', 'Packaging Warehouse', 'Plant Block C', 'PACKAGING', 'ACTIVE'),
(4, 'WH-REJ', 'Rejected Material Warehouse', 'Plant Block D', 'REJECTED', 'ACTIVE')
ON DUPLICATE KEY UPDATE warehouse_name = VALUES(warehouse_name);

-- Customers
INSERT INTO customers (id, customer_code, customer_name, phone, email, address, gst_number, status) VALUES
(1, 'CUST-001', 'City Medical Distributors', '9000000001', 'orders@citymed.com', 'Delhi, India', '07CCCCC0000C1Z5', 'ACTIVE'),
(2, 'CUST-002', 'HealthPlus Pharmacy Chain', '9000000002', 'procure@healthplus.com', 'Bangalore, India', '29DDDDD0000D1Z5', 'ACTIVE')
ON DUPLICATE KEY UPDATE customer_name = VALUES(customer_name);

-- Formula for Paracetamol (active)
INSERT INTO formulas (id, product_id, formula_code, version, batch_size, unit, status) VALUES
(1, 1, 'FORM-PARA500', '1.0', 100000, 'tablets', 'ACTIVE'),
(2, 2, 'FORM-AMOX500', '1.0', 50000, 'capsules', 'ACTIVE')
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO formula_items (id, formula_id, raw_material_id, quantity, unit, percentage, sequence_no) VALUES
(1, 1, 1, 50.0000, 'kg', 75.7576, 1),
(2, 1, 2, 10.0000, 'kg', 15.1515, 2),
(3, 1, 3, 5.0000, 'kg', 7.5758, 3),
(4, 1, 4, 1.0000, 'kg', 1.5152, 4),
(5, 2, 5, 25.0000, 'kg', 100.0000, 1)
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity);

-- Purchase order
INSERT INTO purchase_orders (id, po_number, supplier_id, order_date, expected_date, warehouse_id, status, total_amount, created_by) VALUES
(1, 'PO-2026-001', 1, '2026-08-01', '2026-08-10', 1, 'RECEIVED', 550000.00, 1)
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO purchase_order_items (id, purchase_order_id, raw_material_id, ordered_quantity, unit, unit_price, total_price) VALUES
(1, 1, 1, 200.0000, 'kg', 2000.0000, 400000.00),
(2, 1, 2, 100.0000, 'kg', 500.0000, 50000.00),
(3, 1, 3, 80.0000, 'kg', 300.0000, 24000.00),
(4, 1, 4, 40.0000, 'kg', 800.0000, 32000.00)
ON DUPLICATE KEY UPDATE ordered_quantity = VALUES(ordered_quantity);

-- Goods receipt
INSERT INTO goods_receipts (id, grn_number, purchase_order_id, receipt_date, warehouse_id, status, created_by) VALUES
(1, 'GRN-2026-001', 1, '2026-08-10', 1, 'COMPLETED', 1)
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO goods_receipt_items (id, goods_receipt_id, raw_material_id, batch_number, manufacturing_date, expiry_date, quantity, unit, unit_price) VALUES
(1, 1, 1, 'API-45892', '2026-06-01', '2028-06-01', 200.0000, 'kg', 2000.0000),
(2, 1, 2, 'MCC-1102', '2026-05-15', '2028-05-15', 100.0000, 'kg', 500.0000),
(3, 1, 3, 'ST-9821', '2026-04-20', '2027-12-20', 80.0000, 'kg', 300.0000),
(4, 1, 4, 'MG-3340', '2026-03-10', '2028-03-10', 40.0000, 'kg', 800.0000)
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity);

-- Raw material batches
INSERT INTO raw_material_batches (id, raw_material_id, supplier_id, batch_number, manufacturing_date, expiry_date, received_quantity, available_quantity, unit, purchase_price, warehouse_id, goods_receipt_id, status) VALUES
(1, 1, 1, 'API-45892', '2026-06-01', '2028-06-01', 200.0000, 150.0000, 'kg', 2000.0000, 1, 1, 'AVAILABLE'),
(2, 2, 1, 'MCC-1102', '2026-05-15', '2028-05-15', 100.0000, 90.0000, 'kg', 500.0000, 1, 1, 'AVAILABLE'),
(3, 3, 2, 'ST-9821', '2026-04-20', '2027-12-20', 80.0000, 75.0000, 'kg', 300.0000, 1, 1, 'AVAILABLE'),
(4, 4, 2, 'MG-3340', '2026-03-10', '2028-03-10', 40.0000, 39.0000, 'kg', 800.0000, 1, 1, 'AVAILABLE')
ON DUPLICATE KEY UPDATE available_quantity = VALUES(available_quantity);

-- Inventory for RM batches
INSERT INTO inventory (id, warehouse_id, raw_material_id, raw_material_batch_id, product_id, batch_id, quantity, unit) VALUES
(1, 1, 1, 1, NULL, NULL, 150.0000, 'kg'),
(2, 1, 2, 2, NULL, NULL, 90.0000, 'kg'),
(3, 1, 3, 3, NULL, NULL, 75.0000, 'kg'),
(4, 1, 4, 4, NULL, NULL, 39.0000, 'kg')
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity);

INSERT INTO inventory_transactions (id, transaction_type, reference_type, reference_id, warehouse_id, raw_material_id, raw_material_batch_id, product_id, batch_id, quantity, transaction_date, created_by, remarks) VALUES
(1, 'RECEIPT', 'GOODS_RECEIPT', 1, 1, 1, 1, NULL, NULL, 200.0000, '2026-08-10 10:00:00', 1, 'Initial GRN receipt API'),
(2, 'RECEIPT', 'GOODS_RECEIPT', 1, 1, 2, 2, NULL, NULL, 100.0000, '2026-08-10 10:05:00', 1, 'Initial GRN receipt MCC'),
(3, 'RECEIPT', 'GOODS_RECEIPT', 1, 1, 3, 3, NULL, NULL, 80.0000, '2026-08-10 10:10:00', 1, 'Initial GRN receipt Starch'),
(4, 'RECEIPT', 'GOODS_RECEIPT', 1, 1, 4, 4, NULL, NULL, 40.0000, '2026-08-10 10:15:00', 1, 'Initial GRN receipt Mg Stearate'),
(5, 'PRODUCTION_CONSUMPTION', 'BATCH', 1, 1, 1, 1, NULL, NULL, -50.0000, '2026-09-01 09:00:00', 1, 'Consumed for PARA batch'),
(6, 'PRODUCTION_CONSUMPTION', 'BATCH', 1, 1, 2, 2, NULL, NULL, -10.0000, '2026-09-01 09:05:00', 1, 'Consumed for PARA batch'),
(7, 'PRODUCTION_CONSUMPTION', 'BATCH', 1, 1, 3, 3, NULL, NULL, -5.0000, '2026-09-01 09:10:00', 1, 'Consumed for PARA batch'),
(8, 'PRODUCTION_CONSUMPTION', 'BATCH', 1, 1, 4, 4, NULL, NULL, -1.0000, '2026-09-01 09:15:00', 1, 'Consumed for PARA batch'),
(9, 'PRODUCTION_OUTPUT', 'BATCH', 1, 2, NULL, NULL, 1, 1, 100000.0000, '2026-09-01 18:00:00', 1, 'Finished goods output')
ON DUPLICATE KEY UPDATE remarks = VALUES(remarks);

-- Manufacturing order + finished batch
INSERT INTO manufacturing_orders (id, mo_number, product_id, formula_id, planned_quantity, actual_quantity, planned_start_date, actual_start_date, planned_end_date, actual_end_date, warehouse_id, status, created_by) VALUES
(1, 'MO-2026-001', 1, 1, 100000.0000, 100000.0000, '2026-09-01', '2026-09-01', '2026-09-02', '2026-09-01', 2, 'COMPLETED', 1)
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO manufacturing_order_items (id, manufacturing_order_id, raw_material_id, planned_quantity, reserved_quantity, actual_quantity, unit) VALUES
(1, 1, 1, 50.0000, 50.0000, 50.0000, 'kg'),
(2, 1, 2, 10.0000, 10.0000, 10.0000, 'kg'),
(3, 1, 3, 5.0000, 5.0000, 5.0000, 'kg'),
(4, 1, 4, 1.0000, 1.0000, 1.0000, 'kg')
ON DUPLICATE KEY UPDATE planned_quantity = VALUES(planned_quantity);

INSERT INTO batches (id, product_id, manufacturing_order_id, batch_number, manufacturing_date, expiry_date, planned_quantity, actual_quantity, unit, warehouse_id, status) VALUES
(1, 1, 1, 'PARA-20260901-001', '2026-09-01', '2029-09-01', 100000.0000, 100000.0000, 'tablets', 2, 'RELEASED')
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO batch_material_consumption (id, batch_id, raw_material_id, raw_material_batch_id, planned_quantity, actual_quantity, unit) VALUES
(1, 1, 1, 1, 50.0000, 50.0000, 'kg'),
(2, 1, 2, 2, 10.0000, 10.0000, 'kg'),
(3, 1, 3, 3, 5.0000, 5.0000, 'kg'),
(4, 1, 4, 4, 1.0000, 1.0000, 'kg')
ON DUPLICATE KEY UPDATE actual_quantity = VALUES(actual_quantity);

INSERT INTO inventory (id, warehouse_id, raw_material_id, raw_material_batch_id, product_id, batch_id, quantity, unit) VALUES
(5, 2, NULL, NULL, 1, 1, 100000.0000, 'tablets')
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity);

-- R&D sample data
INSERT INTO research_projects (id, project_code, project_name, description, start_date, status, created_by) VALUES
(1, 'RP-2026-001', 'Analgesic Lead Optimization', 'Optimize paracetamol analog leads', '2026-01-15', 'ACTIVE', 1)
ON DUPLICATE KEY UPDATE project_name = VALUES(project_name);

INSERT INTO compounds (id, compound_code, compound_name, chemical_formula, molecular_weight, smiles, description, status) VALUES
(1, 'CMP-001', 'Para Analog A', 'C8H9NO2', 151.1630, 'CC(=O)NC1=CC=C(O)C=C1', 'Paracetamol reference', 'ACTIVE'),
(2, 'CMP-002', 'Para Analog B', 'C9H11NO2', 165.1900, 'CCC(=O)NC1=CC=C(O)C=C1', 'Extended analog', 'ACTIVE')
ON DUPLICATE KEY UPDATE compound_name = VALUES(compound_name);

INSERT INTO research_experiments (id, project_id, compound_id, experiment_name, experiment_date, result, remarks, created_by) VALUES
(1, 1, 1, 'Solubility Screen', '2026-02-10', 'Soluble in aqueous buffer at pH 7.4', 'RDKit descriptors logged externally', 1)
ON DUPLICATE KEY UPDATE result = VALUES(result);

INSERT INTO docking_experiments (id, compound_id, target_name, software_name, binding_score, experiment_date, result, remarks) VALUES
(1, 1, 'COX-2', 'AutoDock Vina', -7.8500, '2026-02-20', 'Favorable binding pose', 'External docking result imported')
ON DUPLICATE KEY UPDATE binding_score = VALUES(binding_score);

INSERT INTO preclinical_studies (id, study_code, study_title, study_type, compound_id, study_date, researcher, result, status) VALUES
(1, 'PC-2026-001', 'Acute Toxicity Study', 'TOXICOLOGY', 1, '2026-03-01', 'Dr. Mehta', 'No acute toxicity observed at tested dose', 'COMPLETED')
ON DUPLICATE KEY UPDATE study_title = VALUES(study_title);

INSERT INTO clinical_studies (id, study_code, study_title, phase, sponsor, start_date, status, description) VALUES
(1, 'CT-PARA-P3', 'Paracetamol Efficacy Phase III', 'PHASE_III', 'InriSoft Pharma', '2026-04-01', 'ACTIVE', 'Multi-center efficacy study')
ON DUPLICATE KEY UPDATE study_title = VALUES(study_title);

INSERT INTO clinical_sites (id, study_id, site_code, site_name, location, principal_investigator, status) VALUES
(1, 1, 'SITE-01', 'Metro General Hospital', 'Mumbai', 'Dr. Anil Rao', 'ACTIVE')
ON DUPLICATE KEY UPDATE site_name = VALUES(site_name);

INSERT INTO clinical_subjects (id, study_id, subject_code, site_id, enrollment_date, status) VALUES
(1, 1, 'SUBJ-0001', 1, '2026-04-15', 'ENROLLED'),
(2, 1, 'SUBJ-0002', 1, '2026-04-18', 'ENROLLED')
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- Laboratory
INSERT INTO samples (id, sample_code, sample_type, product_id, batch_id, received_date, received_by, status, remarks) VALUES
(1, 'SMP-PARA-001', 'Finished Product', 1, 1, '2026-09-02', 3, 'COMPLETED', 'QC release sample')
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO sample_tests (id, sample_id, test_name, test_method, assigned_to, test_date, status) VALUES
(1, 1, 'Assay', 'HPLC', 3, '2026-09-02', 'COMPLETED'),
(2, 1, 'Dissolution', 'USP <711>', 3, '2026-09-02', 'COMPLETED')
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO test_results (id, sample_test_id, parameter, result_value, unit, specification, pass_fail, remarks) VALUES
(1, 1, 'Assay', '99.2', '%', '95.0 - 105.0', 'PASS', NULL),
(2, 2, 'Dissolution 30 min', '92', '%', 'NLT 80%', 'PASS', NULL)
ON DUPLICATE KEY UPDATE result_value = VALUES(result_value);

INSERT INTO laboratory_equipment (id, equipment_code, equipment_name, serial_number, location, purchase_date, status) VALUES
(1, 'EQ-HPLC-01', 'HPLC System', 'SN-HPLC-7781', 'QC Lab', '2024-01-15', 'ACTIVE')
ON DUPLICATE KEY UPDATE equipment_name = VALUES(equipment_name);

INSERT INTO equipment_calibrations (id, equipment_id, calibration_date, next_calibration_date, performed_by, result, certificate_number) VALUES
(1, 1, '2026-06-01', '2026-12-01', 'Metro Cal Services', 'PASS', 'CAL-2026-7781')
ON DUPLICATE KEY UPDATE next_calibration_date = VALUES(next_calibration_date);

-- Quality
INSERT INTO sops (id, sop_number, title, version, department, effective_date, review_date, status, description, created_by) VALUES
(1, 'SOP-QA-001', 'Batch Release Procedure', '1.0', 'Quality', '2026-01-01', '2027-01-01', 'APPROVED', 'Procedure for finished batch release', 1)
ON DUPLICATE KEY UPDATE title = VALUES(title);

INSERT INTO deviations (id, deviation_number, title, description, department, severity, reported_date, reported_by, status) VALUES
(1, 'DEV-2026-001', 'Minor tablet weight variation', 'Observed weight variation within investigation threshold', 'Production', 'LOW', '2026-08-20', 1, 'CLOSED')
ON DUPLICATE KEY UPDATE title = VALUES(title);

INSERT INTO capa (id, capa_number, deviation_id, type, description, corrective_action, preventive_action, responsible_person, due_date, completion_date, status) VALUES
(1, 'CAPA-2026-001', 1, 'BOTH', 'Address tablet weight variation', 'Adjusted feeder settings', 'Added in-process weight check', 'Production Manager', '2026-09-15', '2026-09-10', 'COMPLETED')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO audits (id, audit_number, audit_type, department, auditor, start_date, end_date, status) VALUES
(1, 'AUD-2026-001', 'Internal', 'Quality', 'Lead Auditor', '2026-07-01', '2026-07-03', 'COMPLETED')
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO audit_findings (id, audit_id, finding_title, severity, description, action_required, status) VALUES
(1, 1, 'Label storage improvement', 'LOW', 'Improve segregation of label stock', 'Update warehouse SOP', 'CLOSED')
ON DUPLICATE KEY UPDATE finding_title = VALUES(finding_title);

INSERT INTO change_controls (id, change_number, title, description, reason, impact, requested_by, approval_status, status) VALUES
(1, 'CC-2026-001', 'Update assay method version', 'Move assay method to v2', 'Improved sensitivity', 'QC documentation update', 1, 'APPROVED', 'IMPLEMENTED')
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- Regulatory
INSERT INTO product_registrations (id, registration_number, product_id, country, authority, approval_date, expiry_date, status) VALUES
(1, 'REG-IN-PARA-001', 1, 'India', 'CDSCO', '2024-05-01', '2029-05-01', 'ACTIVE')
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO licenses (id, license_number, license_type, issued_by, issue_date, expiry_date, status) VALUES
(1, 'MFG-LIC-7788', 'Manufacturing License', 'State FDA', '2023-01-01', '2028-01-01', 'ACTIVE')
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO regulatory_submissions (id, submission_number, title, authority, submission_type, product_id, submission_date, status) VALUES
(1, 'SUB-2026-001', 'Variation filing for packaging change', 'CDSCO', 'Variation', 1, '2026-06-15', 'UNDER_REVIEW')
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- CRM
INSERT INTO hospitals (id, hospital_code, hospital_name, phone, email, address, city, status) VALUES
(1, 'HSP-001', 'Metro General Hospital', '9111000001', 'admin@metrogeneral.com', 'Andheri East', 'Mumbai', 'ACTIVE'),
(2, 'HSP-002', 'City Care Hospital', '9111000002', 'info@citycare.com', 'Koramangala', 'Bangalore', 'ACTIVE')
ON DUPLICATE KEY UPDATE hospital_name = VALUES(hospital_name);

INSERT INTO doctors (id, doctor_code, doctor_name, specialization, phone, email, hospital_id, city, status) VALUES
(1, 'DOC-001', 'Dr. Anil Rao', 'General Medicine', '9800000001', 'anil.rao@metrogeneral.com', 1, 'Mumbai', 'ACTIVE'),
(2, 'DOC-002', 'Dr. Sneha Iyer', 'Pediatrics', '9800000002', 'sneha.iyer@citycare.com', 2, 'Bangalore', 'ACTIVE')
ON DUPLICATE KEY UPDATE doctor_name = VALUES(doctor_name);

INSERT INTO medical_representatives (id, mr_code, mr_name, phone, email, territory, status) VALUES
(1, 'MR-001', 'Amit Verma', '9700000001', 'amit.verma@inrisoft.com', 'West Zone', 'ACTIVE'),
(2, 'MR-002', 'Neha Patel', '9700000002', 'neha.patel@inrisoft.com', 'South Zone', 'ACTIVE')
ON DUPLICATE KEY UPDATE mr_name = VALUES(mr_name);

INSERT INTO doctor_visits (id, doctor_id, medical_representative_id, visit_date, purpose, notes, follow_up_date, status) VALUES
(1, 1, 1, '2026-09-03', 'Product detailing - PARA500', 'Doctor requested samples', '2026-09-20', 'FOLLOW_UP')
ON DUPLICATE KEY UPDATE purpose = VALUES(purpose);

SET FOREIGN_KEY_CHECKS = 1;
