-- V16: Adiciona campos para Orçamento Público, Arrecadação e Projetos

-- Permitir tipo PROJECT na social_materialization
ALTER TABLE social_materialization DROP CONSTRAINT IF EXISTS social_materialization_type_check;
ALTER TABLE social_materialization ADD CONSTRAINT social_materialization_type_check
    CHECK (type IN ('PRODUCT', 'SERVICE', 'PROJECT'));

-- Nova coluna validity_deadline na social_materialization (Validade para Serviços, Prazo para Projetos)
ALTER TABLE social_materialization ADD COLUMN IF NOT EXISTS validity_deadline NUMERIC(16,6);

-- Campos de arrecadação na instance (para Conselhos Populares e superiores)
ALTER TABLE instance ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 50;
ALTER TABLE instance ADD COLUMN IF NOT EXISTS balance NUMERIC(20,10) DEFAULT 0;

-- Tabela de transações do conselho (extrato)
CREATE TABLE IF NOT EXISTS council_transaction (
    id SERIAL PRIMARY KEY,
    council_id INTEGER NOT NULL REFERENCES instance(id),
    amount NUMERIC(20,10) NOT NULL,
    transaction_type VARCHAR(10) NOT NULL,
    description TEXT,
    source_name VARCHAR(255),
    balance_after NUMERIC(20,10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_council_transaction_council_date
    ON council_transaction(council_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_council_transaction_council_type
    ON council_transaction(council_id, transaction_type);
