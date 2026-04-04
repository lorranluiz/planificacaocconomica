#!/bin/bash

##############################################################################
# PLANECON - Script para Parar Todos os Servidores
##############################################################################
# Este script encerra todos os servidores do projeto de forma segura.
#
# Uso: ./stop-all-servers.sh
##############################################################################

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         PLANECON - Parando Servidores                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

PROJECT_DIR="/home/lorranluiz/planecon"
cd "$PROJECT_DIR"

##############################################################################
# 1. PARAR SERVIDOR NODE.JS
##############################################################################

echo -e "${YELLOW}[1/2] Parando servidor Node.js...${NC}"

if [ -f "$PROJECT_DIR/factorsmap-server.pid" ]; then
    NODE_PID=$(cat "$PROJECT_DIR/factorsmap-server.pid")
    if kill -0 $NODE_PID 2>/dev/null; then
        kill $NODE_PID
        echo -e "${GREEN}✓ Servidor Node.js encerrado (PID: $NODE_PID)${NC}"
    else
        echo -e "${YELLOW}  Processo já não está rodando${NC}"
    fi
    rm -f "$PROJECT_DIR/factorsmap-server.pid"
else
    # Tentar matar por nome do processo
    if pkill -f "node.*factorsMap/server.js"; then
        echo -e "${GREEN}✓ Servidor Node.js encerrado${NC}"
    else
        echo -e "${YELLOW}  Nenhum servidor Node.js encontrado${NC}"
    fi
fi

##############################################################################
# 2. PARAR SERVIDOR JAVA/SPRING BOOT
##############################################################################

echo -e "${YELLOW}[2/2] Parando servidor Java/Spring Boot...${NC}"

if [ -f "$PROJECT_DIR/spring-boot.pid" ]; then
    JAVA_PID=$(cat "$PROJECT_DIR/spring-boot.pid")
    if kill -0 $JAVA_PID 2>/dev/null; then
        kill $JAVA_PID
        sleep 2
        # Se ainda estiver rodando, forçar
        if kill -0 $JAVA_PID 2>/dev/null; then
            kill -9 $JAVA_PID
        fi
        echo -e "${GREEN}✓ Servidor Spring Boot encerrado (PID: $JAVA_PID)${NC}"
    else
        echo -e "${YELLOW}  Processo já não está rodando${NC}"
    fi
    rm -f "$PROJECT_DIR/spring-boot.pid"
else
    # Tentar matar todos os processos Java
    if pkill -9 java 2>/dev/null; then
        echo -e "${GREEN}✓ Processos Java encerrados${NC}"
    else
        echo -e "${YELLOW}  Nenhum processo Java encontrado${NC}"
    fi
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          TODOS OS SERVIDORES FORAM ENCERRADOS           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
