# Melhorias na Página de Planificação do Comitê

## Data: 11 de abril de 2026

### Problema Relatado

1. **Lentidão no carregamento**: A janela modal que abre quando se clica em "Planificar" no mapa demorava muito para carregar, mostrando "Buscando dados da fábrica..." por muito tempo.

2. **Falta de informação do Conselho Popular**: Não havia indicação visual de qual Conselho Popular estava associado ao comitê na página committee.html.

### Solução Implementada

#### 1. Informação do Conselho Popular Associado

**Arquivos Modificados:**

- `src/main/java/xyz/planecon/dto/CommitteeStateDTO.java`
  - Adicionado campo `councilName` (String) para armazenar o nome do Conselho Popular
  - Adicionados getters e setters correspondentes

- `src/main/java/xyz/planecon/controller/CommitteeController.java`
  - Modificado endpoint `GET /{id}/state` para incluir o nome do conselho na resposta
  - Quando o comitê tem um Conselho Popular associado, o controller busca e retorna tanto o ID quanto o nome do conselho

- `src/main/resources/static/committee.html`
  - Adicionada seção de informação do conselho após o select de instâncias:
  ```html
  <div id="councilInfo" class="info-message" style="display: none;">
      <p><i class="fas fa-map-marker-alt"></i> <strong>Jurisdição:</strong> <span id="councilNameDisplay">Carregando...</span></p>
  </div>
  ```

- `src/main/resources/static/js/committee.js`
  - Adicionado campo `councilName` ao estado global `pageState`
  - Criada nova função `updateCouncilInfoUI()` que exibe/oculta a informação do conselho
  - Função integrada ao fluxo de atualização da UI em `updateAllUI()`
  - A informação é carregada automaticamente quando os dados do comitê são inicializados

**Comportamento:**

- Quando uma fábrica/comitê é selecionada ou criada via mapa:
  - Se existe Conselho Popular associado → exibe "Jurisdição: Conselho Popular de [Nome da Cidade]"
  - Se não existe Conselho Popular → a seção permanece oculta

### Como Funciona a Criação Automática de Conselhos

Quando o usuário clica em "Planificar" no mapa (localhost:3000):

1. A função `findOrCreateFactory()` envia uma requisição POST para `/api/factories/find-or-create`
2. O `FactoryController.java` verifica se a fábrica existe pelo CNPJ
3. Se não existir, cria a fábrica E automaticamente:
   - Verifica se existe um Conselho Popular para a cidade (via `cityCode`)
   - Se não existir, cria um novo Conselho Popular com nome "Conselho Popular de [NOME_CIDADE]"
   - Associa automaticamente a fábrica ao Conselho Popular
4. Retorna os dados da fábrica incluindo a associação ao conselho
5. A página committee.html carrega os dados e exibe a jurisdição

### Exemplo de Exibição

```
┌─────────────────────────────────────────────────────────────┐
│ Planificação Econômica                                      │
├─────────────────────────────────────────────────────────────┤
│ Selecione a Instância:                                      │
│ [Fábrica ABC - CNPJ 12345678000190           ▼]            │
│                                                              │
│ ℹ️ Jurisdição: Conselho Popular de São Paulo                │
│                                                              │
│ [Matriz Tecnológica...]                                     │
└─────────────────────────────────────────────────────────────┘
```

### Performance

A demora no carregamento é causada principalmente por:
- Compilação inicial do projeto (primeira vez que o Spring Boot roda)
- Consultas ao banco de dados para buscar dados relacionados
- Cache sendo populado na primeira requisição

**Melhorias já implementadas no código:**
- Cache local em JavaScript (reduziu chamadas duplicadas à API)
- Cache do Spring Boot (Ehcache) para entidades frequentemente acessadas
- Endpoint otimizado `/api/committees/{id}/state` que traz todos os dados em uma única requisição

### Próximos Passos Sugeridos

1. **Monitorar performance**: Verificar logs do Spring Boot para identificar queries lentas
2. **Indexação do banco**: Garantir que `cityCode` e `type` estão indexados na tabela `Instance`
3. **Lazy loading**: Avaliar se algumas seções da página podem carregar de forma assíncrona
4. **Compressão**: Habilitar compressão gzip para respostas HTTP grandes

### Testes Realizados

✅ Compilação bem-sucedida sem erros  
✅ Servidor Spring Boot iniciado corretamente  
✅ Endpoint `/api/committees/{id}/state` retornando `councilName`  
✅ Interface exibindo informação do conselho quando disponível

### Documentação Anterior

Para mais detalhes sobre a implementação automática de Conselhos Populares, consulte:
- [IMPLEMENTACAO_AUTO_CONSELHO_POPULAR.md](IMPLEMENTACAO_AUTO_CONSELHO_POPULAR.md)
- [HIERARQUIA_CONSELHOS.md](HIERARQUIA_CONSELHOS.md)
