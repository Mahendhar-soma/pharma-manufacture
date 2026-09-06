-- Pharma Life Sciences Management ERP - MySQL 8 Schema
-- Database: erp

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- USERS & ROLES
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_code VARCHAR(50) NOT NULL UNIQUE,
  role_name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role_id),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DRUG DISCOVERY / R&D
-- ============================================================

CREATE TABLE IF NOT EXISTS research_projects (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_code VARCHAR(50) NOT NULL UNIQUE,
  project_name VARCHAR(200) NOT NULL,
  description TEXT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  status ENUM('PLANNED','ACTIVE','ON_HOLD','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PLANNED',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_rp_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS compounds (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  compound_code VARCHAR(50) NOT NULL UNIQUE,
  compound_name VARCHAR(200) NOT NULL,
  chemical_formula VARCHAR(100) NULL,
  molecular_weight DECIMAL(12,4) NULL,
  smiles TEXT NULL,
  description TEXT NULL,
  status ENUM('ACTIVE','INACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS research_experiments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT UNSIGNED NOT NULL,
  compound_id BIGINT UNSIGNED NULL,
  experiment_name VARCHAR(200) NOT NULL,
  experiment_date DATE NULL,
  result TEXT NULL,
  remarks TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_re_project (project_id),
  KEY idx_re_compound (compound_id),
  CONSTRAINT fk_re_project FOREIGN KEY (project_id) REFERENCES research_projects(id),
  CONSTRAINT fk_re_compound FOREIGN KEY (compound_id) REFERENCES compounds(id),
  CONSTRAINT fk_re_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS docking_experiments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  compound_id BIGINT UNSIGNED NOT NULL,
  target_name VARCHAR(200) NOT NULL,
  software_name VARCHAR(100) NULL,
  binding_score DECIMAL(12,4) NULL,
  experiment_date DATE NULL,
  result TEXT NULL,
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_de_compound (compound_id),
  CONSTRAINT fk_de_compound FOREIGN KEY (compound_id) REFERENCES compounds(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- PRECLINICAL
-- ============================================================

CREATE TABLE IF NOT EXISTS preclinical_studies (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  study_code VARCHAR(50) NOT NULL UNIQUE,
  study_title VARCHAR(255) NOT NULL,
  study_type ENUM('TOXICOLOGY','PHARMACOLOGY','SAFETY','EFFICACY','OTHER') NOT NULL,
  compound_id BIGINT UNSIGNED NULL,
  study_date DATE NULL,
  researcher VARCHAR(150) NULL,
  result TEXT NULL,
  remarks TEXT NULL,
  status ENUM('PLANNED','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PLANNED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ps_compound FOREIGN KEY (compound_id) REFERENCES compounds(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS preclinical_experiments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  study_id BIGINT UNSIGNED NOT NULL,
  experiment_name VARCHAR(200) NOT NULL,
  experiment_date DATE NULL,
  method VARCHAR(255) NULL,
  result TEXT NULL,
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pe_study FOREIGN KEY (study_id) REFERENCES preclinical_studies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- CLINICAL TRIALS
-- ============================================================

CREATE TABLE IF NOT EXISTS clinical_studies (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  study_code VARCHAR(50) NOT NULL UNIQUE,
  study_title VARCHAR(255) NOT NULL,
  phase ENUM('PHASE_I','PHASE_II','PHASE_III','PHASE_IV') NOT NULL,
  sponsor VARCHAR(200) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  status ENUM('PLANNED','ACTIVE','COMPLETED','ON_HOLD','CANCELLED') NOT NULL DEFAULT 'PLANNED',
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS clinical_sites (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  study_id BIGINT UNSIGNED NOT NULL,
  site_code VARCHAR(50) NOT NULL,
  site_name VARCHAR(200) NOT NULL,
  location VARCHAR(255) NULL,
  principal_investigator VARCHAR(150) NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_site_study_code (study_id, site_code),
  CONSTRAINT fk_csite_study FOREIGN KEY (study_id) REFERENCES clinical_studies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS clinical_subjects (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  study_id BIGINT UNSIGNED NOT NULL,
  subject_code VARCHAR(50) NOT NULL,
  site_id BIGINT UNSIGNED NULL,
  enrollment_date DATE NULL,
  status ENUM('SCREENING','ENROLLED','COMPLETED','WITHDRAWN','DISCONTINUED') NOT NULL DEFAULT 'SCREENING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_subject_study_code (study_id, subject_code),
  CONSTRAINT fk_csubj_study FOREIGN KEY (study_id) REFERENCES clinical_studies(id),
  CONSTRAINT fk_csubj_site FOREIGN KEY (site_id) REFERENCES clinical_sites(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS clinical_data (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  study_id BIGINT UNSIGNED NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  visit_name VARCHAR(100) NOT NULL,
  visit_date DATE NULL,
  data_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cdata_study FOREIGN KEY (study_id) REFERENCES clinical_studies(id),
  CONSTRAINT fk_cdata_subject FOREIGN KEY (subject_id) REFERENCES clinical_subjects(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- MANUFACTURING MASTERS
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_code VARCHAR(50) NOT NULL UNIQUE,
  product_name VARCHAR(200) NOT NULL,
  generic_name VARCHAR(200) NULL,
  dosage_form VARCHAR(100) NULL,
  strength VARCHAR(100) NULL,
  unit VARCHAR(50) NOT NULL DEFAULT 'units',
  shelf_life_months INT UNSIGNED NOT NULL DEFAULT 24,
  description TEXT NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_products_name (product_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS raw_materials (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  material_code VARCHAR(50) NOT NULL UNIQUE,
  material_name VARCHAR(200) NOT NULL,
  material_type ENUM('API','EXCIPIENT','PACKAGING','CHEMICAL','OTHER') NOT NULL DEFAULT 'OTHER',
  unit VARCHAR(50) NOT NULL DEFAULT 'kg',
  reorder_level DECIMAL(14,4) NOT NULL DEFAULT 0,
  description TEXT NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_rm_name (material_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_code VARCHAR(50) NOT NULL UNIQUE,
  supplier_name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(150) NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(150) NULL,
  address TEXT NULL,
  gst_number VARCHAR(50) NULL,
  license_number VARCHAR(100) NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS warehouses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  warehouse_code VARCHAR(50) NOT NULL UNIQUE,
  warehouse_name VARCHAR(200) NOT NULL,
  location VARCHAR(255) NULL,
  warehouse_type ENUM('RAW_MATERIAL','FINISHED_GOODS','PACKAGING','REJECTED') NOT NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_code VARCHAR(50) NOT NULL UNIQUE,
  customer_name VARCHAR(200) NOT NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(150) NULL,
  address TEXT NULL,
  gst_number VARCHAR(50) NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- FORMULAS
-- ============================================================

CREATE TABLE IF NOT EXISTS formulas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  formula_code VARCHAR(50) NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT '1.0',
  batch_size DECIMAL(14,4) NOT NULL,
  unit VARCHAR(50) NOT NULL DEFAULT 'units',
  status ENUM('DRAFT','ACTIVE','INACTIVE','OBSOLETE') NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_formula_code_version (formula_code, version),
  KEY idx_formula_product (product_id),
  CONSTRAINT fk_formula_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS formula_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  formula_id BIGINT UNSIGNED NOT NULL,
  raw_material_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(14,4) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  percentage DECIMAL(8,4) NULL,
  sequence_no INT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fi_formula FOREIGN KEY (formula_id) REFERENCES formulas(id),
  CONSTRAINT fk_fi_rm FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- PURCHASES & GOODS RECEIPT
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  po_number VARCHAR(50) NOT NULL UNIQUE,
  supplier_id BIGINT UNSIGNED NOT NULL,
  order_date DATE NOT NULL,
  expected_date DATE NULL,
  warehouse_id BIGINT UNSIGNED NULL,
  status ENUM('DRAFT','PENDING','ORDERED','PARTIALLY_RECEIVED','FULLY_RECEIVED','RECEIVED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_po_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  CONSTRAINT fk_po_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purchase_order_id BIGINT UNSIGNED NOT NULL,
  raw_material_id BIGINT UNSIGNED NOT NULL,
  ordered_quantity DECIMAL(14,4) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  unit_price DECIMAL(14,4) NOT NULL DEFAULT 0,
  total_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  expected_date DATE NULL,
  remarks VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_poi_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  CONSTRAINT fk_poi_rm FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS goods_receipts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  grn_number VARCHAR(50) NOT NULL UNIQUE,
  purchase_order_id BIGINT UNSIGNED NOT NULL,
  receipt_date DATE NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  status ENUM('DRAFT','COMPLETED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_gr_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  CONSTRAINT fk_gr_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  CONSTRAINT fk_gr_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  goods_receipt_id BIGINT UNSIGNED NOT NULL,
  purchase_order_item_id BIGINT UNSIGNED NULL,
  raw_material_id BIGINT UNSIGNED NOT NULL,
  batch_number VARCHAR(100) NOT NULL,
  manufacturing_date DATE NULL,
  expiry_date DATE NOT NULL,
  quantity DECIMAL(14,4) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  unit_price DECIMAL(14,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_gri_batch (batch_number),
  KEY idx_gri_poi (purchase_order_item_id),
  CONSTRAINT fk_gri_gr FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts(id),
  CONSTRAINT fk_gri_rm FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS raw_material_batches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  raw_material_id BIGINT UNSIGNED NOT NULL,
  supplier_id BIGINT UNSIGNED NULL,
  batch_number VARCHAR(100) NOT NULL,
  manufacturing_date DATE NULL,
  expiry_date DATE NOT NULL,
  received_quantity DECIMAL(14,4) NOT NULL,
  available_quantity DECIMAL(14,4) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  purchase_price DECIMAL(14,4) NOT NULL DEFAULT 0,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  goods_receipt_id BIGINT UNSIGNED NULL,
  status ENUM('AVAILABLE','QUARANTINE','REJECTED','EXPIRED','CONSUMED') NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_rm_batch (raw_material_id, batch_number),
  KEY idx_rmb_expiry (expiry_date),
  KEY idx_rmb_status (status),
  CONSTRAINT fk_rmb_rm FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id),
  CONSTRAINT fk_rmb_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_rmb_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  CONSTRAINT fk_rmb_gr FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- MANUFACTURING & BATCHES
-- ============================================================

CREATE TABLE IF NOT EXISTS manufacturing_orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mo_number VARCHAR(50) NOT NULL UNIQUE,
  product_id BIGINT UNSIGNED NOT NULL,
  formula_id BIGINT UNSIGNED NOT NULL,
  planned_quantity DECIMAL(14,4) NOT NULL,
  actual_quantity DECIMAL(14,4) NULL,
  planned_start_date DATE NULL,
  actual_start_date DATE NULL,
  planned_end_date DATE NULL,
  actual_end_date DATE NULL,
  warehouse_id BIGINT UNSIGNED NULL,
  status ENUM('PLANNED','RELEASED','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PLANNED',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_mo_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_mo_formula FOREIGN KEY (formula_id) REFERENCES formulas(id),
  CONSTRAINT fk_mo_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  CONSTRAINT fk_mo_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS manufacturing_order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  manufacturing_order_id BIGINT UNSIGNED NOT NULL,
  raw_material_id BIGINT UNSIGNED NOT NULL,
  planned_quantity DECIMAL(14,4) NOT NULL,
  reserved_quantity DECIMAL(14,4) NOT NULL DEFAULT 0,
  actual_quantity DECIMAL(14,4) NULL,
  unit VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_moi_mo FOREIGN KEY (manufacturing_order_id) REFERENCES manufacturing_orders(id),
  CONSTRAINT fk_moi_rm FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS batches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  manufacturing_order_id BIGINT UNSIGNED NULL,
  batch_number VARCHAR(100) NOT NULL UNIQUE,
  manufacturing_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  planned_quantity DECIMAL(14,4) NOT NULL,
  actual_quantity DECIMAL(14,4) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  status ENUM('QUARANTINE','QC_PENDING','RELEASED','REJECTED','EXPIRED','SOLD_OUT') NOT NULL DEFAULT 'QUARANTINE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_batches_expiry (expiry_date),
  KEY idx_batches_status (status),
  CONSTRAINT fk_batch_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_batch_mo FOREIGN KEY (manufacturing_order_id) REFERENCES manufacturing_orders(id),
  CONSTRAINT fk_batch_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS batch_material_consumption (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id BIGINT UNSIGNED NOT NULL,
  raw_material_id BIGINT UNSIGNED NOT NULL,
  raw_material_batch_id BIGINT UNSIGNED NOT NULL,
  planned_quantity DECIMAL(14,4) NOT NULL,
  actual_quantity DECIMAL(14,4) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bmc_batch FOREIGN KEY (batch_id) REFERENCES batches(id),
  CONSTRAINT fk_bmc_rm FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id),
  CONSTRAINT fk_bmc_rmb FOREIGN KEY (raw_material_batch_id) REFERENCES raw_material_batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- INVENTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  raw_material_id BIGINT UNSIGNED NULL,
  raw_material_batch_id BIGINT UNSIGNED NULL,
  product_id BIGINT UNSIGNED NULL,
  batch_id BIGINT UNSIGNED NULL,
  quantity DECIMAL(14,4) NOT NULL DEFAULT 0,
  unit VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_inv_wh (warehouse_id),
  KEY idx_inv_rm (raw_material_id),
  KEY idx_inv_product (product_id),
  CONSTRAINT fk_inv_wh FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  CONSTRAINT fk_inv_rm FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id),
  CONSTRAINT fk_inv_rmb FOREIGN KEY (raw_material_batch_id) REFERENCES raw_material_batches(id),
  CONSTRAINT fk_inv_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_inv_batch FOREIGN KEY (batch_id) REFERENCES batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  transaction_type VARCHAR(50) NOT NULL,
  reference_type VARCHAR(50) NULL,
  reference_id BIGINT UNSIGNED NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  raw_material_id BIGINT UNSIGNED NULL,
  raw_material_batch_id BIGINT UNSIGNED NULL,
  product_id BIGINT UNSIGNED NULL,
  batch_id BIGINT UNSIGNED NULL,
  quantity DECIMAL(14,4) NOT NULL,
  unit_cost DECIMAL(14,4) NULL,
  total_cost DECIMAL(14,2) NULL,
  lot_number VARCHAR(100) NULL,
  supplier_id BIGINT UNSIGNED NULL,
  purchase_order_id BIGINT UNSIGNED NULL,
  purchase_order_item_id BIGINT UNSIGNED NULL,
  transaction_date DATETIME NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_it_type (transaction_type),
  KEY idx_it_date (transaction_date),
  KEY idx_it_po (purchase_order_id),
  CONSTRAINT fk_it_wh FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  CONSTRAINT fk_it_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SALES
-- ============================================================

CREATE TABLE IF NOT EXISTS sales_orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id BIGINT UNSIGNED NOT NULL,
  invoice_date DATE NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  status ENUM('DRAFT','CONFIRMED','DISPATCHED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_so_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_so_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  CONSTRAINT fk_so_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sales_order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sales_order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  batch_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(14,4) NOT NULL,
  unit_price DECIMAL(14,4) NOT NULL,
  total_price DECIMAL(14,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_soi_so FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
  CONSTRAINT fk_soi_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_soi_batch FOREIGN KEY (batch_id) REFERENCES batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- LABORATORY / LIMS
-- ============================================================

CREATE TABLE IF NOT EXISTS samples (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sample_code VARCHAR(50) NOT NULL UNIQUE,
  sample_type VARCHAR(100) NOT NULL,
  product_id BIGINT UNSIGNED NULL,
  batch_id BIGINT UNSIGNED NULL,
  received_date DATE NOT NULL,
  received_by BIGINT UNSIGNED NULL,
  status ENUM('RECEIVED','IN_TESTING','COMPLETED','REJECTED') NOT NULL DEFAULT 'RECEIVED',
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sample_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_sample_batch FOREIGN KEY (batch_id) REFERENCES batches(id),
  CONSTRAINT fk_sample_received_by FOREIGN KEY (received_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sample_tests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sample_id BIGINT UNSIGNED NOT NULL,
  test_name VARCHAR(200) NOT NULL,
  test_method VARCHAR(200) NULL,
  assigned_to BIGINT UNSIGNED NULL,
  test_date DATE NULL,
  status ENUM('PENDING','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_st_sample FOREIGN KEY (sample_id) REFERENCES samples(id),
  CONSTRAINT fk_st_assigned FOREIGN KEY (assigned_to) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS test_results (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sample_test_id BIGINT UNSIGNED NOT NULL,
  parameter VARCHAR(150) NOT NULL,
  result_value VARCHAR(100) NULL,
  unit VARCHAR(50) NULL,
  specification VARCHAR(200) NULL,
  pass_fail ENUM('PASS','FAIL','NA') NOT NULL DEFAULT 'NA',
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tr_st FOREIGN KEY (sample_test_id) REFERENCES sample_tests(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS laboratory_equipment (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  equipment_code VARCHAR(50) NOT NULL UNIQUE,
  equipment_name VARCHAR(200) NOT NULL,
  serial_number VARCHAR(100) NULL,
  location VARCHAR(150) NULL,
  purchase_date DATE NULL,
  status ENUM('ACTIVE','INACTIVE','UNDER_MAINTENANCE','RETIRED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS equipment_calibrations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  equipment_id BIGINT UNSIGNED NOT NULL,
  calibration_date DATE NOT NULL,
  next_calibration_date DATE NOT NULL,
  performed_by VARCHAR(150) NULL,
  result ENUM('PASS','FAIL') NOT NULL DEFAULT 'PASS',
  certificate_number VARCHAR(100) NULL,
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ec_next (next_calibration_date),
  CONSTRAINT fk_ec_equipment FOREIGN KEY (equipment_id) REFERENCES laboratory_equipment(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- QUALITY
-- ============================================================

CREATE TABLE IF NOT EXISTS sops (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sop_number VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT '1.0',
  department VARCHAR(100) NULL,
  effective_date DATE NULL,
  review_date DATE NULL,
  status ENUM('DRAFT','UNDER_REVIEW','APPROVED','OBSOLETE') NOT NULL DEFAULT 'DRAFT',
  description TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sop_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS deviations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  deviation_number VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  department VARCHAR(100) NULL,
  severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  reported_date DATE NOT NULL,
  reported_by BIGINT UNSIGNED NULL,
  root_cause TEXT NULL,
  corrective_action TEXT NULL,
  status ENUM('OPEN','INVESTIGATION','CAPA','CLOSED','CANCELLED') NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dev_reported_by FOREIGN KEY (reported_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS capa (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  capa_number VARCHAR(50) NOT NULL UNIQUE,
  deviation_id BIGINT UNSIGNED NULL,
  type ENUM('CORRECTIVE','PREVENTIVE','BOTH') NOT NULL DEFAULT 'CORRECTIVE',
  description TEXT NOT NULL,
  root_cause TEXT NULL,
  corrective_action TEXT NULL,
  preventive_action TEXT NULL,
  responsible_person VARCHAR(150) NULL,
  due_date DATE NULL,
  completion_date DATE NULL,
  status ENUM('OPEN','IN_PROGRESS','COMPLETED','OVERDUE','CANCELLED') NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_capa_deviation FOREIGN KEY (deviation_id) REFERENCES deviations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  audit_number VARCHAR(50) NOT NULL UNIQUE,
  audit_type VARCHAR(100) NOT NULL,
  department VARCHAR(100) NULL,
  auditor VARCHAR(150) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  status ENUM('PLANNED','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PLANNED',
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_findings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  audit_id BIGINT UNSIGNED NOT NULL,
  finding_title VARCHAR(255) NOT NULL,
  severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  description TEXT NULL,
  action_required TEXT NULL,
  status ENUM('OPEN','IN_PROGRESS','CLOSED') NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_af_audit FOREIGN KEY (audit_id) REFERENCES audits(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS change_controls (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  change_number VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  reason TEXT NULL,
  impact TEXT NULL,
  requested_by BIGINT UNSIGNED NULL,
  approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  implementation_date DATE NULL,
  status ENUM('DRAFT','UNDER_REVIEW','APPROVED','IMPLEMENTED','CLOSED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cc_requested_by FOREIGN KEY (requested_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS training_records (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  training_title VARCHAR(255) NOT NULL,
  trainee_id BIGINT UNSIGNED NULL,
  trainer_name VARCHAR(150) NULL,
  training_date DATE NULL,
  sop_id BIGINT UNSIGNED NULL,
  status ENUM('SCHEDULED','COMPLETED','FAILED','CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tr_trainee FOREIGN KEY (trainee_id) REFERENCES users(id),
  CONSTRAINT fk_tr_sop FOREIGN KEY (sop_id) REFERENCES sops(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- REGULATORY
-- ============================================================

CREATE TABLE IF NOT EXISTS regulatory_submissions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  submission_number VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  authority VARCHAR(150) NULL,
  submission_type VARCHAR(100) NULL,
  product_id BIGINT UNSIGNED NULL,
  submission_date DATE NULL,
  status ENUM('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','WITHDRAWN') NOT NULL DEFAULT 'DRAFT',
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_rs_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_registrations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  registration_number VARCHAR(100) NOT NULL UNIQUE,
  product_id BIGINT UNSIGNED NOT NULL,
  country VARCHAR(100) NOT NULL,
  authority VARCHAR(150) NULL,
  approval_date DATE NULL,
  expiry_date DATE NULL,
  status ENUM('ACTIVE','EXPIRED','SUSPENDED','WITHDRAWN') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_preg_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS licenses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  license_number VARCHAR(100) NOT NULL UNIQUE,
  license_type VARCHAR(100) NOT NULL,
  issued_by VARCHAR(150) NULL,
  issue_date DATE NULL,
  expiry_date DATE NULL,
  status ENUM('ACTIVE','EXPIRED','SUSPENDED','REVOKED') NOT NULL DEFAULT 'ACTIVE',
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS regulatory_documents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  document_code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  document_type VARCHAR(100) NULL,
  product_id BIGINT UNSIGNED NULL,
  version VARCHAR(20) NULL,
  effective_date DATE NULL,
  status ENUM('DRAFT','ACTIVE','OBSOLETE') NOT NULL DEFAULT 'DRAFT',
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_rd_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- CRM
-- ============================================================

CREATE TABLE IF NOT EXISTS hospitals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  hospital_code VARCHAR(50) NOT NULL UNIQUE,
  hospital_name VARCHAR(200) NOT NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(150) NULL,
  address TEXT NULL,
  city VARCHAR(100) NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS doctors (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  doctor_code VARCHAR(50) NOT NULL UNIQUE,
  doctor_name VARCHAR(200) NOT NULL,
  specialization VARCHAR(150) NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(150) NULL,
  hospital_id BIGINT UNSIGNED NULL,
  city VARCHAR(100) NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_doctor_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS medical_representatives (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mr_code VARCHAR(50) NOT NULL UNIQUE,
  mr_name VARCHAR(200) NOT NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(150) NULL,
  territory VARCHAR(150) NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS doctor_visits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  doctor_id BIGINT UNSIGNED NOT NULL,
  medical_representative_id BIGINT UNSIGNED NOT NULL,
  visit_date DATE NOT NULL,
  purpose VARCHAR(255) NULL,
  notes TEXT NULL,
  follow_up_date DATE NULL,
  status ENUM('PLANNED','COMPLETED','CANCELLED','FOLLOW_UP') NOT NULL DEFAULT 'PLANNED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dv_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id),
  CONSTRAINT fk_dv_mr FOREIGN KEY (medical_representative_id) REFERENCES medical_representatives(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SYSTEM / JOBS
-- ============================================================

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

CREATE TABLE IF NOT EXISTS notification_dismissals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  notification_key VARCHAR(191) NOT NULL,
  dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_notification (user_id, notification_key),
  KEY idx_nd_user (user_id),
  CONSTRAINT fk_nd_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

SET FOREIGN_KEY_CHECKS = 1;
