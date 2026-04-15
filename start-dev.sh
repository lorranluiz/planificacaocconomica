#!/bin/bash

##############################################################################
# PLANECON - Iniciar em modo de desenvolvimento (com DevTools hot reload)
##############################################################################
# Inicia o Spring Boot com DevTools ativo. Alterações em código Java
# serão detectadas automaticamente e o servidor reinicia em poucos segundos.
# Alterações em HTML/CSS/JS não precisam de restart (já são servidas do disco).
#
# Uso: ./start-dev.sh
##############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/home/lorranluiz/planecon"
cd "$PROJECT_DIR"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     PLANECON - Modo Desenvolvimento (DevTools)          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Matar processos Java existentes
echo -e "${YELLOW}Encerrando processos Java antigos...${NC}"
pkill -f "planecon.*jar" 2>/dev/null || true
pkill -f "spring-boot:run" 2>/dev/null || true
sleep 2

echo -e "${GREEN}Iniciando Spring Boot com DevTools...${NC}"
echo -e "${YELLOW}  → Alterações em Java: restart automático (~2-5s)${NC}"
echo -e "${YELLOW}  → Alterações em HTML/CSS/JS: basta recarregar o navegador${NC}"
echo ""

# Rodar com spring-boot:run para DevTools funcionar
./mvnw spring-boot:run -Dspring-boot.run.fork=false
