-- V18: Adiciona campos de emissão de CO2 ao modelo LP-IO
-- social_materialization: fator de emissão de CO2 por unidade padrão
ALTER TABLE social_materialization
    ADD COLUMN IF NOT EXISTS co2_emission_factor NUMERIC(12, 6);

-- instance: teto máximo de emissão de CO2 para a jurisdição (apenas PLANNERCOUNCIL)
ALTER TABLE instance
    ADD COLUMN IF NOT EXISTS co2_emission_limit NUMERIC(38, 6);

-- optimization_inputs_results: alocação de CO2 por materialização e preço-sombra
ALTER TABLE optimization_inputs_results
    ADD COLUMN IF NOT EXISTS co2_allocated NUMERIC(38, 6);

ALTER TABLE optimization_inputs_results
    ADD COLUMN IF NOT EXISTS co2_shadow_price NUMERIC(20, 10);
