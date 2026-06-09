-- Migrate JSONB from nested format back to flat format
-- Old nested format: {"quantities": {"5": 2.5}, "supplierChoices": {"5": 12}}
-- New flat format:    {"5": 2.5}
UPDATE instance SET technological_quantities_by_materialization =
    technological_quantities_by_materialization->'quantities'
WHERE technological_quantities_by_materialization ? 'quantities';
