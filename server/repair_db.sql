-- =================================================================
-- SCRIPT MAESTRO DE REPARACIÓN: BARBEROS PRO v4.0 (v2.2 ESQUEMA)
-- Este script detecta columnas faltantes y las añade sin borrar datos.
-- =================================================================

-- Asegurar base de datos
CREATE DATABASE IF NOT EXISTS BarberOS_One;
USE BarberOS_One;

DELIMITER //

DROP PROCEDURE IF EXISTS RepairDatabase //

CREATE PROCEDURE RepairDatabase()
BEGIN
    -- 1. Reparar Tabla SALES (Fidelidad y Promos)
    IF (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sales' AND column_name = 'points_earned') = 0 THEN
        ALTER TABLE sales ADD COLUMN points_earned INT DEFAULT 0,
                        ADD COLUMN points_used INT DEFAULT 0,
                        ADD COLUMN applied_promotion_id VARCHAR(36);
    END IF;

    -- 2. Reparar Tabla CLIENTS (Fidelidad y Notas)
    IF (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'clients' AND column_name = 'points') = 0 THEN
        ALTER TABLE clients ADD COLUMN points INT DEFAULT 0,
                          ADD COLUMN visits INT DEFAULT 0,
                          ADD COLUMN registration_branch_id VARCHAR(36);
    END IF;

    -- 3. Reparar Tabla APP_CONFIG
    IF (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'app_config' AND column_name = 'loyalty_enabled') = 0 THEN
        ALTER TABLE app_config 
            ADD COLUMN salon_address TEXT,
            ADD COLUMN salon_phone VARCHAR(50),
            ADD COLUMN ticket_footer TEXT,
            ADD COLUMN logo_url LONGTEXT,
            ADD COLUMN webhook_url TEXT,
            ADD COLUMN ticker_message VARCHAR(1000) DEFAULT 'Bienvenidos a BarberOS',
            ADD COLUMN ticker_speed INT DEFAULT 1,
            ADD COLUMN video_source VARCHAR(20) DEFAULT 'youtube',
            ADD COLUMN youtube_video_id VARCHAR(100) DEFAULT '5qap5aO4i9A',
            ADD COLUMN ticket_size VARCHAR(10) DEFAULT '80mm',
            ADD COLUMN loyalty_enabled BOOLEAN DEFAULT TRUE,
            ADD COLUMN loyalty_points_per_visit DECIMAL(10, 2) DEFAULT 1.00,
            ADD COLUMN loyalty_redemption_threshold INT DEFAULT 5,
            ADD COLUMN loyalty_redemption_value DECIMAL(10, 2) DEFAULT 5.00,
            ADD COLUMN loyalty_referral_bonus DECIMAL(10, 2) DEFAULT 2.00;
    END IF;

    -- 4. Reparar Tabla PAYMENTS (Añadir 'points' al ENUM)
    ALTER TABLE payments MODIFY COLUMN method ENUM('cash', 'card', 'transfer', 'bitcoin', 'points') NOT NULL;

    -- 5. Reparar Tabla CATALOG (Costos y Combos)
    IF (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'catalog' AND column_name = 'cost') = 0 THEN
        ALTER TABLE catalog ADD COLUMN cost DECIMAL(10, 2) DEFAULT 0.00,
                          ADD COLUMN combo_definition JSON;
    END IF;

    -- 6. Reparar Tabla BRANCH_STOCK (Costo Promedio)
    IF (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'branch_stock' AND column_name = 'average_cost') = 0 THEN
        ALTER TABLE branch_stock ADD COLUMN average_cost DECIMAL(10, 2) DEFAULT 0.00;
    END IF;

    -- 7. Reparar Tabla BRANCHES (Metas y Webhook)
    IF (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'branches' AND column_name = 'webhook_url') = 0 THEN
        ALTER TABLE branches ADD COLUMN webhook_url TEXT,
                           ADD COLUMN has_reception BOOLEAN DEFAULT TRUE,
                           ADD COLUMN default_monthly_goal DECIMAL(12, 2) DEFAULT 5000.00,
                           ADD COLUMN default_product_goal_percent DECIMAL(5, 2) DEFAULT 10.00,
                           ADD COLUMN default_working_days INT DEFAULT 26,
                           ADD COLUMN report_email VARCHAR(255),
                           ADD COLUMN auto_close_time TIME DEFAULT '22:00:00',
                           ADD COLUMN auto_close_enabled TINYINT(1) DEFAULT 0;
    END IF;

    -- 8. Asegurar que PROMOTIONS existe
    CREATE TABLE IF NOT EXISTS promotions (
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

    -- 9. Asegurar llaves foráneas críticas
    SET FOREIGN_KEY_CHECKS = 0;
    IF (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'sales' AND index_name = 'fk_applied_promotion') = 0 THEN
        ALTER TABLE sales ADD CONSTRAINT fk_applied_promotion FOREIGN KEY (applied_promotion_id) REFERENCES promotions(id) ON DELETE SET NULL;
    END IF;
    SET FOREIGN_KEY_CHECKS = 1;
    
    -- 10. Reparar Tabla CASH_SESSIONS (Totales de cierre)
    IF (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'cash_sessions' AND column_name = 'total_sales') = 0 THEN
        ALTER TABLE cash_sessions 
            ADD COLUMN total_sales DECIMAL(12, 2) DEFAULT 0.00,
            ADD COLUMN total_cash DECIMAL(12, 2) DEFAULT 0.00,
            ADD COLUMN total_card DECIMAL(12, 2) DEFAULT 0.00,
            ADD COLUMN total_transfer DECIMAL(12, 2) DEFAULT 0.00,
            ADD COLUMN total_bitcoin DECIMAL(12, 2) DEFAULT 0.00,
            ADD COLUMN services_total DECIMAL(12, 2) DEFAULT 0.00,
            ADD COLUMN products_total DECIMAL(12, 2) DEFAULT 0.00,
            ADD COLUMN combos_total DECIMAL(12, 2) DEFAULT 0.00,
            ADD COLUMN operations_count INT DEFAULT 0;
    END IF;

END //

DELIMITER ;

-- Ejecutar la reparación
CALL RepairDatabase();

-- Limpiar
DROP PROCEDURE IF EXISTS RepairDatabase;
 stone
