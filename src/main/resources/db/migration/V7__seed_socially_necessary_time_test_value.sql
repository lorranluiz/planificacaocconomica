-- V7: Alimentar coluna socially_necessary_time_per_unit com valor de teste padrão
-- Aplica o valor 20 em todas as linhas onde a coluna ainda está NULL

UPDATE optimization_inputs_results
SET socially_necessary_time_per_unit = 20
WHERE socially_necessary_time_per_unit IS NULL;
