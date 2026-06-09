ALTER TABLE technological_tensor ADD COLUMN IF NOT EXISTS supplier_instance_id INTEGER;

ALTER TABLE technological_tensor ADD CONSTRAINT fk_tensor_supplier_instance
    FOREIGN KEY (supplier_instance_id) REFERENCES instance(id);

CREATE INDEX IF NOT EXISTS idx_tensor_supplier_instance ON technological_tensor(supplier_instance_id);
