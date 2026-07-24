-- Añadir campo report_email a la tabla branches
-- Ejecutar en el VPS

ALTER TABLE branches ADD COLUMN IF NOT EXISTS report_email VARCHAR(255) DEFAULT NULL;
