-- Migration: Adicionar campos para sincronização Conselho Planificador → Comitê
-- e campo de auditoria de manipulação pós-planificação
-- Data: 2026-04-16

-- 1. Timestamp Unix no Comitê: último valor sincronizado do Conselho Planificador
--    (análogo ao last_council_estimates_synced_at, mas para o Conselho Planificador)
ALTER TABLE instance ADD COLUMN IF NOT EXISTS last_planner_estimates_synced_at BIGINT;

-- 2. Campo de auditoria no Conselho Planificador: indica se o usuário alterou dados
--    após clicar em "Planificar" e antes de "Salvar Alterações".
--    FALSE = dados não foram manipulados após planificação (íntegros)
--    TRUE  = dados foram alterados após planificação (possível distorção)
--    Este campo é para uso de auditoria posterior.
ALTER TABLE instance ADD COLUMN IF NOT EXISTS planification_data_tampered BOOLEAN;

COMMENT ON COLUMN instance.last_planner_estimates_synced_at IS 'Timestamp Unix (segundos) do último valor sincronizado do Conselho Planificador para este comitê';
COMMENT ON COLUMN instance.planification_data_tampered IS 'Auditoria: TRUE se o usuário alterou dados após clicar em Planificar antes de Salvar no Conselho Planificador';
