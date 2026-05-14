#!/bin/bash
# =============================================================
# Atualizar backup do banco de dados de teste do Planecon
# =============================================================
# Uso: ./update-test-db.sh
# Gera um novo dump comprimido a partir do estado atual do banco,
# sobrescrevendo o arquivo anterior.
# Depois de mudanças estruturais no banco, também regenere schema.sql
# e qualquer snapshot auxiliar de schema antes de publicar a atualização.
# =============================================================

set -e

DUMP_FILE="planecon_test_db.dump"

read -rp "Usuário do PostgreSQL: " PG_USER
read -rp "Host do PostgreSQL [localhost]: " PG_HOST
PG_HOST="${PG_HOST:-localhost}"
read -rp "Nome do banco de dados [planecon]: " PG_DB
PG_DB="${PG_DB:-planecon}"
read -rsp "Senha do PostgreSQL: " PG_PASS
echo

echo "Gerando dump do banco '$PG_DB'..."

PGPASSWORD="$PG_PASS" pg_dump -h "$PG_HOST" -U "$PG_USER" -d "$PG_DB" \
    --format=custom --compress=9 \
    -f "$DUMP_FILE"

echo "Backup atualizado: $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"
