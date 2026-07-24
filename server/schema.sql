-- =================================================================
-- ESQUEMA DE BASE DE DATOS COMPLETO: BARBEROS PRO v4.0
-- Versión: 2.2 (Producción - FULL STRUCTURE)
-- =================================================================

-- 1. LIMPIEZA TOTAL
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS cash_sessions; 
DROP TABLE IF EXISTS inventory_movements;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS sale_items;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS branch_stock;
DROP TABLE IF EXISTS catalog;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS monthly_plans;
DROP TABLE IF EXISTS video_playlist;
DROP TABLE IF EXISTS app_config;
DROP TABLE IF EXISTS promotions;
SET FOREIGN_KEY_CHECKS = 1;

-- 2. CONFIGURACIÓN Y MAESTROS

CREATE TABLE app_config (
    id INT PRIMARY KEY DEFAULT 1,
    salon_name VARCHAR(255) DEFAULT 'BarberOS Pro',
    salon_address TEXT,
    salon_phone VARCHAR(50),
    ticket_footer TEXT,
    logo_url LONGTEXT,
    webhook_url TEXT,
    ticker_message VARCHAR(1000) DEFAULT 'Bienvenidos a la mejor experiencia en Barbería.',
    ticker_speed INT DEFAULT 1,
    video_source VARCHAR(20) DEFAULT 'youtube',
    youtube_video_id VARCHAR(100) DEFAULT '5qap5aO4i9A',
    ticket_size VARCHAR(10) DEFAULT '80mm',
    loyalty_enabled BOOLEAN DEFAULT TRUE,
    loyalty_points_per_visit DECIMAL(10, 2) DEFAULT 1.00,
    loyalty_redemption_threshold INT DEFAULT 5,
    loyalty_redemption_value DECIMAL(10, 2) DEFAULT 5.00,
    loyalty_referral_bonus DECIMAL(10, 2) DEFAULT 2.00
);

CREATE TABLE categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE branches (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    webhook_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    has_reception BOOLEAN DEFAULT TRUE,
    default_monthly_goal DECIMAL(12, 2) DEFAULT 5000.00,
    default_product_goal_percent DECIMAL(5, 2) DEFAULT 10.00,
    default_working_days INT DEFAULT 26,
    report_email VARCHAR(255),
    auto_close_time TIME DEFAULT '22:00:00',
    auto_close_enabled TINYINT(1) DEFAULT 0
);

CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE,
    role ENUM('admin', 'reception', 'barber', 'display', 'cashier') NOT NULL,
    pin VARCHAR(20) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    branch_id VARCHAR(36),
    can_do_pos BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

CREATE TABLE monthly_plans (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL,
    month INT NOT NULL, 
    year INT NOT NULL,
    goal DECIMAL(12, 2) NOT NULL,
    product_goal_percent DECIMAL(5, 2) DEFAULT 10.00,
    working_days INT DEFAULT 26,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    UNIQUE(branch_id, month, year)
);

CREATE TABLE video_playlist (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    type ENUM('file', 'link') DEFAULT 'link',
    sort_order INT DEFAULT 0
);

