-- V8: Adiciona colunas de "Tempo Socialmente Necessário para Produzir 1 Unidade" na tabela workers_proposal
-- para as abas "Capacidade Produtiva em Planejamento" e "Capacidade Produtiva Planificada"
ALTER TABLE workers_proposal ADD COLUMN IF NOT EXISTS planning_socially_necessary_time_per_unit NUMERIC(10,2);
ALTER TABLE workers_proposal ADD COLUMN IF NOT EXISTS planified_socially_necessary_time_per_unit NUMERIC(10,2);
