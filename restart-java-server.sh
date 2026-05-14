#!/bin/bash

# Script para reiniciar o servidor Spring Boot do planecon

echo "Parando todos os processos Java do projeto..."
pkill -f "planecon.*jar" 2>/dev/null
pkill -f "spring-boot:run" 2>/dev/null
sleep 3

echo "Iniciando novo servidor..."
cd /home/lorranluiz/planecon
nohup java -jar target/planecon-0.2.4.1-alpha-SNAPSHOT.jar > spring-boot.log 2>&1 &
NEW_PID=$!

echo "Servidor iniciado com PID: $NEW_PID"
echo "Aguardando inicialização..."

for i in {1..30}; do
    if curl -s http://localhost:8080/actuator/health 2>/dev/null | grep -q "UP"; then
        echo "✅ Servidor está pronto!"
        exit 0
    fi
    echo "Aguardando... ($i/30)"
    sleep 2
done

echo "❌ Servidor demorou muito para iniciar"
exit 1
