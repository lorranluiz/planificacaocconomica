# Sistema de Hierarquia de Conselhos - Documentação Técnica

## Visão Geral

Este documento explica como funciona o sistema hierárquico de conselhos, comitês e trabalhadores no sistema Planecon, incluindo como os dados são carregados, salvos e utilizados para planificação econômica.

## Estrutura Hierárquica

A hierarquia de instâncias no sistema é organizada da seguinte forma (do topo para a base):

```
Conselho Planejador (PLANNERCOUNCIL)
    ↓ pode ter como filhos
Conselhos Populares (POPULARCOUNCIL)
    ↓ podem ter como filhos
Comitês (COMMITTEE, DISTCOMMITTEE, SERVICECOMMITTEE)
    ↓ podem ter como filhos
Trabalhadores (WORKER)
```

## Modelo de Dados

### Tabela `instance`

A tabela principal que armazena todas as instâncias (conselhos, comitês e trabalhadores).

**Campos principais para hierarquia:**

1. **`type`** (VARCHAR): Tipo da instância
   - `PLANNERCOUNCIL`: Conselho planejador (nível mais alto)
   - `POPULARCOUNCIL`: Conselho popular
   - `COMMITTEE`: Comitê de produção
   - `DISTCOMMITTEE`: Comitê de distribuição
   - `SERVICECOMMITTEE`: Comitê de serviços
   - `WORKER`: Trabalhador individual

2. **`popular_council_associated_with_committee_or_worker`** (INTEGER): 
   - Referência ao conselho popular pai
   - Usado quando a instância é um COMMITTEE ou WORKER
   - Aponta para o ID do conselho popular superior

3. **`popular_council_associated_with_popular_council`** (INTEGER):
   - Referência ao conselho popular pai
   - Usado quando a instância é outro POPULARCOUNCIL
   - Permite hierarquia multi-nível de conselhos populares
   - Pode ser NULL para o conselho da "Intercontinental da Terra" (topo da hierarquia)

4. **`committee_name`** (VARCHAR): Nome da instância (usado para COMMITTEEs e COUNCILs)

5. **`id_social_materialization`** (INTEGER): Produto ou serviço associado (para COMMITTEEs)

## Como Funciona a Hierarquia

### 1. Busca de Instâncias Filhas

**Código:** `InstanceRepository.findByParentCouncilId()`

```java
@Query("SELECT i FROM Instance i WHERE i.popularCouncilAssociatedWithCommitteeOrWorker = :parentId 
       OR i.popularCouncilAssociatedWithPopularCouncil = :parentId")
List<Instance> findByParentCouncilId(@Param("parentId") Integer parentId);
```

Esta query busca TODAS as instâncias que têm o ID informado como pai, seja através de:
- `popular_council_associated_with_committee_or_worker` (comitês e trabalhadores filhos)
- `popular_council_associated_with_popular_council` (conselhos populares filhos)

### 2. Cálculo de EstimativasQuando um usuário carrega dados para planificação em um conselho, o sistema:

**Arquivo:** `CouncilService.java`
**Método:** `calculateEstimates(Integer instanceId)`

**Passos:**

1. **Busca instância pai:**
   ```java
   Instance council = instanceRepository.findById(instanceId)
       .orElseThrow(() -> new RuntimeException("Conselho não encontrado"));
   ```

2. **Busca TODAS as instâncias filhas (recursivamente):**
   ```java
   List<InstanceDto> childInstances = getChildInstances(councilId);
   ```

3. **Calcula matriz tecnológica agregada:**
   - Para cada materialização social (produto/serviço)
   - Soma os coeficientes técnicos de TODOS os comitês filhos
   - Calcula média ponderada considerando quantidade produzida

4. **Calcula vetor de demanda agregado:**
   - Soma as demandas de TODAS as instâncias inferiores
   - Inclui demandas de comitês, trabalhadores e conselhos subordinados

**Código simplificado:**
```java
public EstimatesResponseDTO calculateEstimates(Integer instanceId) {
    // 1. Buscar instância do conselho
    Instance council = instanceRepository.findById(instanceId).orElseThrow();
    
    // 2. Buscar instâncias filhas
    List<InstanceDto> children = getChildInstances(instanceId);
    
    // 3. Agregar matriz tecnológica
    Map<Integer, Map<Integer, BigDecimal>> aggregatedMatrix = new HashMap<>();
    for (InstanceDto child : children) {
        List<TechnologicalTensor> tensors = tensorRepository.findByInstanceId(child.getId());
        // Somar coeficientes...
    }
    
    // 4. Agregar vetor de demanda
    Map<Integer, BigDecimal> aggregatedDemand = new HashMap<>();
    for (InstanceDto child : children) {
        List<DemandVector> demands = demandVectorRepository.findByInstanceId(child.getId());
        // Somar demandas...
    }
    
    return new EstimatesResponseDTO(aggregatedMatrix, aggregatedDemand);
}
```

