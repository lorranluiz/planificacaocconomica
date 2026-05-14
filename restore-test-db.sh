#!/bin/bash
# =============================================================
# Restaurar banco de dados de teste do Planecon
# =============================================================
# Uso: ./restore-test-db.sh
# Restaura estrutura + dados de teste a partir do dump incluso.
# Apaga tabelas existentes antes de recriar (seguro para reset).
# Se o schema mudar, regenere também schema.sql e planecon_test_db.dump
# antes de distribuir a nova versão do banco.
# =============================================================

set -e

DUMP_FILE="planecon_test_db.dump"

if [[ ! -f "$DUMP_FILE" ]]; then
    echo "Erro: arquivo '$DUMP_FILE' não encontrado no diretório atual."
    echo "Execute este script na raiz do projeto."
    exit 1
fi

read -rp "Usuário do PostgreSQL: " PG_USER
read -rp "Host do PostgreSQL [localhost]: " PG_HOST
PG_HOST="${PG_HOST:-localhost}"
read -rp "Nome do banco de dados [planecon]: " PG_DB
PG_DB="${PG_DB:-planecon}"
read -rsp "Senha do PostgreSQL: " PG_PASS
echo

echo "Restaurando '$DUMP_FILE' no banco '$PG_DB'..."

PGPASSWORD="$PG_PASS" pg_restore -h "$PG_HOST" -U "$PG_USER" -d "$PG_DB" \
    --clean --if-exists --no-owner --no-privileges \
    "$DUMP_FILE"

echo "Banco de dados restaurado com sucesso."
