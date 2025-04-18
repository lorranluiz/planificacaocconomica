-- Adicionar novas colunas à tabela optimization_inputs_results
ALTER TABLE optimization_inputs_results
    ADD COLUMN IF NOT EXISTS workers_to_contract INTEGER,
    ADD COLUMN IF NOT EXISTS current_factories INTEGER,
    ADD COLUMN IF NOT EXISTS needed_factories_to_build INTEGER,
    ADD COLUMN IF NOT EXISTS factory_daily_operating_hours DECIMAL(10,2);

-- Comentários para as novas colunas
COMMENT ON COLUMN optimization_inputs_results.workers_to_contract IS 'Número de trabalhadores que precisam ser contratados';
COMMENT ON COLUMN optimization_inputs_results.current_factories IS 'Número atual de fábricas existentes';
COMMENT ON COLUMN optimization_inputs_results.needed_factories_to_build IS 'Número de fábricas adicionais que precisam ser construídas';
COMMENT ON COLUMN optimization_inputs_results.factory_daily_operating_hours IS 'Horas de operação diária por fábrica';
