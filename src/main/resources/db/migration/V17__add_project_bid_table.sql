-- V17: Tabela de lances para leilão de projetos
CREATE TABLE IF NOT EXISTS project_bid (
    id SERIAL PRIMARY KEY,
    supply_order_id INTEGER NOT NULL REFERENCES supply_order(id),
    committee_id INTEGER NOT NULL REFERENCES instance(id),
    bid_hours NUMERIC(16,6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(supply_order_id, committee_id)
);
CREATE INDEX IF NOT EXISTS idx_project_bid_order ON project_bid(supply_order_id, bid_hours ASC);
