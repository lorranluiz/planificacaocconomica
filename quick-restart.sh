#!/bin/bash

##############################################################################
# PLANECON - Quick Restart (recompilação rápida sem restart completo)
##############################################################################
# Compila apenas as classes alteradas e aciona o restart do DevTools.
# Muito mais rápido que ./mvnw clean package (~2-5s vs ~30-60s).
#
# REQUISITO: O servidor deve estar rodando via ./start-dev.sh
#
# Uso: ./quick-restart.sh
##############################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/home/lorranluiz/planecon"
cd "$PROJECT_DIR"

echo -e "${YELLOW}Compilando classes alteradas...${NC}"

# Compilar apenas (sem refazer o pacote inteiro)
./mvnw compile -DskipTests -q 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Compilação rápida concluída${NC}"
    echo -e "${GREEN}  O DevTools detectará as mudanças e fará restart automático.${NC}"
else
    echo -e "${RED}✗ Erro na compilação${NC}"
    exit 1
fi
