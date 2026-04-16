-- V4: Add production capacity fields for planification calculations
-- total_social_production_capacity: c_total = sum of all monthly production capacity across all committees and materializations
-- total_materialization_capacity: c_total_i = sum of monthly production capacity for a specific materialization

ALTER TABLE instance ADD COLUMN IF NOT EXISTS total_social_production_capacity DECIMAL(38,10);
ALTER TABLE optimization_inputs_results ADD COLUMN IF NOT EXISTS total_materialization_capacity DECIMAL(38,10);
