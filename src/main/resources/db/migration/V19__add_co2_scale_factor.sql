-- V19: Adiciona fator de escala do Plano B no optimization_inputs_results
ALTER TABLE optimization_inputs_results
    ADD COLUMN IF NOT EXISTS co2_scale_factor NUMERIC(20, 10);
