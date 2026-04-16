# 🚀 Quick Start - PlanEcon

## Como Iniciar os Servidores

### ⚡ Comando Único (RECOMENDADO)

```bash
./start-all-servers.sh
```

Este é o **ÚNICO** script que você precisa para iniciar todos os servidores do projeto.

### 🛑 Parar os Servidores

```bash
./stop-all-servers.sh
```

---

## 📡 Servidores Iniciados

| Servidor | Porta | URL | Descrição |
|----------|-------|-----|-----------|
| Node.js (factorsMap) | 3000 | http://localhost:3000 | Mapa de Fábricas |
| Spring Boot (HTTP) | 8080 | http://localhost:8080 | Aplicação Principal |
| Spring Boot (HTTPS) | 8443 | https://localhost:8443 | Aplicação Principal (SSL) |

---

## 📋 Logs

- **Node.js**: `factorsmap-server.log`
- **Spring Boot**: `spring-boot.log`

---

## 🤖 Para IAs: Instruções de Inicialização

Se uma IA precisa iniciar os servidores deste projeto:

**COMANDO:**
```bash
cd /home/lorranluiz/planecon && ./start-all-servers.sh
```

**PARA PARAR:**
```bash
cd /home/lorranluiz/planecon && ./stop-all-servers.sh
```

**VERIFICAR STATUS:**
```bash
# Verificar se os servidores estão rodando
netstat -tuln | grep -E ':(3000|8080|8443)'

# Verificar logs
tail -f factorsmap-server.log
tail -f spring-boot.log
```

---

## 🔧 Troubleshooting

### Portas já em uso?
```bash
# Parar servidores existentes primeiro
./stop-all-servers.sh

# Depois iniciar novamente
./start-all-servers.sh
```

### Erro de compilação Java?
```bash
# Limpar e recompilar
./mvnw clean
./start-all-servers.sh
```

### Servidor Node.js não inicia?
```bash
# Verificar se Node.js está instalado
node --version

# Instalar dependências se necessário
npm install
```

---

## 🗄️ Banco de Dados de Teste

O projeto inclui um dump completo do PostgreSQL com dados de teste equilibrados, pronto para restauração em um computador novo.

### Restaurar o banco de teste

```bash
# 1. Criar o banco (se não existir)
sudo -u postgres createdb planecon

# 2. Restaurar estrutura + dados (pedirá usuário e senha)
./restore-test-db.sh
```

### Atualizar o backup (após modificar dados)

```bash
./update-test-db.sh
```

### Arquivos relacionados

| Arquivo | Descrição |
|---------|-----------|
| `planecon_test_db.dump` | Dump completo (estrutura + dados de teste) |
| `schema.sql` | Apenas estrutura do banco (sem dados) |
| `restore-test-db.sh` | Script para restaurar o dump no PostgreSQL |
| `update-test-db.sh` | Script para gerar um novo dump a partir do banco atual |

---

**Última atualização**: Abril 2026
