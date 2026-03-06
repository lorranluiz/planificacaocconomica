-- Migration para suporte a cidades e CNPJ de fábricas
-- Data: 2026-03-04

-- 1. Adicionar campo city_code na tabela instance para armazenar código IBGE
ALTER TABLE instance ADD COLUMN IF NOT EXISTS city_code VARCHAR(10);

-- 2. Adicionar campo cnpj na tabela instance para identificar fábricas
ALTER TABLE instance ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);

-- 3. Criar índice no CNPJ para busca rápida
CREATE INDEX IF NOT EXISTS idx_instance_cnpj ON instance(cnpj);

-- 4. Criar índice no city_code para busca rápida
CREATE INDEX IF NOT EXISTS idx_instance_city_code ON instance(city_code);

-- 5. Criar tabela city para armazenar dados de cidades
CREATE TABLE IF NOT EXISTS city (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Criar índice no nome da cidade para busca
CREATE INDEX IF NOT EXISTS idx_city_name ON city(name);

-- 7. Comentários nas tabelas e colunas
COMMENT ON TABLE city IS 'Tabela de cidades com códigos IBGE';
COMMENT ON COLUMN city.code IS 'Código IBGE da cidade';
COMMENT ON COLUMN city.name IS 'Nome da cidade';
COMMENT ON COLUMN city.state IS 'Estado (UF)';

COMMENT ON COLUMN instance.city_code IS 'Código IBGE da cidade onde está localizada a instância';
COMMENT ON COLUMN instance.cnpj IS 'CNPJ da fábrica/empresa (quando aplicável)';
