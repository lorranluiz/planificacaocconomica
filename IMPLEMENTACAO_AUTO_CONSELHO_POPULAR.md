# Implementação: Criação Automática de Conselhos Populares por Cidade

## Objetivo

Quando um usuário cria uma fábrica através da interface do mapa (localhost:3000), o sistema deve:
1. Verificar se já existe um Conselho Popular associado à cidade da fábrica
2. Se não existir, criar automaticamente um novo Conselho Popular para aquela cidade
3. Associar automaticamente o comitê (fábrica) ao Conselho Popular da cidade

## Implementação

### Arquivo Modificado

**`src/main/java/xyz/planecon/controller/FactoryController.java`**

### Mudanças Realizadas

#### 1. Novo Método Privado: `findOrCreatePopularCouncilForCity()`

```java
private Instance findOrCreatePopularCouncilForCity(String cityCode, String cityName) {
    // Verifica se já existe um Conselho Popular para esta cidade
    List<Instance> existingCouncils = instanceRepository.findByCityCodeAndType(
        cityCode, 
        InstanceType.POPULARCOUNCIL
    );
    
    if (!existingCouncils.isEmpty()) {
        logger.info("Conselho Popular já existe para cidade {}: {}", 
            cityName, existingCouncils.get(0).getCommitteeName());
        return existingCouncils.get(0);
    }
    
    // Criar novo Conselho Popular
    Instance newCouncil = new Instance();
    newCouncil.setType(InstanceType.POPULARCOUNCIL);
    newCouncil.setCommitteeName("Conselho Popular de " + cityName);
    newCouncil.setCityCode(cityCode);
    newCouncil.setCity(cityName);
    
    // Buscar dados de localização da cidade
    Optional<City> cityOpt = cityRepository.findByCode(cityCode);
    if (cityOpt.isPresent()) {
        City city = cityOpt.get();
        if (city.getState() != null) {
            newCouncil.setState(city.getState());
        }
        newCouncil.setCountry("Brasil");
    }
    
    // Salvar e retornar
    newCouncil = instanceRepository.save(newCouncil);
    logger.info("Novo Conselho Popular criado: {} (ID: {})", 
        newCouncil.getCommitteeName(), newCouncil.getId());
    
    return newCouncil;
}
```

**Características do Método:**
- Busca Conselhos Populares existentes por `cityCode`
- Retorna o conselho existente se já houver um
- Cria novo conselho com nome formatado: "Conselho Popular de [NOME_CIDADE]"
- Define `cityCode` e `city` como campos imutáveis do conselho
- Copia `state` do repositório de cidades quando disponível
- Registra logs de criação/reutilização

#### 2. Modificação no Método `findOrCreateFactory()`

**Local: Criação de Nova Fábrica**

Adicionado após a criação de uma nova fábrica:

```java
// Auto-criar/associar Conselho Popular para a cidade
if (instance.getCityCode() != null && instance.getCity() != null) {
    Instance popularCouncil = findOrCreatePopularCouncilForCity(
        instance.getCityCode(), 
        instance.getCity()
    );
    instance.setPopularCouncilAssociatedWithCommitteeOrWorker(popularCouncil.getId());
    instance = instanceRepository.save(instance);
    logger.info("Comitê {} associado ao Conselho Popular {} (ID: {})", 
        instance.getCommitteeName(), 
        popularCouncil.getCommitteeName(),
        popularCouncil.getId());
}
```

**Local: Fábrica Existente Sem Conselho**

Adicionado quando uma fábrica já existe mas não tem conselho associado:

```java
// Se não tem conselho popular associado, criar/associar automaticamente
if (existingInstance.getPopularCouncilAssociatedWithCommitteeOrWorker() == null 
    && existingInstance.getCityCode() != null 
    && existingInstance.getCity() != null) {
    
    Instance popularCouncil = findOrCreatePopularCouncilForCity(
        existingInstance.getCityCode(),
        existingInstance.getCity()
    );
    existingInstance.setPopularCouncilAssociatedWithCommitteeOrWorker(
        popularCouncil.getId()
    );
    existingInstance = instanceRepository.save(existingInstance);
    logger.info("Conselho Popular {} associado retroativamente ao comitê {}", 
        popularCouncil.getCommitteeName(),
        existingInstance.getCommitteeName());
}
```

## Comportamento do Sistema

### Fluxo de Criação de Fábrica

1. **Usuário clica em "Planificar" no mapa** (localhost:3000)
2. **Sistema verifica CNPJ:**
   - Se fábrica existe → carrega dados existentes
   - Se não existe → cria nova fábrica
3. **Sistema verifica Conselho Popular da cidade:**
   - Busca conselho por `cityCode`
   - Se existe → reutiliza
   - Se não existe → cria automaticamente
4. **Sistema associa o comitê ao conselho:**
   - Define `popularCouncilAssociatedWithCommitteeOrWorker`
   - Salva instância atualizada

### Regras de Negócio

- **Um Conselho Popular por cidade**: Identificado por `cityCode` (código IBGE)
- **Nome padronizado**: "Conselho Popular de [NOME_CIDADE]"
- **Campos imutáveis do conselho**:
  - `cityCode`: Código IBGE da cidade
  - `city`: Nome da cidade
- **Campos editáveis** (podem ser atualizados manualmente):
  - `latitude`, `longitude`: Coordenadas do conselho
  - Outros campos de endereço (rua, bairro, etc.)
- **Associação automática**: Todo comitê criado via mapa é automaticamente associado ao conselho de sua cidade
- **Associação retroativa**: Comitês existentes sem conselho são associados automaticamente quando acessados

## Logs e Monitoramento

O sistema registra no log:

```
INFO - Conselho Popular já existe para cidade São Paulo: Conselho Popular de São Paulo
INFO - Novo Conselho Popular criado: Conselho Popular de Rio de Janeiro (ID: 123)
INFO - Comitê Fábrica XYZ associado ao Conselho Popular Conselho Popular de São Paulo (ID: 456)
INFO - Conselho Popular Conselho Popular de Curitiba associado retroativamente ao comitê Fábrica ABC
```

## Integração com Sistema de Hierarquia

Esta implementação se integra com a hierarquia existente:

```
PLANNERCOUNCIL (Conselho de Planejamento)
    ↓
POPULARCOUNCIL (Conselho Popular) ← CRIADO AUTOMATICAMENTE POR CIDADE
    ↓
COMMITTEE (Comitê/Fábrica) ← ASSOCIADO AUTOMATICAMENTE
    ↓
WORKER (Trabalhador)
```

## Próximos Passos

1. **Testar criação de fábrica via mapa**:
   - Acessar http://localhost:3000
   - Criar uma nova fábrica
   - Verificar se o Conselho Popular foi criado automaticamente

2. **Verificar no banco de dados**:
   ```sql
   SELECT id, type, committee_name, city_code, city, 
          popular_council_associated_with_committee_or_worker
   FROM instance 
   WHERE type IN ('POPULARCOUNCIL', 'COMMITTEE')
   ORDER BY city_code, type;
   ```

3. **Validar no frontend**:
   - Acessar popularcouncil.html
   - Verificar se o novo conselho aparece no dropdown
   - Verificar se dados são agregados corretamente

## Notas Técnicas

- **Entidade City**: NÃO possui campos `latitude`/`longitude` - estes estão apenas em `Instance`
- **Identificação única**: `cityCode` (código IBGE) garante unicidade por cidade
- **Performance**: Uso de consulta otimizada `findByCityCodeAndType()` para evitar duplicação
- **Transação**: Operações de criação/associação são atômicas via JPA