### 3. Processo de Planificação

**Arquivos:** `plannercouncil.html` + `plannercouncil.js`

Quando o usuário clica em "Planificar" em um conselho:

1. **Carrega matriz tecnológica agregada** (das instâncias inferiores)
2. **Carrega vetor de demanda agregado** (das instâncias inferiores)
3. **Aplica modelo de Leontief:**
   ```
   X = (I - A)^(-1) × D
   
   Onde:
   X = Vetor de produção necessária
   I = Matriz identidade
   A = Matriz tecnológica (coeficientes técnicos)
   D = Vetor de demanda final
   ```

4. **Calcula otimização de trabalho** para cada produto:
   - Número de trabalhadores necessários
   - Horas de trabalho
   - Escalas e turnos

5. **Salva resultados** associados à instância do conselho

## Endpoints da API

### Carregar Conselhos para Dropdown

**Popular Council:**
```
GET /api/instances?type=POPULARCOUNCIL
```

**Planner Council:**
```
GET /api/instances?type=PLANNERCOUNCIL
```

**Controller:** `InstanceController.getAllInstances()`
```java
@GetMapping
public ResponseEntity<List<InstanceDto>> getAllInstances(
        @RequestParam(required = false) String type) {
    if (type != null && !type.isEmpty()) {
        InstanceType instanceType = InstanceType.valueOf(type);
        instances = instanceService.findAllByType(instanceType);
    }
    return ResponseEntity.ok(instances);
}
```

### Buscar Instâncias Filhas

**Endpoint:**
```
GET /api/council/{councilId}/children
```

**Controller:** `CouncilController.getChildInstances()`
```java
@GetMapping("/{councilId}/children")
public ResponseEntity<List<InstanceDto>> getChildInstances(@PathVariable Integer councilId) {
    List<InstanceDto> childInstances = councilService.getChildInstances(councilId);
    return ResponseEntity.ok(childInstances);
}
```

### Calcular Estimativas

**Endpoint:**
```
POST /api/council/{instanceId}/calculate-estimates
```

**Controller:** `CouncilController.calculateEstimates()`
```java
@PostMapping("/{instanceId}/calculate-estimates")
public ResponseEntity<EstimatesResponseDTO> calculateEstimates(@PathVariable Integer instanceId) {
    EstimatesResponseDTO estimates = councilService.calculateEstimates(instanceId);
    return ResponseEntity.ok(estimates);
}
```

## Interface do Usuário

### popularcouncil.html
- **Propósito:** Interface para conselhos populares
- **Funcionalidade:** Carregar dados estimados (matriz + vetor de demanda) das instâncias inferiores
- **Botão "Calcular Estimativas":** Agrega dados de comitês e trabalhadores subordinados

### plannercouncil.html
- **Propósito:** Interface para conselhos planejadores
- **Funcionalidade:** Planificação completa usando dados agregados
- **Botões:**
  - "Calcular Estimativas": Carrega dados agregados
  - "Planificar": Executa cálculo de Leontief para gerar plano de produção

## Fluxo de Dados na Hierarquia (Exemplo)

```
1. Conselho Planejador Nacional (ID=1)
   |
   ├─> 2. Conselho Popular Sudeste (ID=2)
   |     |
   |     ├─> 5. Comitê Têxtil SP (ID=5)
   |     |     └─> Produz: Camisetas
   |     |         └─> Demanda água, algodão, energia
   |     |
   |     └─> 6. Comitê Alimentação SP (ID=6)
   |           └─> Produz: Pão, Leite
   |               └─> Demanda trigo, energia, água
   |
   └─> 3. Conselho Popular Sul (ID=3)
         |
         └─> 7. Comitê Energia RS (ID=7)
               └─> Produz: Energia elétrica
                   └─> Demanda carvão, água, manutenção
```

**Quando Conselho ID=1 (Nacional) clica em "Calcular Estimativas":**

1. Sistema busca instâncias filhas: [2, 3]
2. Para ID=2, busca filhas: [5, 6]
3. Para ID=3, busca filhas: [7]
4. **Total de instâncias na hierarquia:** [2, 3, 5, 6, 7]
5. Agrega dados de TODAS essas instâncias:
   - Matriz tecnológica: coeficientes de produtos
   - Vetor de demanda: necessidades de cada produto

