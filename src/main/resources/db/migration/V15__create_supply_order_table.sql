-- V15: Cria tabela supply_order para múltiplas encomendas por insumo
CREATE TABLE supply_order (
    id SERIAL PRIMARY KEY,
    ordering_instance_id INTEGER NOT NULL REFERENCES instance(id),
    input_materialization_id INTEGER NOT NULL REFERENCES social_materialization(id),
    output_materialization_id INTEGER NOT NULL REFERENCES social_materialization(id),
    supplier_instance_id INTEGER REFERENCES instance(id),
    quantity NUMERIC(16,6) NOT NULL DEFAULT 0,
    order_status VARCHAR(50) DEFAULT 'solicitada',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supply_order_ordering ON supply_order(ordering_instance_id, input_materialization_id);
CREATE INDEX idx_supply_order_supplier ON supply_order(supplier_instance_id);

-- Migrar encomendas existentes do technological_tensor para supply_order
INSERT INTO supply_order (ordering_instance_id, input_materialization_id, output_materialization_id, supplier_instance_id, quantity, order_status, created_at)
SELECT tt.id_instance, tt.id_production_input, tt.id_social_materialization, tt.supplier_instance_id, 0, COALESCE(tt.order_status, 'solicitada'), CURRENT_TIMESTAMP
FROM technological_tensor tt
WHERE tt.supplier_instance_id IS NOT NULL;
