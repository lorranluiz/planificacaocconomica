#!/bin/bash

##############################################################################
# PLANECON - Script de Inicialização de Todos os Servidores
##############################################################################
# Este é o script PRINCIPAL para iniciar todos os servidores do projeto.
# 
# Servidores iniciados:
# 1. Servidor Node.js (factorsMap) - Porta 3000
# 2. Servidor Java/Spring Boot - Portas 8080 (HTTP) e 8443 (HTTPS)
#
# Uso: ./start-all-servers.sh
##############################################################################

set -e  # Sair em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         PLANECON - Iniciando Servidores                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Diretório do projeto
PROJECT_DIR="/home/lorranluiz/planecon"
cd "$PROJECT_DIR"

##############################################################################
# 1. INICIAR SERVIDOR NODE.JS (FACTORSMAP)
##############################################################################

echo -e "${YELLOW}[1/2] Iniciando servidor Node.js (factorsMap)...${NC}"

# Verificar se já está rodando
if pgrep -f "node.*factorsMap/server.js" > /dev/null; then
    echo -e "${GREEN}✓ Servidor Node.js já está rodando${NC}"
else
    cd "$PROJECT_DIR/factorsMap"
    nohup node server.js > "$PROJECT_DIR/factorsmap-server.log" 2>&1 &
    NODE_PID=$!
    echo $NODE_PID > "$PROJECT_DIR/factorsmap-server.pid"
    sleep 2
    
    if pgrep -f "node.*factorsMap/server.js" > /dev/null; then
        echo -e "${GREEN}✓ Servidor Node.js iniciado (PID: $NODE_PID)${NC}"
        echo -e "${GREEN}  📍 Mapa de Fábricas: http://localhost:3000${NC}"
    else
        echo -e "${RED}✗ Falha ao iniciar servidor Node.js${NC}"
        exit 1
    fi
fi

echo ""

##############################################################################
# 2. COMPILAR E INICIAR SERVIDOR JAVA/SPRING BOOT
##############################################################################

echo -e "${YELLOW}[2/2] Compilando e iniciando servidor Java/Spring Boot...${NC}"

cd "$PROJECT_DIR"

# Matar processos Java existentes
echo "   Encerrando processos Java antigos..."
pkill -9 java 2>/dev/null || true
sleep 2

# Limpar target
echo "   Limpando diretório target..."
rm -rf target/

# Compilar projeto
echo "   Compilando projeto Maven..."
./mvnw clean package -DskipTests -q

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✓ Compilação bem-sucedida${NC}"
    echo ""
    echo "   Iniciando servidor Spring Boot..."
    nohup java -jar target/*.jar > "$PROJECT_DIR/spring-boot.log" 2>&1 &
    JAVA_PID=$!
    echo $JAVA_PID > "$PROJECT_DIR/spring-boot.pid"
    
    # Aguardar inicialização (30 segundos)
    echo "   Aguardando inicialização do Spring Boot..."
    for i in {1..30}; do
        if grep -q "Started Application" "$PROJECT_DIR/spring-boot.log" 2>/dev/null; then
            break
        fi
        echo -n "."
        sleep 1
    done
    echo ""
    
    if pgrep -p $JAVA_PID > /dev/null; then
        echo -e "${GREEN}✓ Servidor Spring Boot iniciado (PID: $JAVA_PID)${NC}"
        echo -e "${GREEN}  📍 HTTP:  http://localhost:8080${NC}"
        echo -e "${GREEN}  📍 HTTPS: https://localhost:8443${NC}"
    else
        echo -e "${RED}✗ Falha ao iniciar servidor Spring Boot${NC}"
        echo -e "${RED}  Verifique o log em: spring-boot.log${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Erro na compilação!${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              TODOS OS SERVIDORES INICIADOS              ║${NC}"
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
