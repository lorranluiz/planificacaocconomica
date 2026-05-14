-- V5: Unidades de medida e grandeza padrao para materializacoes sociais

CREATE TABLE IF NOT EXISTS measurement_unit (
    id SERIAL PRIMARY KEY,
    name VARCHAR(30) NOT NULL UNIQUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT INTO measurement_unit (name)
VALUES
    ('kg'),
    ('L'),
    ('m'),
    ('h'),
    ('m²'),
    ('unidade')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE social_materialization
    ADD COLUMN IF NOT EXISTS id_measurement_unit INTEGER;

ALTER TABLE social_materialization
    ADD COLUMN IF NOT EXISTS standard_quantity_per_unit NUMERIC(16,6);

UPDATE social_materialization sm
SET id_measurement_unit = mu.id
FROM measurement_unit mu
WHERE mu.name = 'unidade'
  AND sm.id_measurement_unit IS NULL;

UPDATE social_materialization
SET standard_quantity_per_unit = 1
WHERE standard_quantity_per_unit IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_social_materialization_measurement_unit'
    ) THEN
        ALTER TABLE social_materialization
            ADD CONSTRAINT fk_social_materialization_measurement_unit
            FOREIGN KEY (id_measurement_unit)
            REFERENCES measurement_unit(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

ALTER TABLE social_materialization
    ALTER COLUMN id_measurement_unit SET NOT NULL;

ALTER TABLE social_materialization
    ALTER COLUMN standard_quantity_per_unit SET NOT NULL;

COMMENT ON COLUMN social_materialization.standard_quantity_per_unit IS 'Quantidade padrao correspondente a 1 unidade de medida da materializacao';
COMMENT ON COLUMN social_materialization.id_measurement_unit IS 'Unidade de medida padrao da materializacao (fk para measurement_unit)';