CREATE TABLE promotions (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('percentage', 'fixed_discount') NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    trigger_type ENUM('always', 'days_of_week', 'happy_hour', 'birthday', 'date_range') NOT NULL,
    days_active JSON, 
    hour_start TIME,
    hour_end TIME,
    start_date DATE,
    end_date DATE,
    apply_to ENUM('all', 'services', 'products', 'specific') DEFAULT 'all',
    specific_item_id VARCHAR(36),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clients (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    visits INT DEFAULT 0,
    points INT DEFAULT 0,
    birth_date DATE,
    referred_by VARCHAR(36),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    registration_branch_id VARCHAR(36),
    FOREIGN KEY (referred_by) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (registration_branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

CREATE TABLE catalog (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('service', 'product', 'combo') NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category_id VARCHAR(36),
    active BOOLEAN DEFAULT TRUE,
    cost DECIMAL(10, 2) DEFAULT 0.00,
    combo_definition JSON,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE branch_stock (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL,
    item_id VARCHAR(36) NOT NULL,
    stock INT DEFAULT 0,
    average_cost DECIMAL(10, 2) DEFAULT 0.00,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES catalog(id) ON DELETE CASCADE,
    UNIQUE(branch_id, item_id)
);

-- 3. OPERACIONES

CREATE TABLE tickets (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL,
    sequence_number INT NOT NULL,
    full_code VARCHAR(20) NOT NULL,
    type ENUM('C', 'B', 'D', 'X') NOT NULL,
    client_name VARCHAR(255),
    client_id VARCHAR(36),
    status ENUM('waiting', 'serving', 'completed', 'cancelled') DEFAULT 'waiting',
    barber_id VARCHAR(36),
    chair VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (barber_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE sales (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL,
    ticket_id VARCHAR(36),
    client_id VARCHAR(36),
    barber_id VARCHAR(36),
    subtotal DECIMAL(12, 2) NOT NULL,
    discount DECIMAL(12, 2) DEFAULT 0.00,
    total DECIMAL(12, 2) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    points_earned INT DEFAULT 0,
    points_used INT DEFAULT 0,
    applied_promotion_id VARCHAR(36),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (barber_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (applied_promotion_id) REFERENCES promotions(id) ON DELETE SET NULL
);

CREATE TABLE sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id VARCHAR(36) NOT NULL,
    item_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id VARCHAR(36) NOT NULL,
    method ENUM('cash', 'card', 'transfer', 'bitcoin', 'points') NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

CREATE TABLE inventory_movements (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL,
    item_id VARCHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    unit_cost DECIMAL(10, 2),
    previous_stock INT,
    new_stock INT,
    reason TEXT,
    related_branch_id VARCHAR(36),
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'completed') DEFAULT 'completed',
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (item_id) REFERENCES catalog(id)
);

CREATE TABLE cash_sessions (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL,
    opening_amount DECIMAL(12, 2) DEFAULT 0.00,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    opened_by VARCHAR(36),
    total_sales DECIMAL(12, 2) DEFAULT 0.00,
    total_cash DECIMAL(12, 2) DEFAULT 0.00,
    total_card DECIMAL(12, 2) DEFAULT 0.00,
    total_transfer DECIMAL(12, 2) DEFAULT 0.00,
    total_bitcoin DECIMAL(12, 2) DEFAULT 0.00,
    services_total DECIMAL(12, 2) DEFAULT 0.00,
    products_total DECIMAL(12, 2) DEFAULT 0.00,
    combos_total DECIMAL(12, 2) DEFAULT 0.00,
    operations_count INT DEFAULT 0,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (opened_by) REFERENCES users(id)
);

CREATE TABLE appointments (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50),
    date DATE NOT NULL,
    time TIME NOT NULL,
    barber_id VARCHAR(36),
    service_type VARCHAR(100),
    status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (barber_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. DATOS SEMILLA DE PRODUCCIÓN

INSERT INTO app_config (id, salon_name, ticker_message) VALUES (1, 'MI BARBERIA PRO', 'Bienvenidos a la nueva era de la gestión.');

INSERT INTO categories (id, name) VALUES ('c1', 'SERVICIOS'), ('c2', 'PRODUCTOS'), ('c3', 'COMBOS');

INSERT INTO branches (id, name, active, has_reception) VALUES ('b_main', 'SUCURSAL CENTRAL', TRUE, TRUE);

-- SUPER ADMIN INICIAL
-- PIN: 123456
INSERT INTO users (id, name, username, role, pin, active, branch_id, can_do_pos) VALUES 
('u_admin', 'SUPER ADMINISTRADOR', 'admin', 'admin', '123456', TRUE, NULL, TRUE);