**Quando usuário clica em "Planificar":**

6. Aplica Leontief aos dados agregados
7. Calcula vetor de produção necessária para atender TODA a hierarquia
8. Gera plano de trabalho e alocação de recursos

## Arquivos Importantes

### Backend (Java)

| Arquivo | Responsabilidade |
|---------|------------------|
| `Instance.java` | Entidade JPA com campos de hierarquia |
| `InstanceRepository.java` | Queries para buscar instâncias pai/filho |
| `InstanceService.java` | Lógica de negócio para instâncias |
| `InstanceController.java` | API REST para instâncias |
| `CouncilService.java` | Cálculo de estimativas e agregação |
| `CouncilController.java` | API REST para operações de conselho |
| `PlanificationService.java` | Implementação do modelo de Leontief |

### Frontend (JavaScript/HTML)

| Arquivo | Responsabilidade |
|---------|------------------|
| `popularcouncil.html` | Interface para conselhos populares |
| `plannercouncil.html` | Interface para conselhos planejadores |
| `js/popularcouncil.js` | Lógica frontend: carregar conselhos, calcular estimativas |
| `js/plannercouncil.js` | Lógica frontend:  planificação completa |
| `js/popularcouncil-children.js` | Gerenciamento de instâncias filhas |
| `js/plannercouncil-children.js` | Gerenciamento de instâncias filhas |
| `common-header.js` | Cabeçalho comum e sistema de temas |

## Relacionamentos no Banco de Dados

### Chaves Estrangeiras na tabela `instance`

```sql
-- Conselho popular associado a comitê ou trabalhador
ALTER TABLE instance
  ADD CONSTRAINT fk_popular_council_committee_worker
  FOREIGN KEY (popular_council_associated_with_committee_or_worker)
  REFERENCES instance(id);

-- Conselho popular associado a outro conselho popular
ALTER TABLE instance
  ADD CONSTRAINT fk_popular_council_popular_council
  FOREIGN KEY (popular_council_associated_with_popular_council)
  REFERENCES instance(id);
```

## Considerações Importantes

1. **Recursividade:** O sistema suporta hierarquias multi-nível (conselhos dentro de conselhos)

2. **Agregação automática:** Os cálculos agregam TODOS os níveis inferiores recursivamente

3. **Consistência de dados:** Os coeficientes técnicos devem ser normalizados para evitar duplicação

4. **Performance:** Queries recursivas podem ser custosas com muitos níveis de hierarquia

5. **Validações:** O sistema valida que:
   - Comitês devem ter conselho popular pai
   - Trabalhadores devem ter comitê e conselho popular associados
   - Conselhos populares podem ter ou não ter conselho pai (root = NULL)

## Diagramas

### Modelo de Leontief Aplicado

```
Entrada:
- Matriz A (n×n): coeficientes técnicos agregados
- Vetor D (n×1): demanda final agregada

Processamento:
1. I - A (matriz identidade menos matriz tecnológica)
2. (I - A)^(-1) (inversa de Leontief)
3. X = (I - A)^(-1) × D

Saída:
- Vetor X (n×1): produção necessária de cada produto
```

### Fluxo de Dados entre Hierarquias

```
┌─────────────────────────────────────────┐
│  Conselho Planejador                    │
│  - Recebe dados agregados de baixo      │
│  - Gera plano de produção                │
│  - Distribui metas para níveis abaixo    │
└────────────┬────────────────────────────┘
             │
             ├─────────────────────────────┐
             │                             │
┌────────────▼────────────┐   ┌───────────▼────────────┐
│  Conselho Popular 1     │   │  Conselho Popular 2     │
│  - Agrega comitês       │   │  - Agrega comitês       │
│  - Envia para cima      │   │  - Envia para cima      │
└──────┬──────────────────┘   └────────┬───────────────┘
       │                               │
       ├───────────┐                   └────────────┐
       │           │                                │
┌──────▼─────┐ ┌──▼────────┐              ┌────────▼──────┐
│  Comitê 1  │ │ Comitê 2  │              │  Comitê 3     │
│  - Produz  │ │ - Produz  │              │  - Produz     │
│  - Demanda │ │ - Demanda │              │  - Demanda    │
└────────────┘ └───────────┘              └───────────────┘
```

---

**Última atualização:** Abril 2026  
**Autor:** Documentação gerada para sistema Planecon
