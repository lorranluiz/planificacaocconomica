#!/bin/bash
cd /home/lorranluiz/planecon
echo "Matando processos Java existentes..."
pkill -9 java
sleep 3

echo "Limpando target..."
rm -rf target/

echo "Compilando projeto..."
./mvnw clean package -DskipTests -q

if [ $? -eq 0 ]; then
    echo "Compilação bem-sucedida! Iniciando servidor..."
    java -jar target/*.jar
else
    echo "Erro na compilação!"
    exit 1
fi
