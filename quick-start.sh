#!/bin/bash

##############################################################################
# PLANECON - Script de Inicialização RÁPIDA (sem recompilar)
##############################################################################
# Inicia os servidores usando o JAR já compilado em target/.
# Use ./start-all-servers.sh quando precisar recompilar o projeto.
#
# Servidores iniciados:
# 1. Servidor Node.js (factorsMap) - Porta 3000
# 2. Servidor Java/Spring Boot - Portas 8080 (HTTP) e 8443 (HTTPS)
#
# Uso: ./quick-start.sh
##############################################################################

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     PLANECON - Inicialização Rápida (sem recompilar)     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Diretório do projeto
PROJECT_DIR="/home/lorranluiz/planecon"
cd "$PROJECT_DIR"

# Verificar se o JAR existe
JAR_FILE=$(ls target/*.jar 2>/dev/null | head -1)
if [ -z "$JAR_FILE" ]; then
    echo -e "${RED}✗ Nenhum JAR encontrado em target/. Execute ./start-all-servers.sh primeiro para compilar.${NC}"
    exit 1
fi
echo -e "${GREEN}   Usando JAR: $JAR_FILE${NC}"
echo ""

##############################################################################
# 1. INICIAR SERVIDOR NODE.JS (FACTORSMAP)
##############################################################################

echo -e "${YELLOW}[1/2] Iniciando servidor Node.js (factorsMap)...${NC}"

if lsof -ti:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Servidor Node.js já está rodando na porta 3000${NC}"
else
    cd "$PROJECT_DIR/factorsMap"
    nohup node server.js > "$PROJECT_DIR/factorsmap-server.log" 2>&1 &
    NODE_PID=$!
    echo $NODE_PID > "$PROJECT_DIR/factorsmap-server.pid"

    echo "   Aguardando servidor inicializar..."
    for i in {1..10}; do
        if lsof -ti:3000 > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Servidor Node.js iniciado (PID: $NODE_PID)${NC}"
            echo -e "${GREEN}  📍 Mapa de Fábricas: http://localhost:3000${NC}"
            break
        fi
        sleep 1
    done

    if ! lsof -ti:3000 > /dev/null 2>&1; then
        echo -e "${RED}✗ Falha ao iniciar servidor Node.js${NC}"
        echo -e "${RED}  Verifique o log em: factorsmap-server.log${NC}"
        exit 1
    fi
fi

echo ""

##############################################################################
# 2. INICIAR SERVIDOR JAVA/SPRING BOOT (SEM RECOMPILAR)
##############################################################################

echo -e "${YELLOW}[2/2] Iniciando servidor Java/Spring Boot...${NC}"

cd "$PROJECT_DIR"

# Matar processos Java existentes
if pgrep -f "planecon.*jar" > /dev/null 2>&1; then
    echo "   Encerrando processo Java anterior..."
    pkill -9 -f "planecon.*jar" 2>/dev/null || true
    sleep 2
fi

echo "   Iniciando servidor Spring Boot..."
nohup java -jar "$JAR_FILE" > "$PROJECT_DIR/spring-boot.log" 2>&1 &
JAVA_PID=$!
echo $JAVA_PID > "$PROJECT_DIR/spring-boot.pid"

# Aguardar inicialização (até 240 segundos para máquinas lentas)
echo "   Aguardando inicialização do Spring Boot..."
SUCCESS=false
for i in {1..240}; do
    if grep -q "Started Application" "$PROJECT_DIR/spring-boot.log" 2>/dev/null; then
        SUCCESS=true
        break
    fi
    # Verificar se o processo ainda está vivo
    if ! kill -0 $JAVA_PID 2>/dev/null; then
        echo ""
        echo -e "${RED}✗ Processo Java encerrou inesperadamente${NC}"
        tail -10 "$PROJECT_DIR/spring-boot.log"
        exit 1
    fi
    echo -n "."
    sleep 1
done
echo ""

if [ "$SUCCESS" = true ]; then
    echo -e "${GREEN}✓ Servidor Spring Boot iniciado (PID: $JAVA_PID)${NC}"
    if lsof -ti:8080 > /dev/null 2>&1; then
        echo -e "${GREEN}  📍 HTTP:  http://localhost:8080${NC}"
    fi
    if lsof -ti:8443 > /dev/null 2>&1; then
        echo -e "${GREEN}  📍 HTTPS: https://localhost:8443${NC}"
    fi
else
    echo -e "${RED}✗ Falha ao iniciar servidor Spring Boot${NC}"
    echo -e "${RED}  Verifique o log em: spring-boot.log${NC}"
    tail -20 "$PROJECT_DIR/spring-boot.log"
    exit 1
fi

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              TODOS OS SERVIDORES INICIADOS               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Servidores ativos:${NC}"
echo -e "${GREEN}  • Mapa de Fábricas:  http://localhost:3000${NC}"
echo -e "${GREEN}  • PlanEcon (HTTP):   http://localhost:8080${NC}"
echo -e "${GREEN}  • PlanEcon (HTTPS):  https://localhost:8443${NC}"
echo ""
echo -e "${YELLOW}Logs disponíveis em:${NC}"
echo -e "  • Node.js:     factorsmap-server.log"
echo -e "  • Spring Boot: spring-boot.log"
echo ""
echo -e "${YELLOW}Para parar os servidores, use:${NC} ./stop-all-servers.sh"
echo ""
echo -e "${YELLOW}Exibindo saída do Spring Boot em tempo real (Ctrl+C para parar de exibir, os servidores continuam rodando):${NC}"
echo ""
tail -f "$PROJECT_DIR/spring-boot.log"
