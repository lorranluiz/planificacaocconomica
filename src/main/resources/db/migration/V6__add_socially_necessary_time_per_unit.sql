-- Adiciona o campo para Tempo Socialmente Necessário para Produzir Uma Unidade
ALTER TABLE optimization_inputs_results ADD COLUMN IF NOT EXISTS socially_necessary_time_per_unit NUMERIC(10,2);

COMMENT ON COLUMN optimization_inputs_results.socially_necessary_time_per_unit IS 'Tempo Socialmente Necessário para Produzir Uma Unidade';
