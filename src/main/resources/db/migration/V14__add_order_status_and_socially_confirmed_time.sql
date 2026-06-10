-- V13: Adiciona order_status ao technological_tensor e socially_confirmed_work_time ao instance
ALTER TABLE technological_tensor ADD COLUMN IF NOT EXISTS order_status VARCHAR(50) DEFAULT 'solicitada';
ALTER TABLE instance ADD COLUMN IF NOT EXISTS socially_confirmed_work_time NUMERIC(20,10) DEFAULT 0;
