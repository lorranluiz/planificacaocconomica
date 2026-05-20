CREATE TABLE worker_order (
    id          SERIAL PRIMARY KEY,
    worker_id   INTEGER NOT NULL REFERENCES instance(id),
    order_date  TIMESTAMP NOT NULL DEFAULT NOW(),
    total       NUMERIC(20, 2) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending'
);

CREATE TABLE worker_order_item (
    id                         SERIAL PRIMARY KEY,
    order_id                   INTEGER NOT NULL REFERENCES worker_order(id) ON DELETE CASCADE,
    social_materialization_id  INTEGER NOT NULL,
    product_name               VARCHAR(150) NOT NULL,
    product_type               VARCHAR(20) NOT NULL,
    price                      NUMERIC(20, 2) NOT NULL,
    quantity                   INTEGER NOT NULL DEFAULT 1,
    subtotal                   NUMERIC(20, 2) NOT NULL
);
