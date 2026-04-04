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
echo -e "${BLUE}║         PLANECON - Parando Servidores                    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

PROJECT_DIR="/home/lorranluiz/planecon"
cd "$PROJECT_DIR"

##############################################################################
# 1. PARAR SERVIDOR NODE.JS
##############################################################################

echo -e "${YELLOW}[1/2] Parando servidor Node.js...${NC}"

STOPPED=false

# Tentar pelo PID salvo
if [ -f "$PROJECT_DIR/factorsmap-server.pid" ]; then
    NODE_PID=$(cat "$PROJECT_DIR/factorsmap-server.pid")
    if kill -0 $NODE_PID 2>/dev/null; then
        kill $NODE_PID
        echo -e "${GREEN}✓ Servidor Node.js encerrado (PID: $NODE_PID)${NC}"
        STOPPED=true
    fi
    rm -f "$PROJECT_DIR/factorsmap-server.pid"
fi

# Tentar parar pela porta 3000
PORT_PID=$(lsof -ti:3000 2>/dev/null)
if [ -n "$PORT_PID" ]; then
    kill $PORT_PID 2>/dev/null
    sleep 1
    # Se ainda estiver rodando, forçar
    if kill -0 $PORT_PID 2>/dev/null; then
        kill -9 $PORT_PID 2>/dev/null
    fi
    echo -e "${GREEN}✓ Servidor na porta 3000 encerrado (PID: $PORT_PID)${NC}"
    STOPPED=true
fi

# Tentar matar processos que contenham factorsMap/server.js
if pkill -f "factorsMap.*server\.js" 2>/dev/null; then
    echo -e "${GREEN}✓ Processos factorsMap encerrados${NC}"
    STOPPED=true
fi

if [ "$STOPPED" = false ]; then
    echo -e "${YELLOW}  Nenhum servidor Node.js encontrado${NC}"
fi

##############################################################################
# 2. PARAR SERVIDOR JAVA/SPRING BOOT
##############################################################################

echo -e "${YELLOW}[2/2] Parando servidor Java/Spring Boot...${NC}"

STOPPED=false

# Tentar pelo PID salvo
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
        STOPPED=true
    fi
    rm -f "$PROJECT_DIR/spring-boot.pid"
fi

# Tentar parar pelas portas 8080 e 8443
for PORT in 8080 8443; do
    PORT_PID=$(lsof -ti:$PORT 2>/dev/null)
    if [ -n "$PORT_PID" ]; then
        kill $PORT_PID 2>/dev/null
        sleep 1
        # Se ainda estiver rodando, forçar
        if kill -0 $PORT_PID 2>/dev/null; then
            kill -9 $PORT_PID 2>/dev/null
        fi
        echo -e "${GREEN}✓ Servidor na porta $PORT encerrado (PID: $PORT_PID)${NC}"
        STOPPED=true
    fi
done

# Tentar matar todos os processos Java do projeto
JAVA_PIDS=$(pgrep -f "java.*planecon.*jar")
if [ -n "$JAVA_PIDS" ]; then
    for PID in $JAVA_PIDS; do
        kill $PID 2>/dev/null
        sleep 1
        if kill -0 $PID 2>/dev/null; then
            kill -9 $PID 2>/dev/null
        fi
    done
    echo -e "${GREEN}✓ Processos Java do projeto encerrados${NC}"
    STOPPED=true
fi

if [ "$STOPPED" = false ]; then
    echo -e "${YELLOW}  Nenhum servidor Java encontrado${NC}"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          TODOS OS SERVIDORES FORAM ENCERRADOS            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
