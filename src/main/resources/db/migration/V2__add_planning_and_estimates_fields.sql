-- Migration: Adicionar campos para abas de planejamento/planificado e timestamps de estimativas
-- Data: 2026-04-16

-- 1. Timestamp Unix na instância do Conselho Popular: quando "Calcular Estimativas" + "Salvar Alterações" foi concluído
ALTER TABLE instance ADD COLUMN IF NOT EXISTS last_estimates_saved_at BIGINT;

-- 2. Timestamp Unix na instância do Comitê: último valor sincronizado do conselho pai
ALTER TABLE instance ADD COLUMN IF NOT EXISTS last_council_estimates_synced_at BIGINT;

-- 3. Campos de "Capacidade Produtiva em Planejamento" na tabela workers_proposal
ALTER TABLE workers_proposal ADD COLUMN IF NOT EXISTS planning_worker_limit INTEGER;
ALTER TABLE workers_proposal ADD COLUMN IF NOT EXISTS planning_worker_hours NUMERIC(10,2);
ALTER TABLE workers_proposal ADD COLUMN IF NOT EXISTS planning_production_time NUMERIC(10,2);
ALTER TABLE workers_proposal ADD COLUMN IF NOT EXISTS planning_night_shift BOOLEAN;
ALTER TABLE workers_proposal ADD COLUMN IF NOT EXISTS planning_weekly_scale INTEGER;

-- 4. Campos de "Capacidade Produtiva Planificada" na tabela workers_proposal
ALTER TABLE workers_proposal ADD COLUMN IF NOT EXISTS planified_worker_limit INTEGER;
ALTER TABLE workers_proposal ADD COLUMN IF NOT EXISTS planified_worker_hours NUMERIC(10,2);
ALTER TABLE workers_proposal ADD COLUMN IF NOT EXISTS planified_production_time NUMERIC(10,2);
ALTER TABLE workers_proposal ADD COLUMN IF NOT EXISTS planified_night_shift BOOLEAN;
ALTER TABLE workers_proposal ADD COLUMN IF NOT EXISTS planified_weekly_scale INTEGER;

-- Comentários
COMMENT ON COLUMN instance.last_estimates_saved_at IS 'Timestamp Unix (segundos) de quando o Conselho Popular completou Calcular Estimativas + Salvar Alterações';
COMMENT ON COLUMN instance.last_council_estimates_synced_at IS 'Timestamp Unix (segundos) do último valor sincronizado do conselho pai para este comitê';

COMMENT ON COLUMN workers_proposal.planning_worker_limit IS 'Limite de trabalhadores - aba Capacidade Produtiva em Planejamento';
COMMENT ON COLUMN workers_proposal.planning_worker_hours IS 'Carga horária diária - aba Capacidade Produtiva em Planejamento';
COMMENT ON COLUMN workers_proposal.planning_production_time IS 'Tempo para produzir 1 unidade - aba Capacidade Produtiva em Planejamento';
COMMENT ON COLUMN workers_proposal.planning_night_shift IS 'Turno noturno - aba Capacidade Produtiva em Planejamento';
COMMENT ON COLUMN workers_proposal.planning_weekly_scale IS 'Escala semanal - aba Capacidade Produtiva em Planejamento';

COMMENT ON COLUMN workers_proposal.planified_worker_limit IS 'Limite de trabalhadores - aba Capacidade Produtiva Planificada';
COMMENT ON COLUMN workers_proposal.planified_worker_hours IS 'Carga horária diária - aba Capacidade Produtiva Planificada';
COMMENT ON COLUMN workers_proposal.planified_production_time IS 'Tempo para produzir 1 unidade - aba Capacidade Produtiva Planificada';
COMMENT ON COLUMN workers_proposal.planified_night_shift IS 'Turno noturno - aba Capacidade Produtiva Planificada';
COMMENT ON COLUMN workers_proposal.planified_weekly_scale IS 'Escala semanal - aba Capacidade Produtiva Planificada';
