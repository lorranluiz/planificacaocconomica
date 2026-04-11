#!/bin/bash
cd /home/lorranluiz/planecon

# Verificar conselhos no banco
echo "Verificando conselhos no banco de dados..." > /tmp/council_check.txt
PGPASSWORD=planecon123 psql -h localhost -U postgres -d planecon -t -A -c "SELECT COUNT(*) FROM instance WHERE type = 'POPULARCOUNCIL' AND committee_name IS NOT NULL;" >> /tmp/council_check.txt 2>&1
echo "---" >> /tmp/council_check.txt

# Fazer requisição à API
echo "Fazendo requisição à API..." >> /tmp/council_check.txt
curl -s "http://localhost:8080/api/committees/1/state" | grep -E "(councilId|councilName)" >> /tmp/council_check.txt 2>&1
echo "---" >> /tmp/council_check.txt

# Ver logs do servidor
echo "Logs do servidor:" >> /tmp/council_check.txt
tail -30 /home/lorranluiz/planecon/server.log | grep -i "conselho\|council" >> /tmp/council_check.txt 2>&1

cat /tmp/council_check.txt
