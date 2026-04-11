#!/bin/bash
OUTPUT_FILE="/tmp/planecon_rebuild.log"
> $OUTPUT_FILE

echo "=== Parando servidor ===" >> $OUTPUT_FILE
sudo pkill -9 -f "planecon.*jar" >> $OUTPUT_FILE 2>&1
sleep 3

echo "=== Compilando projeto ===" >> $OUTPUT_FILE
cd /home/lorranluiz/planecon
sudo mvn package -DskipTests >> $OUTPUT_FILE 2>&1
compile_result=$?

if [ $compile_result -eq 0 ]; then
    echo "=== Compilação OK ===" >> $OUTPUT_FILE
    
    echo "=== Iniciando servidor ===" >> $OUTPUT_FILE
    sudo nohup java -jar target/planecon-0.2.4.1-alpha-SNAPSHOT.jar > server.log 2>&1 &
    SERVER_PID=$!
    echo "Servidor iniciado com PID: $SERVER_PID" >> $OUTPUT_FILE
    
    echo "=== Aguardando servidor iniciar ===" >> $OUTPUT_FILE
    sleep 30
    
    echo "=== Testando servidor ===" >> $OUTPUT_FILE
    curl -s http://localhost:8080/actuator/health >> $OUTPUT_FILE 2>&1
    
    echo "" >> $OUTPUT_FILE
    echo "=== Corrigindo nomes dos conselhos ===" >> $OUTPUT_FILE
    curl -X POST -s http://localhost:8080/api/council/admin/fix-council-names >> $OUTPUT_FILE 2>&1
    
    echo "" >> $OUTPUT_FILE
    echo "=== Testando um comitê ===" >> $OUTPUT_FILE
    curl -s "http://localhost:8080/api/committees/1/state" | grep -E "(\"councilId\"|\"councilName\")" >> $OUTPUT_FILE 2>&1
else
    echo "=== Compilação FALHOU ===" >> $OUTPUT_FILE
fi

echo "" >> $OUTPUT_FILE
echo "=== CONCLUÍDO ===" >> $OUTPUT_FILE
