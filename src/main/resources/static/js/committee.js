// Script para controlar a página de planificação econômica

// Definição do estado global da página
const pageState = {
    // Dados básicos do comitê
    id: null,
    committeeName: "",
    producedQuantity: 0,
    targetQuantity: 0,
    workerEffectiveLimit: 0,
    socialMaterializationId: null,
    councilId: null,
    councilName: null,

    // Proposta de trabalhadores
    workerProposal: {
        workerLimit: 0,
        workerHours: 0,
        productionTime: 0,
        nightShift: false,
        weeklyScale: 5,
        planningWorkerLimit: null,
        planningWorkerHours: null,
        planningProductionTime: null,
        planningNightShift: null,
        planningWeeklyScale: null,
        planningSociallyNecessaryTimePerUnit: null,
        planifiedWorkerLimit: null,
        planifiedWorkerHours: null,
        planifiedProductionTime: null,
        planifiedNightShift: null,
        planifiedWeeklyScale: null,
        planifiedSociallyNecessaryTimePerUnit: null
    },

    // Membros do comitê 
    members: [],

    // Materializações relacionadas
    materializations: [],

    // Flags de controle
    initialized: false,
    isDirty: false,

    // Adicionar campo para dados de otimização
    optimizationData: null
};

// Adicionar ao estado global no topo do arquivo (após declaração do pageState)
const globalState = {
    // Lista completa de todas as materializações disponíveis
    allMaterializations: [],
    // Metadados completos das materializações, usados para exibição da matriz tecnológica
    materializationMetadataById: {},
    materializationMetadataLoaded: false,
    materializationMetadataPromise: null,
    // Tempo para produzir 1 unidade por materialização, calculado no Planner
    materializationProductionTimeById: {},
    materializationProductionTimeLoaded: false,
    materializationProductionTimePromise: null,
    // Tempo Socialmente Necessário para Produzir 1 Unidade por materialização (de linhas de comitês)
    materializationSociallyNecessaryTimeById: {},
    materializationSociallyNecessaryTimeLoaded: false,
    materializationSociallyNecessaryTimePromise: null,
    // Tempo Socialmente Necessário para Produzir 1 Unidade por materialização (de linhas de comitês)
    materializationSociallyNecessaryTimeById: {},
    materializationSociallyNecessaryTimeLoaded: false,
    materializationSociallyNecessaryTimePromise: null,
    plannerCouncilId: null,
    committeeOptimizationDataPromise: null,
    technologicalQuantitiesHydratedFromTensor: false,
    // Flag para controlar se já carregamos todas as materializações do servidor
    materializationsLoaded: false,
    // Flag para controlar se o dropdown está visível
    dropdownVisible: false,
    // Flag para controlar se estamos carregando dados
    loadingMaterializations: false,
    // Valores locais da coluna Quantidade no vetor tecnológico
    technologicalQuantities: {},

    // Escolhas de fornecedor: inputMaterializationId -> supplierInstanceId
    supplierChoices: {},

    // Nomes dos fornecedores: supplierInstanceId -> supplierName
    supplierNames: {},

    // Status das encomendas: inputMaterializationId -> orderStatus
    orderStatuses: {},

    // ID do insumo cujo modal de seleção de fornecedor está aberto
    currentSupplierInputId: null
};

// Cache de dados em memória para reduzir chamadas ao servidor
const localCache = {
    data: {},
    timeouts: {},
    
    // Define um item no cache com tempo de expiração
    set: function(key, value, expirationMs = 60000) { // 1 minuto padrão
        this.data[key] = {
            value: value,
            timestamp: Date.now()
        };
        
        // Limpar timeout anterior se existir
        if (this.timeouts[key]) {
            clearTimeout(this.timeouts[key]);
        }
        
        // Configurar timeout para expiração automática
        this.timeouts[key] = setTimeout(() => {
            delete this.data[key];
            delete this.timeouts[key];
        }, expirationMs);
    },
    
    // Recupera um item do cache
    get: function(key) {
        const item = this.data[key];
        if (!item) return null;
        return item.value;
    },
    
    // Verifica se um item está no cache e não expirou
    has: function(key) {
        return this.data.hasOwnProperty(key);
    },
    
    // Remove um item do cache
    remove: function(key) {
        delete this.data[key];
        if (this.timeouts[key]) {
            clearTimeout(this.timeouts[key]);
            delete this.timeouts[key];
        }
    },
    
    // Limpa o cache por completo
    clear: function() {
        this.data = {};
        for (const key in this.timeouts) {
            clearTimeout(this.timeouts[key]);
        }
        this.timeouts = {};
    }
};

// Funções auxiliares para manipulação de números com diferentes separadores decimais
function formatNumberForDisplay(value) {
    if (value === null || value === undefined || isNaN(parseFloat(value))) return "0";
    return parseFloat(value).toString().replace('.', ',');
}

// Improved function for parsing decimal input to ensure proper conversion
function parseDecimalInput(value) {
    if (!value) return 0;
    
    // Normalize the input: replace comma with period for proper numeric conversion
    const normalizedValue = value.toString().replace(',', '.');
    const parsed = parseFloat(normalizedValue);
    
    // Additional validation to ensure we get a proper number
    if (isNaN(parsed)) {
        console.warn("Input value could not be parsed as a number:", value);
        return 0;
    }
    
    return parsed;
}

function formatNumberForInput(value) {
    if (value === null || value === undefined || value === '') return '';

    const normalizedValue = value.toString().replace(',', '.');
    const parsed = parseFloat(normalizedValue);

    if (isNaN(parsed)) return '';

    return parsed.toString();
}

function formatOptionalNumberForDisplay(value) {
    if (value === null || value === undefined || value === '') return '';
    return formatNumberForDisplay(value);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getMaterializationMeasurementUnitLabel(materialization) {
    if (!materialization) return '';

    const measurementUnit = materialization.measurementUnit || {};
    return materialization.measurementUnitName
        || measurementUnit.name
        || measurementUnit.symbol
        || measurementUnit.abbreviation
        || '';
}

function getMaterializationStandardQuantityLabel(materialization) {
    if (!materialization) return '';

    const standardQuantity = materialization.standardQuantityPerUnit;
    if (standardQuantity === null || standardQuantity === undefined || standardQuantity === '') {
        return '';
    }

    const quantityText = formatNumberForDisplay(standardQuantity);
    const unitLabel = getMaterializationMeasurementUnitLabel(materialization);

    return unitLabel ? `${quantityText} ${unitLabel}` : quantityText;
}

function getTechnologicalQuantityValue(materialization) {
    if (!materialization) return '';

    const localValue = globalState.technologicalQuantities[materialization.id];
    if (localValue !== undefined && localValue !== null && localValue !== '') {
        return localValue;
    }

    if (materialization.quantity !== undefined && materialization.quantity !== null && materialization.quantity !== '') {
        return materialization.quantity;
    }

    return '';
}

function getMaterializationProductionTimeValue(materialization) {
    if (!materialization) return null;

    // Prioridade 1: Tempo Localmente Necessário para Produzir 1 Unidade
    if (materialization.productionTime !== undefined && materialization.productionTime !== null && materialization.productionTime !== '') {
        return materialization.productionTime;
    }

    const globalProductionTime = globalState.materializationProductionTimeById[materialization.id];
    if (globalProductionTime !== undefined && globalProductionTime !== null && globalProductionTime !== '') {
        return globalProductionTime;
    }

    const metadata = globalState.materializationMetadataById[materialization.id];
    if (metadata && metadata.productionTime !== undefined && metadata.productionTime !== null && metadata.productionTime !== '') {
        return metadata.productionTime;
    }

    // Fallback antigo: quando não houver valor local, usar o Tempo Socialmente Necessário registrado
    const sociallyNecessaryTime = globalState.materializationSociallyNecessaryTimeById[materialization.id];
    if (sociallyNecessaryTime !== undefined && sociallyNecessaryTime !== null && sociallyNecessaryTime !== '') {
        return sociallyNecessaryTime;
    }

    return null;
}

function getMaterializationInputUnitProportionValue(materialization, quantityOverride = undefined) {
    if (!materialization) return null;

    const quantitySource = quantityOverride !== undefined
        ? quantityOverride
        : getTechnologicalQuantityValue(materialization);

    const stdQty = parseDecimalInput(materialization.standardQuantityPerUnit);
    const qty = parseDecimalInput(quantitySource);

    if (stdQty === 0 || isNaN(stdQty) || isNaN(qty)) {
        return null;
    }

    return qty / stdQty;
}

function getMaterializationTemporalInputUnitProportionValue(materialization, inputUnitProportionOverride = undefined) {
    if (!materialization) return null;

    const inputUnitProportion = inputUnitProportionOverride !== undefined
        ? inputUnitProportionOverride
        : getMaterializationInputUnitProportionValue(materialization);

    const productionTime = parseDecimalInput(getMaterializationProductionTimeValue(materialization));

    if (inputUnitProportion === null || inputUnitProportion === undefined || isNaN(inputUnitProportion) || isNaN(productionTime)) {
        return null;
    }

    return inputUnitProportion * productionTime;
}

function getCommitteeOptimizationProductionTimeValue() {
    const optimizationProductionTime = pageState.optimizationData && pageState.optimizationData.productionTime;
    if (optimizationProductionTime !== undefined && optimizationProductionTime !== null && optimizationProductionTime !== '') {
        return parseDecimalInput(optimizationProductionTime);
    }

    return null;
}

function getStoredTechnologicalTensorValue(materialization, outputMaterializationId) {
    if (!materialization || !outputMaterializationId) return null;

    const tensors = materialization.technologicalTensors || {};
    const storedValue = tensors[outputMaterializationId];

    if (storedValue === undefined || storedValue === null || storedValue === '') {
        return null;
    }

    return parseDecimalInput(storedValue);
}

function hydrateTechnologicalQuantitiesFromStoredTensor() {
    if (globalState.technologicalQuantitiesHydratedFromTensor) {
        return;
    }

    const outputMaterializationId = pageState.socialMaterializationId;
    const productProductionTime = getCommitteeOptimizationProductionTimeValue();
    const activeMaterializations = (pageState.materializations || []).filter(mat => mat && mat.isDeleted !== true);

    if (!outputMaterializationId || !productProductionTime || productProductionTime <= 0 || activeMaterializations.length === 0) {
        return;
    }

    const storedCoefficients = activeMaterializations.map(materialization => {
        const tensors = materialization.technologicalTensors || {};
        return parseDecimalInput(tensors[outputMaterializationId]);
    });

    const coefficientSum = storedCoefficients.reduce((sum, value) => sum + (value || 0), 0);

    if (coefficientSum < 0 || coefficientSum >= 1) {
        console.warn('Nao foi possivel hidratar Quantidade a partir do vetor tecnologico: soma invalida dos coeficientes.', coefficientSum);
        globalState.technologicalQuantitiesHydratedFromTensor = true;
        return;
    }

    const temporalDenominator = productProductionTime / (1 - coefficientSum);

    activeMaterializations.forEach((materialization, index) => {
        if (globalState.technologicalQuantities[materialization.id] !== undefined && globalState.technologicalQuantities[materialization.id] !== null && globalState.technologicalQuantities[materialization.id] !== '') {
            return;
        }

        const storedCoefficient = storedCoefficients[index] || 0;
        const materializationProductionTime = parseDecimalInput(getMaterializationProductionTimeValue(materialization));
        const standardQuantity = parseDecimalInput(materialization.standardQuantityPerUnit);

        if (materializationProductionTime <= 0 || standardQuantity <= 0) {
            globalState.technologicalQuantities[materialization.id] = 0;
            return;
        }

        const temporalProportion = storedCoefficient * temporalDenominator;
        const inputUnitProportion = temporalProportion / materializationProductionTime;
        const quantity = inputUnitProportion * standardQuantity;

        globalState.technologicalQuantities[materialization.id] = quantity;
    });

    globalState.technologicalQuantitiesHydratedFromTensor = true;
}

function loadCommitteeOptimizationData() {
    if (pageState.optimizationData) {
        return Promise.resolve(pageState.optimizationData);
    }

    if (!pageState.id || !pageState.socialMaterializationId) {
        return Promise.resolve(null);
    }

    if (globalState.committeeOptimizationDataPromise) {
        return globalState.committeeOptimizationDataPromise;
    }

    globalState.committeeOptimizationDataPromise = fetch(`/api/committees/${pageState.id}/central-optimization/${pageState.socialMaterializationId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro ao buscar dados de otimização: ${response.status}`);
            }
            return response.json();
        })
        .then(result => {
            pageState.optimizationData = result;
            return result;
        })
        .catch(error => {
            console.error('Erro ao carregar dados de otimização do comitê:', error);
            return null;
        })
        .finally(() => {
            globalState.committeeOptimizationDataPromise = null;
        });

    return globalState.committeeOptimizationDataPromise;
}

function updateTechnologicalQuantity(materializationId, input) {
    if (!input) return;

    globalState.technologicalQuantities[materializationId] = input.value;

    const materialization = (pageState.materializations || []).find(mat => mat.id === materializationId);
    if (materialization) {
        materialization.quantity = parseDecimalInput(input.value);
    }

    // Atualizar o campo de proporção da unidade de insumo
    const proportionInput = document.querySelector(`[data-proportion-for="${materializationId}"]`);
    const temporalProportionInput = document.querySelector(`[data-temporal-proportion-for="${materializationId}"]`);
    const materializationForCalc = materialization || { id: materializationId };
    let inputProportionValue = null;

    if (proportionInput) {
        const stdQty = parseFloat(proportionInput.dataset.stdQty);
        const qty = parseFloat(input.value);
        if (!isNaN(qty) && stdQty && stdQty !== 0) {
            inputProportionValue = qty / stdQty;
            proportionInput.value = formatNumberForInput(inputProportionValue);
        } else {
            proportionInput.value = '';
        }
    }

    if (temporalProportionInput) {
        const temporalValue = getMaterializationTemporalInputUnitProportionValue(materializationForCalc, inputProportionValue);
        temporalProportionInput.value = (temporalValue !== null && temporalValue !== undefined)
            ? formatNumberForInput(temporalValue)
            : '';
    }

    // Atualizar todas as colunas derivadas de proporção temporal
    const allRows = (pageState.materializations || []).filter(mat => !mat.isDeleted);
    const temporalProportionValues = allRows.map(mat => getMaterializationTemporalInputUnitProportionValue(mat, getMaterializationInputUnitProportionValue(mat)));
    const totalTemporalProportion = temporalProportionValues.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    const productProductionTime = getCommitteeOptimizationProductionTimeValue();
    const temporalUnitProductDenominator = totalTemporalProportion + (productProductionTime || 0);

    // Armazenar Tempo Socialmente Necessário para Produzir Uma Unidade
    pageState.sociallyNecessaryTimePerUnit = temporalUnitProductDenominator;

    allRows.forEach((mat, idx) => {
        const totalCostInputEl = document.querySelector(`input[data-temporal-proportion-insumo-for="${mat.id}"]`);
        const unitProductInputEl = document.querySelector(`input[data-temporal-proportion-unit-product-for="${mat.id}"]`);
        const value = parseFloat(temporalProportionValues[idx]) || 0;
        let temporalCostShare = '0';
        if (totalTemporalProportion > 0) {
            temporalCostShare = formatNumberForInput(value / totalTemporalProportion);
        }

        let unitProductShare = '';
        if (temporalUnitProductDenominator > 0) {
            unitProductShare = formatNumberForInput(value / temporalUnitProductDenominator);
        }

        if (totalCostInputEl) {
            totalCostInputEl.value = temporalCostShare;
        }

        if (unitProductInputEl) {
            unitProductInputEl.value = unitProductShare;
        }
    });
}

function loadMaterializationMetadata() {
    if (globalState.materializationMetadataLoaded) {
        return Promise.resolve(globalState.materializationMetadataById);
    }

    if (globalState.materializationMetadataPromise) {
        return globalState.materializationMetadataPromise;
    }

    globalState.materializationMetadataPromise = fetch('/api/social-materializations/full', {
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao carregar metadados das materializações');
        }
        return response.json();
    })
    .then(materializations => {
        const metadataById = {};

        (materializations || []).forEach(materialization => {
            metadataById[materialization.id] = materialization;
        });

        globalState.materializationMetadataById = metadataById;
        globalState.materializationMetadataLoaded = true;

        return metadataById;
    })
    .catch(error => {
        console.error('Erro ao carregar metadados das materializações:', error);
        return globalState.materializationMetadataById;
    })
    .finally(() => {
        globalState.materializationMetadataPromise = null;
    });

    return globalState.materializationMetadataPromise;
}

function loadMaterializationProductionTimes() {
    if (globalState.materializationProductionTimeLoaded) {
        return Promise.resolve(globalState.materializationProductionTimeById);
    }

    if (globalState.materializationProductionTimePromise) {
        return globalState.materializationProductionTimePromise;
    }

    globalState.materializationProductionTimePromise = fetch('/api/instances?type=PLANNERCOUNCIL', {
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao carregar Conselho Planificador');
        }
        return response.json();
    })
    .then(plannerCouncils => {
        const firstPlanner = Array.isArray(plannerCouncils) && plannerCouncils.length > 0
            ? plannerCouncils[0]
            : null;

        if (!firstPlanner || !firstPlanner.id) {
            return [];
        }

        globalState.plannerCouncilId = firstPlanner.id;

        return fetch(`/api/planification/optimization-config/results/by-instance/${firstPlanner.id}`, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        }).then(response => {
            if (!response.ok) {
                return [];
            }
            return response.json();
        });
    })
    .then(results => {
        const productionTimeById = {};

        (results || []).forEach(result => {
            if (!result || result.materializationId === undefined || result.materializationId === null) {
                return;
            }
            if (result.productionTime === undefined || result.productionTime === null || result.productionTime === '') {
                return;
            }
            productionTimeById[result.materializationId] = result.productionTime;
        });

        globalState.materializationProductionTimeById = productionTimeById;
        globalState.materializationProductionTimeLoaded = true;

        return productionTimeById;
    })
    .catch(error => {
        console.error('Erro ao carregar tempos de produção por materialização:', error);
        return globalState.materializationProductionTimeById;
    })
    .finally(() => {
        globalState.materializationProductionTimePromise = null;
    });

    return globalState.materializationProductionTimePromise;
}

function loadMaterializationSociallyNecessaryTimes() {
    if (globalState.materializationSociallyNecessaryTimeLoaded) {
        return Promise.resolve(globalState.materializationSociallyNecessaryTimeById);
    }
    if (globalState.materializationSociallyNecessaryTimePromise) {
        return globalState.materializationSociallyNecessaryTimePromise;
    }
    globalState.materializationSociallyNecessaryTimePromise = fetch('/api/planification/optimization-config/results/socially-necessary-times', {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' }
    })
    .then(response => {
        if (!response.ok) return {};
        return response.json();
    })
    .then(timesByMaterializationId => {
        globalState.materializationSociallyNecessaryTimeById = timesByMaterializationId || {};
        globalState.materializationSociallyNecessaryTimeLoaded = true;
        return globalState.materializationSociallyNecessaryTimeById;
    })
    .catch(error => {
        console.error('Erro ao carregar Tempo Socialmente Necessário por materialização:', error);
        return globalState.materializationSociallyNecessaryTimeById;
    })
    .finally(() => {
        globalState.materializationSociallyNecessaryTimePromise = null;
    });
    return globalState.materializationSociallyNecessaryTimePromise;
}

function enrichMaterializationsWithMetadata(materializations) {
    if (!Array.isArray(materializations) || materializations.length === 0) {
        return materializations || [];
    }

    return materializations.map(materialization => {
        const metadata = globalState.materializationMetadataById[materialization.id];
        if (!metadata) {
            return materialization;
        }

        return {
            ...materialization,
            measurementUnit: materialization.measurementUnit || metadata.measurementUnit || null,
            measurementUnitId: materialization.measurementUnitId ?? metadata.measurementUnitId,
            measurementUnitName: materialization.measurementUnitName || metadata.measurementUnitName || '',
            standardQuantityPerUnit: materialization.standardQuantityPerUnit ?? metadata.standardQuantityPerUnit,
            productionTime: materialization.productionTime ?? globalState.materializationProductionTimeById[materialization.id] ?? metadata.productionTime
        };
    });
}

// LOG DE INICIALIZAÇÃO
console.log('=== committee.js carregado ==');

// Configurar event listeners quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOMContentLoaded disparado ===');
    
    // Verificar se há parâmetros na URL
    const urlParams = new URLSearchParams(window.location.search);
    let cityCode = urlParams.get('cityCode');
    let cityName = urlParams.get('cityName');
    const idParam = urlParams.get('id'); // Pode ser ID numérico ou CNPJ
    const cnpjParam = urlParams.get('cnpj'); // CNPJ explícito (URL antiga)
    const factoryName = urlParams.get('name');
    const instanceName = urlParams.get('instance');
    
    // Tratar cityCode vazio como null
    if (cityCode === '') cityCode = null;
    if (cityName === '') cityName = null;
    
    console.log('Parâmetros URL:', { cityCode, cityName, idParam, cnpjParam, factoryName, instanceName });
    
    // Determinar se temos um ID numérico ou CNPJ
    let factoryId = null;
    let cnpj = null;
    
    if (idParam) {
        // Se idParam tem 14 dígitos, é CNPJ
        if (idParam.length === 14 && /^\d{14}$/.test(idParam)) {
            cnpj = idParam;
            console.log('📋 Detectado CNPJ no parâmetro id:', cnpj);
        } else {
            // Caso contrário, é ID numérico
            factoryId = parseInt(idParam);
            console.log('🔢 Detectado ID numérico no parâmetro id:', factoryId);
        }
    } else if (cnpjParam) {
        cnpj = cnpjParam;
        console.log('📋 CNPJ fornecido explicitamente:', cnpj);
    }
    
    // Event listener para seleção de instância
    const instanceSelect = document.getElementById('instanceSelect');
    if (instanceSelect) {
        instanceSelect.addEventListener('change', function() {
            const committeeId = this.value;
            if (committeeId) {
                // Mostrar seção da matriz
                document.getElementById('matrixSection').style.display = 'block';
                
                // Inicializar o estado com os dados do comitê selecionado
                initializePageState(committeeId);
            } else {
                // Ocultar seção da matriz
                document.getElementById('matrixSection').style.display = 'none';
                
                // Resetar estado
                resetPageState();
            }
        });
    }
    
    // Event listener para o botão salvar
    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        saveButton.addEventListener('click', saveCommitteeState);
    }
    
    // Event listener para o botão de adicionar materialização
    const addStockDemandBtn = document.getElementById('addStockDemandBtn');
    if (addStockDemandBtn) {
        addStockDemandBtn.addEventListener('click', function(event) {
            openMaterializationSelect(event);
        });
    }
    
    // Event listener para o botão de proposta
    const openPropostaBtn = document.getElementById('openPropostaBtn');
    if (openPropostaBtn) {
        openPropostaBtn.addEventListener('click', openPropostaModal);
    }
    
    // Botão para atualizar demandas e metas
    const btnUpdateDemandsAndGoals = document.getElementById('btnUpdateDemandsAndGoals');
    if (btnUpdateDemandsAndGoals) {
        btnUpdateDemandsAndGoals.addEventListener('click', updateDemandsAndGoals);
    }
    
    // Event listener para o botão "Plano"
    const btnShowPlan = document.getElementById('btnShowPlan');
    if (btnShowPlan) {
        btnShowPlan.addEventListener('click', showProductPlan);
    }
    
    // Caso 0: URL com ID numérico direto (novo fluxo)
    if (factoryId) {
        console.log('🎯 CASO 0: Carregando diretamente pelo ID da fábrica:', factoryId);
        
        // Determinar cityCode para filtrar a lista
        if (cityCode) {
            console.log('📋 Carregando lista de fábricas da cidade:', cityCode);
            loadInstanceSelect(cityCode)
                .then(() => {
                    console.log('✅ Lista carregada, agora selecionando fábrica ID:', factoryId);
                    return selectInstanceById(factoryId);
                })
                .catch(error => {
                    console.error('❌ Erro ao carregar lista ou selecionar fábrica:', error);
                    alert(`Erro ao carregar dados:\n${error.message}`);
                });
        } else {
            console.warn('⚠️ Sem cityCode, carregando TODAS as comissões');
            loadInstanceSelect(null)
                .then(() => {
                    console.log('✅ Lista completa carregada, selecionando fábrica ID:', factoryId);
                    return selectInstanceById(factoryId);
                })
                .catch(error => {
                    console.error('❌ Erro ao carregar lista ou selecionar fábrica:', error);
                    alert(`Erro ao carregar dados:\n${error.message}`);
                });
        }
    }
    // Caso 1: URL vinda do mapa com CNPJ (com ou sem cityCode/cityName)
    else if (cnpj) {
        console.log('🏭 CASO 1: Carregando fábrica do mapa via CNPJ', { cityCode, cityName, cnpj, factoryName });
        
        // Buscar ou criar a fábrica primeiro
        findOrCreateFactory(cityCode, cityName, cnpj, factoryName)
            .then(factory => {
                if (!factory || !factory.id) {
                    console.error('❌ Fábrica retornada sem ID:', factory);
                    throw new Error('Fábrica criada/encontrada, mas sem ID');
                }
                
                console.log('✅ Fábrica retornada:', factory);
                
                // Atualizar a URL para usar o ID real da fábrica em vez do CNPJ
                const urlParams = new URLSearchParams(window.location.search);
                urlParams.set('id', factory.id);
                urlParams.delete('cnpj'); // Remover CNPJ se existir
                window.history.replaceState({}, '', `${window.location.pathname}?${urlParams}`);
                console.log('🔄 URL atualizada para usar ID da fábrica:', factory.id);
                
                // Usar cityCode da fábrica se não veio na URL
                const factoryCityCode = cityCode || factory.cityCode;
                
                if (factoryCityCode) {
                    console.log('📋 Carregando lista de fábricas da cidade:', factoryCityCode);
                    // Carregar lista de fábricas da cidade e aguardar a Promise
                    return loadInstanceSelect(factoryCityCode)
                        .then(() => {
                            console.log('✅ Lista carregada, agora selecionando fábrica ID:', factory.id);
                            return selectInstanceById(factory.id);
                        });
                } else {
                    console.warn('⚠️ Sem cityCode, carregando TODAS as comissões');
                    // Se não tem cityCode, carregar todas e selecionar
                    return loadInstanceSelect(null)
                        .then(() => {
                            console.log('✅ Lista completa carregada, selecionando fábrica ID:', factory.id);
                            return selectInstanceById(factory.id);
                        });
                }
            })
            .catch(error => {
                console.error('❌ Erro ao buscar/criar fábrica:', error);
                alert(`Erro ao carregar dados da fábrica:\n${error.message}\n\nTente novamente.`);
            });
    }
    // Caso 2: URL com nome de instância (legado)
    else if (instanceName) {
        loadInstanceSelect();
        selectInstanceByName(instanceName);
    }
    // Caso 3: Sem parâmetros - carregar lista completa
    else {
        loadInstanceSelect();
    }
    
    // Configurar verificação antes de sair da página com alterações não salvas
    window.addEventListener('beforeunload', function(e) {
        if (pageState.isDirty) {
            const message = 'Você tem alterações não salvas. Tem certeza que deseja sair?';
            e.returnValue = message;
            return message;
        }
    });
});

// Funções para carregar dados

/**
 * Carrega o select de instâncias
 * @param {string} cityCode - Código IBGE da cidade (opcional)
 * @returns {Promise} Promise que resolve quando o select está populado
 */
function loadInstanceSelect(cityCode = null) {
    console.log('>>> loadInstanceSelect chamado, cityCode:', cityCode);
    
    const select = document.getElementById('instanceSelect');
    if (!select) {
        console.error('❌ Select #instanceSelect não encontrado no DOM');
        alert('ERRO: Elemento select não encontrado. Verifique o HTML.');
        return Promise.reject(new Error('Select não encontrado'));
    }
    
    console.log('✅ Select encontrado:', select);
    console.log(`📋 Carregando select de instâncias${cityCode ? ` para cidade ${cityCode}` : ' (TODOS)'}`);
    
    // Limpar TODAS as opções anteriores
    select.innerHTML = '<option value="">Carregando...</option>';
    select.disabled = true;
    
    // Se cityCode foi fornecido, carregar apenas fábricas dessa cidade
    const endpoint = cityCode 
        ? `/api/factories/by-city/${cityCode}` 
        : '/api/instances/committees';
    
    console.log(`🌐 Fazendo requisição para: ${endpoint}`);
    
    return fetch(endpoint)
        .then(response => {
            console.log('📡 Resposta recebida:', response.status, response.statusText);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }
            return response.json();
        })
        .then(committees => {
            console.log(`✅ Recebidos ${committees.length} comitês:`, committees);
            
            // Limpar e adicionar opção padrão
            select.innerHTML = '<option value="">Selecione uma instância...</option>';
            select.disabled = false;
            
            if (committees.length === 0) {
                console.warn('⚠️ Nenhuma fábrica encontrada');
                select.innerHTML = '<option value="">Nenhuma fábrica encontrada</option>';
                return;
            }
            
            committees.forEach(committee => {
                const option = document.createElement('option');
                option.value = committee.id;
                option.textContent = committee.name || 'Sem nome';
                select.appendChild(option);
                console.log(`  → Adicionado: ${committee.id} - ${committee.name}`);
            });
            console.log(`✅ Select populado com ${committees.length} opções`);
            console.log('📊 Opções finais no select:', Array.from(select.options).map(o => `${o.value}: ${o.textContent}`));
        })
        .catch(error => {
            console.error('❌ Erro ao carregar comitês:', error);
            select.innerHTML = '<option value="">Erro ao carregar</option>';
            select.disabled = false;
            alert(`Erro ao carregar lista de fábricas:\n${error.message}\n\nVerifique:\n1. Servidor Java está rodando?\n2. Console do navegador para mais detalhes`);
            throw error; // Re-throw para que o .catch() externo possa capturar
        });
}

/**
 * Seleciona uma instância pelo nome
 * @param {string} instanceName - Nome da instância a ser selecionada
 */
function selectInstanceByName(instanceName) {
    const select = document.getElementById('instanceSelect');
    if (!select) return;
    
    // Aguardar um pouco para garantir que o select foi carregado
    setTimeout(() => {
        const options = select.options;
        let found = false;
        
        for (let i = 0; i < options.length; i++) {
            if (options[i].textContent.trim() === instanceName.trim()) {
                select.value = options[i].value;
                // Disparar evento de change para carregar os dados
                const event = new Event('change');
                select.dispatchEvent(event);
                found = true;
                break;
            }
        }
        
        if (!found) {
            console.warn(`Instância "${instanceName}" não encontrada. Tentando novamente...`);
            // Se não encontrou, pode ser que o select ainda não foi carregado
            // Tentar novamente após mais tempo
            setTimeout(() => {
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].textContent.trim() === instanceName.trim()) {
                        select.value = select.options[i].value;
                        const event = new Event('change');
                        select.dispatchEvent(event);
                        break;
                    }
                }
            }, 1000);
        }
    }, 500);
}

/**
 * Seleciona uma instância pelo ID
 * @param {number} instanceId - ID da instância a ser selecionada  
 * @returns {Promise} Promise que resolve quando a seleção é concluída
 */
function selectInstanceById(instanceId) {
    return new Promise((resolve, reject) => {
        const select = document.getElementById('instanceSelect');
        if (!select) {
            console.error('❌ Select não encontrado');
            reject(new Error('Select não encontrado'));
            return;
        }
        
        // Garantir que instanceId seja string para comparação com select.value
        const targetId = String(instanceId);
        
        console.log(`🎯 Tentando selecionar instância ID: ${targetId} (tipo original: ${typeof instanceId})`);
        console.log(`📊 Select tem ${select.options.length} opções disponíveis`);
        console.log(`📋 Opções:`, Array.from(select.options).map(o => `[${o.value}] ${o.textContent}`));
        
        // Tentar selecionar imediatamente
        select.value = targetId;
        
        if (select.value == targetId) {
            console.log(`✅ Instância ID ${targetId} selecionada IMEDIATAMENTE`);
            // Disparar evento de change para carregar os dados
            const event = new Event('change', { bubbles: true });
            select.dispatchEvent(event);
            console.log('📤 Evento change disparado');
            resolve(true);
        } else {
            console.warn(`⚠️ Seleção imediata falhou. Aguardando 300ms...`);
            
            // Se não funcionou, aguardar um pouco e tentar novamente
            setTimeout(() => {
                console.log(`🔄 Segunda tentativa - Select tem ${select.options.length} opções`);
                select.value = targetId;
                
                if (select.value == targetId) {
                    console.log(`✅ Instância ID ${targetId} selecionada na SEGUNDA tentativa`);
                    const event = new Event('change', { bubbles: true });
                    select.dispatchEvent(event);
                    console.log('📤 Evento change disparado');
                    resolve(true);
                } else {
                    console.error(`❌ FALHA ao selecionar instância ID ${targetId}`);
                    console.error(`📊 IDs disponíveis:`, Array.from(select.options).map(o => o.value).filter(v => v));
                    console.error(`🔍 Procurando por ID: ${targetId} (tipo: ${typeof targetId})`);
                    console.error(`📍 Select.value atual: "${select.value}" (tipo: ${typeof select.value})`);
                    reject(new Error(`Instância ID ${targetId} não encontrada no select`));
                }
            }, 300);
        }
    });
}

/**
 * Busca ou cria uma fábrica pelo CNPJ
 * @param {string} cityCode - Código IBGE da cidade
 * @param {string} cityName - Nome da cidade
 * @param {string} cnpj - CNPJ da fábrica
 * @param {string} name - Nome da fábrica (opcional)
 * @returns {Promise<Object>} - Promise com os dados da fábrica
 */
async function findOrCreateFactory(cityCode, cityName, cnpj, name) {
    console.log('🏭 findOrCreateFactory chamado:', { cityCode, cityName, cnpj, name });
    
    try {
        const params = new URLSearchParams({
            cnpj: cnpj
        });
        
        // Adicionar cityCode apenas se fornecido
        if (cityCode) {
            params.append('cityCode', cityCode);
        }
        
        // Adicionar cityName apenas se fornecido
        if (cityName) {
            params.append('cityName', cityName);
        }
        
        if (name) {
            params.append('name', name);
        }
        
        const url = `/api/factories/find-or-create?${params.toString()}`;
        console.log(`🌐 POST ${url}`);
        
        const response = await fetch(url, {
            method: 'POST'
        });
        
        console.log('📡 Resposta:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro na resposta:', errorText);
            throw new Error(`Erro ao buscar/criar fábrica: ${response.status} - ${errorText}`);
        }
        
        const factory = await response.json();
        console.log('✅ Fábrica retornada do servidor:', factory);
        console.log('  → ID:', factory.id, '(tipo:', typeof factory.id, ')');
        console.log('  → Nome:', factory.name);
        console.log('  → CNPJ:', factory.cnpj);
        console.log('  → Cidade:', factory.city);
        console.log('  → CityCode:', factory.cityCode);
        
        return factory;
    } catch (error) {
        console.error('❌ Erro em findOrCreateFactory:', error);
        throw error;
    }
}

/**
 * Carrega todas as materializações sociais disponíveis do servidor
 * e armazena no estado global
 */
function loadAllMaterializations() {
    // Evitar múltiplas chamadas simultâneas
    if (globalState.loadingMaterializations) {
        return Promise.resolve(globalState.allMaterializations || []);
    }
    
    globalState.loadingMaterializations = true;
    
    // Mostrar indicador de carregamento
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) loadingSpinner.style.display = 'inline-block';
    
    // Adicionar um timestamp para evitar cache do navegador
    const timestamp = new Date().getTime();
    
    return fetch(`/api/planification/available-materializations?_t=${timestamp}`, {
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao carregar materializações sociais');
        }
        return response.json();
    })
    .then(materializations => {
        globalState.allMaterializations = materializations;
        globalState.materializationsLoaded = true;
        console.log(`Carregadas ${materializations.length} materializações sociais do servidor`);
        return materializations;
    })
    .catch(error => {
        console.error('Erro ao carregar lista de materializações:', error);
        showErrorMessage('Erro ao carregar materializações. Por favor, tente novamente.');
        return [];
    })
    .finally(() => {
        globalState.loadingMaterializations = false;
        // Ocultar indicador de carregamento
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    });
}

function refreshTechnologicalMatrixMetadata() {
    return Promise.all([
        loadMaterializationMetadata(),
        loadMaterializationProductionTimes(),
        loadMaterializationSociallyNecessaryTimes(),
        loadCommitteeOptimizationData()
    ]).then(() => {
        pageState.materializations = enrichMaterializationsWithMetadata(pageState.materializations);
        updateAllUI();
    });
}

/**
 * Abre o modal de seleção de materialização para adicionar
 * à matriz tecnológica ou tabela de estoque/demanda
 */
function openMaterializationSelect(event) {
    // Evitar a propagação do evento para não fechar o modal imediatamente
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    if (!pageState.id) {
        showErrorMessage("Selecione um comitê primeiro");
        return;
    }

    // Forçar recarregamento da lista de materializações disponíveis
    globalState.materializationsLoaded = false;
    globalState.allMaterializations = [];

    // Abrir o modal com indicador de carregamento
    openAddInsumoModal();

    // Carregar materializações e preencher o modal
    loadAllMaterializations()
        .then(allMaterializations => {
            if (!allMaterializations || allMaterializations.length === 0) {
                renderAddInsumoModalList([]);
                return;
            }

            // Obter IDs das materializações atuais (não deletadas)
            const existingIds = pageState.materializations
                .filter(m => !m.isDeleted)
                .map(m => m.id);

            // Filtrar materializações que não estão na tabela
            const availableMaterializations = allMaterializations.filter(
                m => !existingIds.includes(m.id) && m.id !== pageState.socialMaterializationId
            );

            console.log(`Exibindo ${availableMaterializations.length} materializações disponíveis para adicionar`);
            renderAddInsumoModalList(availableMaterializations);
        })
        .catch(error => {
            console.error('Erro ao carregar materializações:', error);
            const container = document.getElementById('addInsumoListContainer');
            if (container) {
                container.innerHTML = '<p style="color: var(--error-color, #c62828);">Erro ao carregar materializações.</p>';
            }
        });
}

/**
 * Abre o modal de adicionar insumo.
 */
function openAddInsumoModal() {
    const modal = document.getElementById('addInsumoModal');
    const container = document.getElementById('addInsumoListContainer');
    if (!modal || !container) return;
    container.innerHTML = '<p style="color: var(--text-secondary, #666); font-style: italic;">Carregando...</p>';
    modal.style.display = 'block';
}

/**
 * Fecha o modal de adicionar insumo.
 */
function closeAddInsumoModal() {
    const modal = document.getElementById('addInsumoModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Renderiza a lista de materializações disponíveis no modal.
 */
function renderAddInsumoModalList(materializations) {
    const container = document.getElementById('addInsumoListContainer');
    if (!container) return;

    // Armazenar materializações para lookup
    window._addInsumoMaterializations = materializations;

    if (!materializations || materializations.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary, #666); font-style: italic;">Nenhuma materialização disponível. Todas as materializações já estão na tabela.</p>';
        return;
    }

    let html = '<div class="insumo-list">';
    materializations.forEach(mat => {
        const typeLabel = mat.type === 'SERVICE' ? 'Serviço' : 'Produto';
        html += `<div class="insumo-list-item" onclick="addInsumoFromModalById(${mat.id})" style="cursor: pointer; padding: 10px; margin-bottom: 4px; border: 1px solid var(--border-color, #444); border-radius: 4px; transition: background-color 0.2s;">
            <strong>${escapeHtml(mat.name || 'Materialização #' + mat.id)}</strong>
            <span style="color: var(--text-secondary, #888); font-size: 0.8em; margin-left: 8px;">(${typeLabel})</span>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Adiciona um insumo a partir do modal, buscando pelo ID na lista carregada.
 */
function addInsumoFromModalById(matId) {
    const materializations = window._addInsumoMaterializations || [];
    const mat = materializations.find(m => m.id === matId);
    if (mat) {
        addMaterialization(mat);
    }
    closeAddInsumoModal();
}

// Manter compatibilidade com código existente - funções stub para o dropdown antigo
function removeExistingDropdown() {
    const existingDropdown = document.querySelector('.materialization-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }
}

function showMaterializationDropdown(materializations) {
    // Função obsoleta - substituída por modal addInsumoModal.
    // Mantida para compatibilidade.
}

/**
 * Inicializa o estado da página com os dados do comitê - versão otimizada
 * que utiliza a nova API para obter todo o estado em uma única chamada
 * 
 * @param {number} committeeId ID do comitê a ser carregado
 */
function initializePageState(committeeId) {
    if (!committeeId) return;
    
    // Resetar estado
    resetPageState();
    pageState.id = committeeId;

    // Mostrar indicador de carregamento
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) loadingSpinner.style.display = 'inline-block';
    
    // Verificar se temos os dados em cache
    const cacheKey = `committee_state_${committeeId}`;
    if (localCache.has(cacheKey)) {
        const cachedState = localCache.get(cacheKey);
        
        // Atualizar o estado com dados do cache
        Object.assign(pageState, cachedState);
        pageState.materializations = (pageState.materializations || []).filter(m => m.id !== 17);
        globalState.technologicalQuantities = {};
        (pageState.materializations || []).forEach(materialization => {
            if (materialization.quantity !== undefined && materialization.quantity !== null && materialization.quantity !== '') {
                globalState.technologicalQuantities[materialization.id] = materialization.quantity;
            }
        });
        globalState.supplierChoices = cachedState.supplierChoices || {};
        globalState.supplierNames = cachedState.supplierNames || {};
        globalState.orderStatuses = cachedState.orderStatuses || {};
        
        // Atualizar a interface com os dados carregados
        updateAllUI();
        refreshTechnologicalMatrixMetadata();
        
        // Ocultar indicador de carregamento
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        
        console.log("Dados carregados do cache local");
        
        // Marcar como inicializado
        pageState.initialized = true;
        return;
    }
    
    // Se não temos em cache, buscar do servidor usando a nova API otimizada
    fetch(`/api/committees/${committeeId}/state`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar estado do comitê');
            }
            return response.json();
        })
        .then(data => {
            // Atualizar o estado com os dados recebidos
            pageState.id = data.id;
            pageState.committeeName = data.committeeName || "";
            pageState.producedQuantity = data.producedQuantity || 0;
            pageState.targetQuantity = data.targetQuantity || 0;
            pageState.workerEffectiveLimit = data.workerEffectiveLimit || 0;
            pageState.socialMaterializationId = data.socialMaterializationId;
            pageState.councilId = data.councilId;
            pageState.councilName = data.councilName;
            pageState.workerProposal = data.workerProposal || {
                workerLimit: 0,
                workerHours: 0,
                productionTime: 0,
                nightShift: false,
                weeklyScale: 5
            };
            pageState.members = data.members || [];
            pageState.materializations = (data.materializations || [])
                .filter(m => m.id !== 17); // Filtrar materialização genérica "Projetos"
            globalState.technologicalQuantities = {};
            pageState.materializations.forEach(materialization => {
                if (materialization.quantity !== undefined && materialization.quantity !== null && materialization.quantity !== '') {
                    globalState.technologicalQuantities[materialization.id] = materialization.quantity;
                }
            });
            globalState.supplierChoices = data.supplierChoices || {};
            globalState.supplierNames = data.supplierNames || {};
            globalState.orderStatuses = data.orderStatuses || {};
            pageState.materializations = enrichMaterializationsWithMetadata(pageState.materializations);

            // Armazenar em cache local
            localCache.set(cacheKey, {
                id: pageState.id,
                committeeName: pageState.committeeName,
                producedQuantity: pageState.producedQuantity,
                targetQuantity: pageState.targetQuantity,
                workerEffectiveLimit: pageState.workerEffectiveLimit,
                socialMaterializationId: pageState.socialMaterializationId,
                councilId: pageState.councilId,
                councilName: pageState.councilName,
                workerProposal: pageState.workerProposal,
                members: pageState.members,
                materializations: pageState.materializations,
                supplierChoices: globalState.supplierChoices,
                supplierNames: globalState.supplierNames,
                orderStatuses: globalState.orderStatuses
            }, 300000); // 5 minutos de cache
            
            // Armazenar dados de otimização se estiverem presentes antes do primeiro render
            pageState.optimizationData = data.optimizationData || null;

            // Atualizar a interface com os dados carregados
            updateAllUI();
            refreshTechnologicalMatrixMetadata();
            fetchProjectsSummary().then(() => updateTechnologicalMatrixTable());
            
            // Ocultar indicador de carregamento
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            
            // Marcar como inicializado
            pageState.initialized = true;
            console.log("Dados carregados do servidor e armazenados em cache");
            
            // Log para debug se os dados de otimização foram carregados
            if (pageState.optimizationData) {
                console.log("Dados de otimização carregados durante a inicialização");
            } else {
                console.log("Nenhum dado de otimização disponível na inicialização");
            }
        })
        .catch(error => {
            console.error('Erro ao carregar estado do comitê:', error);
            showErrorMessage('Erro ao carregar dados do comitê. Por favor, tente novamente.');
            
            // Ocultar indicador de carregamento
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        });
}

/**
 * Reseta o estado da página para os valores iniciais
 */
function resetPageState() {
    pageState.id = null;
    pageState.committeeName = "";
    pageState.producedQuantity = 0;
    pageState.targetQuantity = 0;
    pageState.workerEffectiveLimit = 0;
    pageState.socialMaterializationId = null;
    pageState.councilId = null;
    
    pageState.workerProposal = {
        workerLimit: 0,
        workerHours: 0,
        productionTime: 0,
        nightShift: false,
        weeklyScale: 5,
        planningWorkerLimit: null,
        planningWorkerHours: null,
        planningProductionTime: null,
        planningNightShift: null,
        planningWeeklyScale: null,
        planningSociallyNecessaryTimePerUnit: null,
        planifiedWorkerLimit: null,
        planifiedWorkerHours: null,
        planifiedProductionTime: null,
        planifiedNightShift: null,
        planifiedWeeklyScale: null,
        planifiedSociallyNecessaryTimePerUnit: null
    };
    
    pageState.members = [];
    pageState.materializations = [];
    pageState.optimizationData = null;
    
    pageState.initialized = false;
    pageState.isDirty = false;
    globalState.committeeOptimizationDataPromise = null;
    globalState.technologicalQuantities = {};
    globalState.supplierChoices = {};
    globalState.supplierNames = {};
    globalState.orderStatuses = {};
    globalState.currentSupplierInputId = null;
    globalState.technologicalQuantitiesHydratedFromTensor = false;
}

/**
 * Atualiza toda a interface com base no estado atual
 */
function updateAllUI() {
    updateBasicDataUI();
    updateCouncilInfoUI();
    updateWorkerProposalUI();
    updateMembersUI();
    updateMaterializationsUI();
}

/**
 * Atualiza a interface com as informações do Conselho Popular
 */
function updateCouncilInfoUI() {
    const councilInfo = document.getElementById('councilInfo');
    const councilNameDisplay = document.getElementById('councilNameDisplay');
    
    if (!councilInfo || !councilNameDisplay) {
        console.log('Elementos de informação do conselho não encontrados');
        return;
    }
    
    if (pageState.councilName) {
        councilNameDisplay.textContent = pageState.councilName;
        councilInfo.style.display = 'block';
        console.log('Exibindo informação do conselho:', pageState.councilName);
    } else if (pageState.councilId) {
        councilNameDisplay.textContent = `Conselho ID: ${pageState.councilId}`;
        councilInfo.style.display = 'block';
        console.log('Exibindo ID do conselho (nome não disponível):', pageState.councilId);
    } else {
        councilInfo.style.display = 'none';
        console.log('Nenhum conselho associado');
    }
}

/**
 * Atualiza a interface com os dados básicos do comitê
 */
function updateBasicDataUI() {
    // Em vez de retornar imediatamente, vamos fazer um log e continuar
    // tentando processar o que for possível com os dados disponíveis
    if (!pageState.initialized) {
        console.log("Aviso: Tentativa de atualizar UI com dados não inicializados");
        // Continuamos a execução mesmo sem inicialização completa
    }
    
    // Atualizar nome do comitê se disponível
    if (pageState.committeeName) {
        document.title = `Comitê: ${pageState.committeeName}`;
    } else {
        document.title = "Comitê";
    }
    
    // Preencher campos da tabela de produção e meta com verificação de existência
    const producedQuantityInput = document.getElementById('producedQuantity');
    const remainingQuantityCell = document.getElementById('remainingQuantity');
    const productNameTargetSection = document.getElementById('productNameTargetSection');
    const productNameTechnologicalVector = document.getElementById('productNameTechnologicalVector');
    
    // Verificar se os elementos foram encontrados e registrar no console
    console.log('Elementos da UI encontrados:', {
        producedQuantityInput: !!producedQuantityInput,
        remainingQuantityCell: !!remainingQuantityCell,
        productNameTargetSection: !!productNameTargetSection,
        productNameTechnologicalVector: !!productNameTechnologicalVector
    });
    
    // Continuar com atualizações seguras, validando a existência dos elementos
    if (producedQuantityInput) {
        producedQuantityInput.value = formatNumberForDisplay(pageState.producedQuantity);
        
        // Adicionar evento para atualizar quando o valor mudar
        producedQuantityInput.onchange = function() {
            pageState.producedQuantity = parseDecimalInput(this.value);
            pageState.isDirty = true;
            
            // Atualizar o valor exibido de quantidade restante
            if (remainingQuantityCell) {
                const remaining = (pageState.targetQuantity || 0) - (pageState.producedQuantity || 0);
                remainingQuantityCell.textContent = formatNumberForDisplay(remaining);
                remainingQuantityCell.classList.toggle('remaining-positive', remaining > 0);
            }
        };
    }
    
    // Atualizar quantidade restante
    if (remainingQuantityCell) {
        const remaining = (pageState.targetQuantity || 0) - (pageState.producedQuantity || 0);
        remainingQuantityCell.textContent = formatNumberForDisplay(remaining);
        remainingQuantityCell.classList.toggle('remaining-positive', remaining > 0);
    }
    
    // Atualizar nome do produto nas seções correspondentes
    if (pageState.socialMaterializationId && pageState.materializations) {
        // Buscar a materialização social associada ao comitê
        const socialMaterialization = pageState.materializations.find(
            m => m.id === pageState.socialMaterializationId
        );
        
        if (socialMaterialization) {
            const name = socialMaterialization.name || `Materialização #${socialMaterialization.id}`;
            
            // Atualizar os elementos com o nome do produto
            if (productNameTargetSection) {
                productNameTargetSection.textContent = name;
            }
            
            if (productNameTechnologicalVector) {
                productNameTechnologicalVector.textContent = 'Quantidade';
            }
            
            // NOVO: Atualizar também todos os spans com a classe optimization-product-name
            const productNameElements = document.querySelectorAll('.optimization-product-name');
            productNameElements.forEach(element => {
                element.textContent = name;
            });
            
            // Log para depuração
            console.log(`Nome do produto atualizado para: ${name} em ${productNameElements.length} elementos`);
        } else {
            console.warn(`Materialização com ID ${pageState.socialMaterializationId} não encontrada no array de materializações`);
        }
    } else {
        console.info("Não foi possível atualizar o nome do produto: ID de materialização ou array de materializações não definidos");
    }
    
    // Exibir o botão de proposta se o elemento existe
    const committeeControls = document.getElementById('committeeControls');
    if (committeeControls) {
        committeeControls.style.display = 'flex';
        console.log("Controles do comitê configurados para display: flex");
    }
    
    // Adicionar estilo para quantidade restante se não existir
    if (!document.querySelector('style#remaining-style')) {
        const style = document.createElement('style');
        style.id = 'remaining-style';
        style.textContent = `
            .remaining-positive {
                font-weight: bold;
                color: var(--warning-color, #fd7e14);
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Atualiza a interface com os dados da proposta de trabalhadores
 */
function updateWorkerProposalUI() {
    // Só precisamos atualizar quando o modal de proposta for aberto
    // Isso é feito na função openPropostaModal
}

/**
 * Atualiza a interface com os membros do comitê
 */
function updateMembersUI() {
    // A funcionalidade de exibir membros não está presente na interface HTML atual
    // Esta função será implementada quando a interface para isso for adicionada
}

/**
 * Atualiza a interface com as materializações sociais associadas ao comitê
 */
function updateMaterializationsUI() {
    // 1. Atualizar tabela de estoque e demanda
    updateDemandStockTable();
    
    // 2. Atualizar matriz tecnológica
    updateTechnologicalMatrixTable();
}

/**
 * Atualiza a tabela de estoque e demanda com base no estado atual
 */
function updateDemandStockTable() {
    const table = document.getElementById('demandStockTable');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    // Limpar tabela atual
    tbody.innerHTML = '';
    
    // Se não há materializações, mostrar mensagem
    if (!pageState.materializations || pageState.materializations.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="5" class="text-center">Não há dados de estoque/demanda disponíveis</td>';
        tbody.appendChild(tr);
        return;
    }
    
    // Determinar qual é a materialização de saída (produto do comitê)
    const outputMaterializationId = pageState.socialMaterializationId;
    
    // Filtrar materializações - incluir todas exceto as excluídas
    const filteredMaterializations = pageState.materializations.filter(mat => {
        // Pular materializações excluídas
        if (mat.isDeleted === true) return false;
        
        return true;
    });
    
    // Se não há materializações filtradas, mostrar mensagem
    if (filteredMaterializations.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="5" class="text-center">Não há dados de estoque/demanda para as materializações associadas</td>';
        tbody.appendChild(tr);
        return;
    }
    
    // Renderizar cada materialização filtrada
    filteredMaterializations.forEach(item => {
        const tr = document.createElement('tr');
        tr.dataset.materializationId = item.id;
        
        // Verificar se é a materialização principal do comitê
        const isMainProduct = (item.id === outputMaterializationId);
        
        // Adicionar classe especial se for o produto principal
        if (isMainProduct) {
            tr.classList.add('main-product-row');
        }
        
        // Calcular o saldo (estoque - demanda)
        const stock = parseDecimalInput(item.stock) || 0;
        const demand = parseDecimalInput(item.demand) || 0;
        const balance = stock - demand;
        
        // Construir o HTML da linha
        let rowHTML = `
            <td>${isMainProduct ? 
                `<strong>${item.name || 'Não especificado'}</strong> 
                <span class="badge main-product-badge" title="Materialização social da unidade produtiva gerida por esse comitê">
                  <i class="fas fa-industry"></i>
                </span>` 
                : item.name || 'Não especificado'}</td>
            <td>
                <input type="text" class="form-control stock-input" 
                    value="${formatNumberForDisplay(stock)}" 
                    data-id="${item.id}"
                    onchange="updateStockValue(${item.id}, this.value)">
            </td>
            <td>
                <input type="text" class="form-control demand-input" 
                    value="${formatNumberForDisplay(demand)}" 
                    data-id="${item.id}"
                    onchange="updateDemandValue(${item.id}, this.value)">
            </td>
            <td class="balance-cell ${balance < 0 ? 'negative' : ''}">${formatNumberForDisplay(balance)}</td>
            <td>
                <div class="action-buttons">
        `;
        
        // Adicionar botão de remoção apenas se não for o produto principal
        if (!isMainProduct) {
            rowHTML += `
                    <button class="action-btn remove-btn" onclick="removeMaterialization(${item.id})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
            `;
        }
        
        rowHTML += `
                </div>
            </td>
        `;
        
        tr.innerHTML = rowHTML;
        tbody.appendChild(tr);
    });
    
    // Adicionar estilos para células de saldo negativo e produto principal
    if (!document.querySelector('style#balance-and-product-style')) {
        const style = document.createElement('style');
        style.id = 'balance-and-product-style';
        style.textContent = `
            .balance-cell.negative {
                color: var(--danger-color, #dc3545);
                font-weight: bold;
            }
            
            .main-product-row {
                background-color: rgba(var(--primary-rgb, 33, 150, 243), 0.1);
            }
            
            .main-product-badge {
                background-color: var(--primary-color, #2196f3);
                color: white !important;
                padding: 5px 6px;
                border-radius: 50%;
                font-size: 0.8em;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 22px;
                height: 22px;
                margin-left: 8px;
                cursor: help;
                transition: transform 0.2s ease;
            }

            .main-product-badge:hover {
                transform: scale(1.15);
            }
            
            /* Garantir texto branco para todos os temas escuros */
            [data-theme="night"] .main-product-badge,
            [data-theme="ocean"] .main-product-badge,
            [data-theme="bolchevick"] .main-product-badge {
                color: white !important;
            }
            
            [data-theme="night"] .main-product-badge {
                background-color: var(--primary-color, #c62828);
            }
            
            [data-theme="night"] .main-product-row {
                background-color: rgba(198, 40, 40, 0.1);
            }
            
            /* Estilos específicos para tema Ocean */
            [data-theme="ocean"] .main-product-badge {
                background-color: var(--primary-color, #2196f3);
            }
            
            /* Estilos específicos para tema Bolchevick */
            [data-theme="bolchevick"] .main-product-badge {
                background-color: var(--primary-color, #c62828);
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Atualiza a tabela da matriz tecnológica com base no estado atual
 */
function updateTechnologicalMatrixTable() {
    const table = document.getElementById('technologicalMatrix');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    // Limpar tabela atual
    tbody.innerHTML = '';
    
    // Se não há produtos ou materializações, mostrar mensagem
    if (!pageState.materializations || pageState.materializations.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="8" class="text-center">Não há dados de coeficientes disponíveis</td>';
        tbody.appendChild(tr);
        return;
    }
    
    // Determinar qual é a materialização de saída (produto do comitê)
    const outputMaterializationId = pageState.socialMaterializationId;
    
    // Se não temos um produto definido, mostrar mensagem
    if (!outputMaterializationId) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="8" class="text-center">Produto do comitê não definido</td>';
        tbody.appendChild(tr);
        return;
    }
    
    // Filtrar materializações que não estão excluídas
    const inputMaterializations = pageState.materializations.filter(mat => {
        // Pular materializações excluídas
        if (mat.isDeleted === true) return false;
        
        return true;
    });
    
    // Se não há insumos, mostrar mensagem
    if (inputMaterializations.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="8" class="text-center">Não há insumos definidos para este produto</td>';
        tbody.appendChild(tr);
        return;
    }
    
    // Calcular todos os valores de proporção temporal e a soma total
    const temporalProportionValues = inputMaterializations.map(mat => getMaterializationTemporalInputUnitProportionValue(mat, getMaterializationInputUnitProportionValue(mat, getTechnologicalQuantityValue(mat))));
    const totalTemporalProportion = temporalProportionValues.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    const productProductionTime = getCommitteeOptimizationProductionTimeValue();
    const temporalUnitProductDenominator = totalTemporalProportion + (productProductionTime || 0);

    // Armazenar Tempo Socialmente Necessário para Produzir Uma Unidade
    pageState.sociallyNecessaryTimePerUnit = temporalUnitProductDenominator;

    // Linha especial "Projetos" (se houver projetos ativos)
    if (pageState.projectsSummary && pageState.projectsSummary.hasActiveProjects) {
        const ps = pageState.projectsSummary;
        const tr = document.createElement('tr');
        tr.classList.add('projects-row');
        const qtyVal = parseFloat(ps.totalHours) || 0;
        const qtyDisplay = formatNumberForInput(qtyVal);
        // Proporção = 1 (quantidade / grandeza = qtyVal / qtyVal)
        const projInputProportion = 1;
        // Tempo = Quantidade (para Projetos)
        const projProductionTime = qtyVal;
        const projTemporal = projInputProportion * projProductionTime;
        const totalTemporalWithProjects = totalTemporalProportion + projTemporal;
        const projCostShare = totalTemporalWithProjects > 0 ? projTemporal / totalTemporalWithProjects : 0;
        const denomWithProjects = totalTemporalWithProjects + (productProductionTime || 0);
        const projUnitShare = denomWithProjects > 0 ? projTemporal / denomWithProjects : 0;
        const projStandardQtyHtml = `<span class="technological-standard-quantity">x ${qtyDisplay} h</span>`;

        tr.innerHTML = `<td><div class="mat-name-inline"><strong onclick="showProductPlan()" style="cursor:pointer; color:var(--primary-color);">Projetos Públicos</strong><i class="fas fa-hard-hat supplier-icon" title="Projetos Públicos ativos: ${ps.projectCount}" style="margin-left:8px; color:#e65100;"></i></div></td>
            <td class="technological-quantity-cell">
                <div class="technological-proportion-line">
                    <input type="text" class="form-control" value="${qtyDisplay}" readonly tabindex="-1" aria-readonly="true">
                    <span class="technological-unit-label">h</span>
                </div>
            </td>
            <td class="technological-proportion-cell">
                <div class="technological-proportion-line">
                    <input type="text" class="form-control" value="${formatNumberForInput(projInputProportion)}" readonly tabindex="-1" aria-readonly="true">
                    ${projStandardQtyHtml}
                </div>
            </td>
            <td class="technological-production-time-cell">
                <input type="text" class="form-control" value="${formatNumberForDisplay(projProductionTime)}" readonly tabindex="-1" aria-readonly="true" title="${qtyDisplay} h">
            </td>
            <td class="technological-temporal-proportion-cell">
                <input type="text" class="form-control" value="${formatNumberForInput(projTemporal)}" readonly tabindex="-1" aria-readonly="true">
            </td>
            <td class="technological-product-proportion-cell">
                <input type="text" class="form-control" value="${formatNumberForInput(projCostShare)}" readonly tabindex="-1" aria-readonly="true">
            </td>
            <td class="technological-product-proportion-cell">
                <input type="text" class="form-control technological-temporal-proportion-unit-product-input" 
                       value="${formatNumberForInput(projUnitShare)}"
                       readonly tabindex="-1" aria-readonly="true">
            </td>
            <td><span style="font-size:0.8em; color:var(--text-secondary);">Prazo: ${parseFloat(ps.avgDeadline).toFixed(1)}</span></td>`;
        tbody.appendChild(tr);
    }

    inputMaterializations.forEach((mat, idx) => {
        const tr = document.createElement('tr');
        tr.dataset.materializationId = mat.id;

        const isMainProduct = (mat.id === outputMaterializationId);
        if (isMainProduct) {
            tr.classList.add('main-product-row');
        }

        const tensors = mat.technologicalTensors || {};
        const coeff = tensors[outputMaterializationId] || 0;
        const storedTensorValue = getStoredTechnologicalTensorValue(mat, outputMaterializationId);
        const productUnitProportion = mat.productUnitProportion;
        const quantityValue = getTechnologicalQuantityValue(mat);
        const standardQuantityLabel = getMaterializationStandardQuantityLabel(mat);
        const unitLabel = getMaterializationMeasurementUnitLabel(mat);
        const quantityDisplay = formatNumberForInput(quantityValue);
        const productUnitProportionDisplay = formatNumberForInput(productUnitProportion);
        const stdQty = parseFloat(mat.standardQuantityPerUnit);
        const inputProportionValue = getMaterializationInputUnitProportionValue(mat, quantityValue);
        const inputProportionDisplay = formatNumberForInput(inputProportionValue);
        const temporalProportionValue = parseFloat(temporalProportionValues[idx]) || 0;
        const temporalProportionDisplay = formatNumberForInput(temporalProportionValue);
        let temporalCostShare = '';
        if (totalTemporalProportion > 0 && temporalProportionValue !== null && temporalProportionValue !== undefined && !isNaN(temporalProportionValue)) {
            temporalCostShare = formatNumberForInput(temporalProportionValue / totalTemporalProportion);
        }
        let temporalUnitProductShare = '';
        if (temporalUnitProductDenominator > 0) {
            temporalUnitProductShare = formatNumberForInput(temporalProportionValue / temporalUnitProductDenominator);
        } else if (storedTensorValue !== null) {
            temporalUnitProductShare = formatNumberForInput(storedTensorValue);
        }
        const quantityUnitHtml = unitLabel ? `<span class="technological-unit-label">${escapeHtml(unitLabel)}</span>` : '';
        const standardQuantityHtml = standardQuantityLabel ? `<span class="technological-standard-quantity">x ${escapeHtml(standardQuantityLabel)}</span>` : '<span class="technological-standard-quantity">x</span>';
        const productionTimeValue = getMaterializationProductionTimeValue(mat);
        const productionTime = (productionTimeValue !== null && productionTimeValue !== undefined && productionTimeValue !== '')
            ? formatNumberForDisplay(productionTimeValue)
            : '';

        // Ícone de histórico
        let supplierIconHtml = '';
        if (!isMainProduct) {
            const supplierId = globalState.supplierChoices[mat.id];
            const hasSupplier = supplierId != null;
            const supplierName = hasSupplier ? (globalState.supplierNames[supplierId] || `Fornecedor #${supplierId}`) : '';
            const tooltip = 'Histórico de pedidos' + (hasSupplier ? ` (fornecedor padrão: ${supplierName})` : '');
            supplierIconHtml = `<i class="fas fa-history supplier-icon" title="${escapeHtml(tooltip)}" onclick="event.stopPropagation(); openOrderHistoryModal(${mat.id})" style="cursor: pointer; margin-left: 8px; margin-right: 4px;"></i>`;

            // Botão de confirmação de recebimento
            if (hasSupplier) {
                const status = globalState.orderStatuses[mat.id] || 'solicitada';
                if (status === 'produzida e enviada') {
                    supplierIconHtml += ` <button class="btn btn-sm" style="padding:1px 6px; font-size:0.7em; margin-left:4px;" onclick="event.stopPropagation(); confirmReceipt(${pageState.id}, ${mat.id}, ${outputMaterializationId})">Confirmar Recebimento</button>`;
                }
            }
        }

        tr.innerHTML = `
            <td>${isMainProduct ? `<div class="mat-name-inline"><strong>${mat.name || `Produto #${mat.id}`}</strong><span class="badge main-product-badge" title="Materialização social da unidade produtiva gerida por esse comitê"><i class="fas fa-industry"></i></span></div>` : (mat.name || `Insumo #${mat.id}`) + supplierIconHtml}</td>
            <td class="technological-quantity-cell">
                <div class="technological-proportion-line">
                    <input type="number" class="form-control technological-quantity-input" 
                           value="${quantityDisplay}" 
                           step="any"
                           inputmode="decimal"
                           data-materialization-id="${mat.id}"
                           onchange="updateTechnologicalQuantity(${mat.id}, this)">
                    ${quantityUnitHtml}
                </div>
            </td>
            <td class="technological-proportion-cell">
                <div class="technological-proportion-line">
                    <input type="text" class="form-control technological-coefficient-display technological-input-proportion" 
                           value="${inputProportionDisplay}"
                           data-proportion-for="${mat.id}"
                           data-std-qty="${stdQty || ''}"
                           readonly
                           tabindex="-1"
                           aria-readonly="true">
                    ${standardQuantityHtml}
                </div>
            </td>
            <td class="technological-production-time-cell">
                <input type="text" class="form-control technological-production-time-input"
                       value="${productionTime}"
                       readonly
                       tabindex="-1"
                       aria-readonly="true"
                       title="Tempo Localmente Necessário para Produzir 1 Unidade (h)">
            </td>
            <td class="technological-temporal-proportion-cell">
                <input type="text" class="form-control technological-temporal-proportion-input"
                       data-temporal-proportion-for="${mat.id}"
                       value="${temporalProportionDisplay}"
                       readonly
                       tabindex="-1"
                       aria-readonly="true">
            </td>
            <td class="technological-product-proportion-cell">
                <div class="technological-proportion-line">
                    <input type="text" class="form-control technological-coefficient-display technological-temporal-proportion-insumo-input" 
                           data-temporal-proportion-insumo-for="${mat.id}"
                           value="${temporalCostShare}"
                           readonly
                           tabindex="-1"
                           aria-readonly="true">
                </div>
            </td>
            <td class="technological-product-proportion-cell">
                <div class="technological-proportion-line">
                    <input type="text" class="form-control coefficient-input technological-coefficient-display technological-temporal-proportion-unit-product-input" 
                           data-input-id="${mat.id}"
                           data-output-id="${outputMaterializationId}"
                           data-temporal-proportion-unit-product-for="${mat.id}"
                           value="${temporalUnitProductShare}"
                           readonly
                           tabindex="-1"
                           aria-readonly="true">
                </div>
            </td>
            <td><!-- Espaço para ações (vazio para o produto principal) --></td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Salva o estado do comitê e limpa o cache local após salvamento
 */
function saveCommitteeState() {
    // Atualizar o estado com os valores atuais dos inputs
    updateStateFromUI();
    
    // Validar: produção não pode ser maior ou igual à meta
    if (pageState.producedQuantity >= pageState.targetQuantity) {
        showErrorMessage(`A quantidade produzida (${formatNumberForDisplay(pageState.producedQuantity)}) não pode ser maior ou igual à meta (${formatNumberForDisplay(pageState.targetQuantity)}). Ajuste os valores antes de salvar.`);
        return;
    }
    
    // Mostrar indicador de carregamento
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) loadingSpinner.style.display = 'inline-block';
    
    // Desabilitar botão de salvamento
    const saveButton = document.getElementById('saveButton');
    if (saveButton) saveButton.disabled = true;
    
    // Preparar os dados para envio - Não filtrar materializações marcadas como excluídas
    const committeeData = {
        id: pageState.id,
        committeeName: pageState.committeeName,
        producedQuantity: pageState.producedQuantity,
        targetQuantity: pageState.targetQuantity,
        workerEffectiveLimit: pageState.workerEffectiveLimit,
        socialMaterializationId: pageState.socialMaterializationId,
        councilId: pageState.councilId,
        workerProposal: pageState.workerProposal,
        members: pageState.members,
        // Certifique-se de que TODAS as materializações são enviadas, incluindo as com isDeleted: true
        materializations: pageState.materializations,
        // Tempo Socialmente Necessário para Produzir Uma Unidade
        sociallyNecessaryTimePerUnit: (pageState.sociallyNecessaryTimePerUnit !== undefined && pageState.sociallyNecessaryTimePerUnit !== null)
            ? pageState.sociallyNecessaryTimePerUnit
            : null,
        // Escolhas de fornecedor
        supplierChoices: globalState.supplierChoices
    };

    // Incluir materialização genérica "Projetos" (ID 17) se houver projetos ativos
    // para que o Elemento Tecnológico seja salvo e usado na planificação
    if (pageState.projectsSummary && pageState.projectsSummary.hasActiveProjects) {
        const projRow = document.querySelector('tr.projects-row');
        if (projRow) {
            const coeffInput = projRow.querySelector('input[data-tensor-project-coeff]');
            const unitShareInput = projRow.querySelector('.technological-temporal-proportion-unit-product-input');
            const coeffValue = unitShareInput ? parseFloat(unitShareInput.value) : 0;
            const qtyInput = projRow.querySelector('.technological-quantity-cell input');
            const qtyValue = qtyInput ? parseFloat(qtyInput.value) : (parseFloat(pageState.projectsSummary.totalHours) || 0);

            const projMat = {
                id: 17, // ID fixo da materialização genérica "Projetos"
                name: 'Projetos Públicos',
                type: 'PROJECT',
                quantity: qtyValue,
                demand: 0,
                stock: 0,
                isNew: false,
                isDeleted: false,
                technologicalTensors: {}
            };
            projMat.technologicalTensors[pageState.socialMaterializationId] = coeffValue || 0;
            committeeData.materializations = [...committeeData.materializations, projMat];
        }
    }
    
    // Salvar IDs de materializações que serão excluídas para atualizarmos a UI depois
    const deletedMaterializationIds = pageState.materializations
        .filter(m => m.isDeleted === true)
        .map(m => m.id);
    
    console.log(`Salvando ${pageState.materializations.length} materializações, ${deletedMaterializationIds.length} marcadas para exclusão`);
    
    // Enviar a requisição
    fetch('/api/committees/save-state', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(committeeData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao salvar dados do comitê');
        }
        return response.json();
    })
    .then(data => {
        // Ocultar indicador de carregamento
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        
        // Reabilitar botão de salvamento
        if (saveButton) saveButton.disabled = false;
        
        // Mostrar mensagem de sucesso
        showSuccessMessage('Dados salvos com sucesso!');
        
        // Resetar flag de alterações pendentes
        pageState.isDirty = false;
        
        // Atualizar o ID do comitê se for novo
        if (data.committeeId && !pageState.id) {
            pageState.id = data.committeeId;
            
            // Atualizar URL se necessário
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.set('id', data.committeeId);
            window.history.replaceState({}, '', `${window.location.pathname}?${urlParams}`);
        }
        
        // Importante: Limpar o cache local para forçar uma atualização na próxima carga
        // pois os dados no servidor foram alterados
        if (pageState.id) {
            localCache.remove(`committee_state_${pageState.id}`);
        }
        
        // Importante: Limpar os dados de materializações marcadas para exclusão
        // após serem removidas do banco de dados
        if (deletedMaterializationIds.length > 0) {
            console.log(`Removendo ${deletedMaterializationIds.length} materializações excluídas do estado local`);
            
            // Remover materializações excluídas do array atual
            pageState.materializations = pageState.materializations.filter(m => !m.isDeleted);
            
            // Limpar completamente o cache global de materializações para forçar recarregamento
            globalState.materializationsLoaded = false;
            globalState.allMaterializations = [];
            
            // Recarregar a lista de materializações disponíveis para atualizar o dropdown
            // com um pequeno atraso para garantir que o servidor concluiu a exclusão
            setTimeout(() => {
                loadAllMaterializations().then(() => {
                    console.log("Lista de materializações recarregada após exclusão");
                });
            }, 500);
            
            // Atualizar interface para refletir as exclusões
            updateMaterializationsUI();
        }
    })
    .catch(error => {
        console.error('Erro ao salvar comitê:', error);
        
        // Ocultar indicador de carregamento
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        
        // Reabilitar botão de salvamento
        if (saveButton) saveButton.disabled = false;
        
        // Mostrar mensagem de erro
        showErrorMessage('Erro ao salvar os dados. Por favor, tente novamente.');
    });
}

/**
 * Atualiza o estado com os valores atuais da interface
 */
function updateStateFromUI() {
    // Atualizar quantidade produzida
    const producedQuantityInput = document.getElementById('producedQuantity');
    if (producedQuantityInput) {
        pageState.producedQuantity = parseFloat(producedQuantityInput.value) || 0;
    }
    
    // Explicitamente atualizar valores de estoque e demanda de todas as materializações visíveis na tabela
    const stockInputs = document.querySelectorAll('.stock-input');
    const demandInputs = document.querySelectorAll('.demand-input');
    
    stockInputs.forEach(input => {
        const materializationId = parseInt(input.dataset.id);
        if (materializationId) {
            const materialization = pageState.materializations.find(m => m.id === materializationId);
            if (materialization) {
                materialization.stock = parseDecimalInput(input.value);
            }
        }
    });
    
    demandInputs.forEach(input => {
        const materializationId = parseInt(input.dataset.id);
        if (materializationId) {
            const materialization = pageState.materializations.find(m => m.id === materializationId);
            if (materialization) {
                materialization.demand = parseDecimalInput(input.value);
            }
        }
    });

    const quantityInputs = document.querySelectorAll('.technological-quantity-input');
    quantityInputs.forEach(input => {
        const materializationId = parseInt(input.dataset.materializationId);
        if (materializationId) {
            const materialization = pageState.materializations.find(m => m.id === materializationId);
            if (materialization) {
                materialization.quantity = parseDecimalInput(input.value);
            }
        }
    });
    
    // Verificar se há entradas com coeficientes que precisam ser atualizadas
    const coefficientInputs = document.querySelectorAll('.coefficient-input');
    coefficientInputs.forEach(input => {
        const inputId = parseInt(input.dataset.inputId);
        const outputId = parseInt(input.dataset.outputId);
        if (inputId && outputId) {
            const inputMat = pageState.materializations.find(m => m.id === inputId);
            if (inputMat) {
                if (!inputMat.technologicalTensors) {
                    inputMat.technologicalTensors = {};
                }
                inputMat.technologicalTensors[outputId] = parseDecimalInput(input.value);
            }
        }
    });
}

/**
 * Mostra uma mensagem de sucesso temporária
 */
function showSuccessMessage(message) {
    showNotification(message, 'success');
}

/**
 * Mostra uma mensagem de erro temporária
 */
function showErrorMessage(message) {
    showNotification(message, 'error');
}

function getPropostaZeroFields() {
    const fields = [
        { id: 'workerLimitProposta', label: 'Limite de Trabalhadores na Unidade de Produção' },
        { id: 'workerHoursProposta', label: 'Carga Horária Diária (h)' },
        { id: 'productionTimeProposta', label: 'Tempo para Produzir 1 Unidade (h)' },
        { id: 'weeklyScaleProposta', label: 'Escala semanal (dias)' }
    ];

    return fields.filter(field => {
        const input = document.getElementById(field.id);
        if (!input) return false;

        const parsedValue = parseFloat(input.value);
        return Number.isFinite(parsedValue) && parsedValue === 0;
    });
}

function updatePropostaZeroWarning(showToast = false) {
    const warningEl = document.getElementById('propostaZeroWarning');
    const zeroFields = getPropostaZeroFields();
    const hasZero = zeroFields.length > 0;

    if (warningEl) {
        warningEl.style.display = hasZero ? 'flex' : 'none';
    }

    if (showToast && hasZero && !globalState.propostaZeroWarningNotified) {
        showNotification(
            'Dados zerados nessa aba podem resultar em Participação Estimada (mensal) zerada também após o cálculo da planificação.',
            'warning'
        );
        globalState.propostaZeroWarningNotified = true;
    }

    if (!hasZero) {
        globalState.propostaZeroWarningNotified = false;
    }

    return hasZero;
}

function setupPropostaZeroWarningHandlers() {
    const propostaInputs = [
        'workerLimitProposta',
        'workerHoursProposta',
        'productionTimeProposta',
        'weeklyScaleProposta'
    ];

    propostaInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (!input) return;

        if (input.dataset.zeroWarningBound === '1') {
            return;
        }

        const handleWarningUpdate = () => updatePropostaZeroWarning(false);
        const handleWarningUpdateWithToast = () => updatePropostaZeroWarning(true);

        input.addEventListener('input', handleWarningUpdate);
        input.addEventListener('change', handleWarningUpdateWithToast);
        input.addEventListener('blur', handleWarningUpdateWithToast);

        input.dataset.zeroWarningBound = '1';
    });
}

// Funções para abrir modais

function openPropostaModal() {
    // Configurar campos do modal com dados atuais
    document.getElementById('unitName').textContent = pageState.committeeName || "---";
    
    // Não é mais necessário definir o nome do produto aqui, pois já
    // é definido na função updateBasicDataUI() durante o carregamento da página
    
    document.getElementById('workerLimitProposta').value = pageState.workerProposal.workerLimit || 0;
    document.getElementById('workerHoursProposta').value = pageState.workerProposal.workerHours || 0;
    document.getElementById('productionTimeProposta').value = pageState.workerProposal.productionTime || 0;
    document.getElementById('weeklyScaleProposta').value = pageState.workerProposal.weeklyScale || 5;
    document.getElementById('nightShiftProposta').checked = pageState.workerProposal.nightShift || false;

    // Tempo Socialmente Necessário (calculado na página, somente leitura)
    const sntField = document.getElementById('sociallyNecessaryTimeProposta');
    if (sntField) {
        sntField.value = pageState.sociallyNecessaryTimePerUnit != null ? pageState.sociallyNecessaryTimePerUnit : '';
    }

    const propostaError = document.getElementById('propostaError');
    if (propostaError) {
        propostaError.style.display = 'none';
        propostaError.textContent = '';
    }

    globalState.propostaZeroWarningNotified = false;
    setupPropostaZeroWarningHandlers();
    updatePropostaZeroWarning(false);

    // Preencher campos da aba "Capacidade Produtiva em Planejamento" (somente leitura)
    const wp = pageState.workerProposal;

    // Verificar se há dados de planejamento. Se todos os campos são null/undefined,
    // mostrar mensagem informativa ao invés dos campos.
    const hasPlanningData = wp.planningWorkerLimit != null || wp.planningWorkerHours != null ||
        wp.planningProductionTime != null || wp.planningWeeklyScale != null;
    const planningEmptyMessage = document.getElementById('planningEmptyMessage');
    const planningFieldsContainer = document.getElementById('planningFieldsContainer');
    if (hasPlanningData) {
        if (planningEmptyMessage) planningEmptyMessage.style.display = 'none';
        if (planningFieldsContainer) planningFieldsContainer.style.display = 'block';
        document.getElementById('planningWorkerLimit').value = wp.planningWorkerLimit || '';
        document.getElementById('planningWorkerHours').value = wp.planningWorkerHours || '';
        document.getElementById('planningProductionTime').value = wp.planningProductionTime || '';
        document.getElementById('planningWeeklyScale').value = wp.planningWeeklyScale || '';
        document.getElementById('planningNightShift').checked = wp.planningNightShift || false;
        const planningSNT = document.getElementById('planningSociallyNecessaryTime');
        if (planningSNT) planningSNT.value = wp.planningSociallyNecessaryTimePerUnit != null ? wp.planningSociallyNecessaryTimePerUnit : '';
    } else {
        if (planningEmptyMessage) planningEmptyMessage.style.display = 'block';
        if (planningFieldsContainer) planningFieldsContainer.style.display = 'none';
    }

    // Preencher campos da aba "Capacidade Produtiva Planificada" (somente leitura)
    const hasPlanifiedData = wp.planifiedWorkerLimit != null || wp.planifiedWorkerHours != null ||
        wp.planifiedProductionTime != null || wp.planifiedWeeklyScale != null;
    const planifiedEmptyMessage = document.getElementById('planifiedEmptyMessage');
    const planifiedFieldsContainer = document.getElementById('planifiedFieldsContainer');
    if (hasPlanifiedData) {
        if (planifiedEmptyMessage) planifiedEmptyMessage.style.display = 'none';
        if (planifiedFieldsContainer) planifiedFieldsContainer.style.display = 'block';
        document.getElementById('planifiedWorkerLimit').value = wp.planifiedWorkerLimit || '';
        document.getElementById('planifiedWorkerHours').value = wp.planifiedWorkerHours || '';
        document.getElementById('planifiedProductionTime').value = wp.planifiedProductionTime || '';
        document.getElementById('planifiedWeeklyScale').value = wp.planifiedWeeklyScale || '';
        document.getElementById('planifiedNightShift').checked = wp.planifiedNightShift || false;
        const planifiedSNT = document.getElementById('planifiedSociallyNecessaryTime');
        if (planifiedSNT) planifiedSNT.value = wp.planifiedSociallyNecessaryTimePerUnit != null ? wp.planifiedSociallyNecessaryTimePerUnit : '';
    } else {
        if (planifiedEmptyMessage) planifiedEmptyMessage.style.display = 'block';
        if (planifiedFieldsContainer) planifiedFieldsContainer.style.display = 'none';
    }
    
    // Configurar abas do modal e exibir a primeira aba por padrão
    setupPropostaModalTabs();

    // Exibir o modal
    document.getElementById('propostaModal').style.display = 'flex';
}

/**
 * Configura as abas do modal de produtividade
 */
function setupPropostaModalTabs() {
    const tabsContainer = document.getElementById('propostaModalTabs');
    if (!tabsContainer) return;

    // Atualizar textos das abas se necessário (garante atualização mesmo se HTML antigo estiver em cache)
    const tabTextMap = {
        'capacidade-produtiva-planificada': 'Capacidade Produtiva Planificada',
        'capacidade-produtiva-planejamento': 'Capacidade Produtiva em Planejamento',
        'proposta-capacidade-produtiva-declarada': 'Proposta de Capacidade Produtiva Declarada'
    };
    const tabs = tabsContainer.querySelectorAll('.tab');
    tabs.forEach(tab => {
        const dataTab = tab.getAttribute('data-tab');
        if (tabTextMap[dataTab]) {
            tab.textContent = tabTextMap[dataTab];
        }
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);

        newTab.addEventListener('click', function() {
            tabsContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            const modalBody = document.getElementById('propostaModal').querySelector('.modal-body');
            // Atualizar seletor para os novos IDs
            modalBody.querySelectorAll(':scope > .tab-content').forEach(c => c.classList.remove('active'));

            newTab.classList.add('active');
            const tabId = newTab.getAttribute('data-tab');
            const content = document.getElementById(tabId + '-content');
            if (content) content.classList.add('active');
        });
    });

    // Garantir que a primeira aba está ativa por padrão
    const allTabs = tabsContainer.querySelectorAll('.tab');
    const modalBody = document.getElementById('propostaModal').querySelector('.modal-body');
    const allContents = modalBody.querySelectorAll(':scope > .tab-content');
    allTabs.forEach(t => t.classList.remove('active'));
    allContents.forEach(c => c.classList.remove('active'));
    if (allTabs.length > 0) allTabs[0].classList.add('active');
    if (allContents.length > 0) allContents[0].classList.add('active');
}

function closePropostaModal() {
    document.getElementById('propostaModal').style.display = 'none';
}

function savePropostaInputs() {
    // Validar campos
    const workerLimit = parseInt(document.getElementById('workerLimitProposta').value);
    const workerHours = parseFloat(document.getElementById('workerHoursProposta').value);
    const productionTime = parseFloat(document.getElementById('productionTimeProposta').value);
    const weeklyScale = parseInt(document.getElementById('weeklyScaleProposta').value);
    const nightShift = document.getElementById('nightShiftProposta').checked;
    const hasZeroValues = updatePropostaZeroWarning(true);
    
    // Validações básicas
    if (isNaN(workerLimit) || workerLimit <= 0 ||
        isNaN(workerHours) || workerHours <= 0 ||
        isNaN(productionTime) || productionTime <= 0 ||
        isNaN(weeklyScale) || weeklyScale < 1 || weeklyScale > 7) {
        
        document.getElementById('propostaError').textContent = hasZeroValues
            ? 'Valores zerados não são permitidos. Dados zerados nessa aba podem resultar em Participação Estimada (mensal) zerada também após o cálculo da planificação.'
            : 'Todos os campos são obrigatórios e devem conter valores válidos.';
        document.getElementById('propostaError').style.display = 'block';
        return;
    }
    
    // Atualizar estado com os valores do formulário, preservando campos de planejamento e planificado
    pageState.workerProposal.workerLimit = workerLimit;
    pageState.workerProposal.workerHours = workerHours;
    pageState.workerProposal.productionTime = productionTime;
    pageState.workerProposal.nightShift = nightShift;
    pageState.workerProposal.weeklyScale = weeklyScale;
    
    pageState.isDirty = true;
    
    // Fechar modal
    closePropostaModal();
    
    // Mostrar mensagem de sucesso
    showSuccessMessage('Proposta atualizada com sucesso. Clique em "Salvar Alterações" para salvar as mudanças.');
}

/**
 * Atualiza o valor de estoque de uma materialização
 */
function updateStockValue(materializationId, value) {
    const stockValue = parseDecimalInput(value);
    
    // Buscar a materialização no estado
    const materialization = pageState.materializations.find(m => m.id === materializationId);
    if (!materialization) return;
    
    // Atualizar valor
    materialization.stock = stockValue;
    
    // Atualizar o saldo na interface
    updateBalanceCell(materializationId);
    
    // Marcar que há alterações pendentes
    pageState.isDirty = true;
}

/**
 * Atualiza o valor de demanda de uma materialização
 */
function updateDemandValue(materializationId, value) {
    const demandValue = parseDecimalInput(value);
    
    // Buscar a materialização no estado
    const materialization = pageState.materializations.find(m => m.id === materializationId);
    if (!materialization) return;
    
    // Atualizar valor
    materialization.demand = demandValue;
    
    // Atualizar o saldo na interface
    updateBalanceCell(materializationId);
    
    // Marcar que há alterações pendentes
    pageState.isDirty = true;
}

/**
 * Atualiza a célula de saldo para uma materialização
 */
function updateBalanceCell(materializationId) {
    const row = document.querySelector(`tr[data-materialization-id="${materializationId}"]`);
    if (!row) return;
    
    const stockInput = row.querySelector('.stock-input');
    const demandInput = row.querySelector('.demand-input');
    const balanceCell = row.querySelector('.balance-cell');
    
    if (!stockInput || !demandInput || !balanceCell) return;
    
    const stock = parseDecimalInput(stockInput.value);
    const demand = parseDecimalInput(demandInput.value);
    const balance = stock - demand;
    
    balanceCell.textContent = formatNumberForDisplay(balance);
    balanceCell.classList.toggle('negative', balance < 0);
}

/**
 * Atualiza um coeficiente no tensor tecnológico
 */
function updateTensorCoefficient(inputId, outputId, input) {
    const value = parseDecimalInput(input.value);
    
    // Buscar a materialização de entrada no estado
    const inputMat = pageState.materializations.find(m => m.id === inputId);
    if (!inputMat) return;
    
    // Garantir que o mapa de tensores exista
    if (!inputMat.technologicalTensors) {
        inputMat.technologicalTensors = {};
    }
    
    // Atualizar o coeficiente
    inputMat.technologicalTensors[outputId] = value;
    
    // Marcar que há alterações pendentes
    pageState.isDirty = true;
}

/**
 * Remove uma materialização do comitê
 */
function removeMaterialization(materializationId) {
    // Verificar se é a materialização principal do comitê
    if (materializationId === pageState.socialMaterializationId) {
        showErrorMessage("Não é possível remover o produto principal do comitê.");
        return;
    }
    
    if (!confirm("Tem certeza que deseja remover esta materialização?")) {
        return;
    }
    
    // Buscar o índice da materialização no array
    const index = pageState.materializations.findIndex(m => m.id === materializationId);
    if (index === -1) return;
    
    // Se a materialização já existe no servidor, marcá-la como excluída
    // em vez de removê-la completamente do array
    if (!pageState.materializations[index].isNew) {
        pageState.materializations[index].isDeleted = true;
    } else {
        // Se é uma materialização nova que ainda não foi salva, podemos
        // simplesmente removê-la do array
        pageState.materializations.splice(index, 1);
    }
    
    // Atualizar a interface
    updateMaterializationsUI();
    
    // Marcar que há alterações pendentes
    pageState.isDirty = true;
}

/**
 * Adiciona uma materialização à tabela de estoque/demanda e matriz tecnológica
 */
function addMaterialization(materialization) {
    if (!pageState.id) {
        showErrorMessage("Selecione um comitê primeiro");
        return;
    }
    
    // Verificar se já existe no estado
    const exists = pageState.materializations.some(
        m => m.id === materialization.id && !m.isDeleted
    );
    
    if (exists) {
        showErrorMessage(`A materialização "${materialization.name}" já existe`);
        return;
    }
    
    // Criar objeto para nova materialização
    const newMatState = {
        id: materialization.id,
        name: materialization.name,
        type: materialization.type || "PRODUCT",
        demand: 0,
        stock: 0,
        isNew: true,
        isDeleted: false,
        technologicalTensors: {}
    };
    
    // Se temos um produto definido para o comitê, adicionar relação de insumo
    if (pageState.socialMaterializationId) {
        newMatState.technologicalTensors[pageState.socialMaterializationId] = 0;
    }
    
    // Adicionar ao estado
    pageState.materializations.push(newMatState);
    
    // Atualizar interface
    updateMaterializationsUI();
    
    // Marcar que há alterações pendentes
    pageState.isDirty = true;
}

/**
 * Abre o modal de configuração de otimização para uma materialização
 */
function openOptimizationConfigModal(materializationId, materializationName) {
    // Esta funcionalidade parece ser parte da interface antiga
    // e não está completamente implementada no HTML atual
    alert("Funcionalidade de otimização não implementada nesta versão");
}

// Implementação de modais

/**
 * Abre o modal para criar nova materialização
 */
function openNewMaterializationModal() {
    // Fechar modal de adicionar insumo caso esteja aberto
    closeAddInsumoModal();

    const modal = document.getElementById('newMaterializationModal');
    const form = document.getElementById('newMaterializationForm');
    const errorMessage = document.getElementById('newMaterializationFormError');
    const successMessage = document.getElementById('newMaterializationFormSuccess');
    
    // Limpar mensagens e formulário
    if (errorMessage) errorMessage.style.display = 'none';
    if (successMessage) successMessage.style.display = 'none';
    if (form) form.reset();
    
    // Mostrar o modal
    if (modal) modal.style.display = 'flex';
    
    // Configurar o evento de submit do formulário
    if (form) {
        form.onsubmit = function(e) {
            e.preventDefault();
            createNewMaterialization();
        };
    }
}

/**
 * Fecha o modal de nova materialização
 */
function closeNewMaterializationModal() {
    const modal = document.getElementById('newMaterializationModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Cria nova materialização social
 */
function createNewMaterialization() {
    const nameInput = document.getElementById('materialName');
    const typeSelect = document.getElementById('materialType');
    const descriptionInput = document.getElementById('materialDescription');
    const spinner = document.getElementById('newMaterializationModalSpinner');
    const errorMessage = document.getElementById('newMaterializationFormError');
    const successMessage = document.getElementById('newMaterializationFormSuccess');
    
    // Validar campos
    if (!nameInput || !nameInput.value.trim()) {
        if (errorMessage) {
            errorMessage.textContent = 'O nome da materialização é obrigatório';
            errorMessage.style.display = 'block';
        }
        return;
    }
    
    // Preparar dados
    const payload = {
        name: nameInput.value.trim(),
        type: typeSelect ? typeSelect.value : 'PRODUCT',
        description: descriptionInput ? descriptionInput.value.trim() : ''
    };
    
    // Mostrar spinner
    if (spinner) spinner.style.display = 'inline-block';
    if (errorMessage) errorMessage.style.display = 'none';
    
    // Enviar para o servidor
    fetch('/api/planification/social-materializations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text || `Erro HTTP: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(newMaterialization => {
        // Mostrar mensagem de sucesso
        if (successMessage) {
            successMessage.textContent = `Materialização "${newMaterialization.name}" criada com sucesso!`;
            successMessage.style.display = 'block';
        }
        
        // Adicionar à tabela
        addMaterialization(newMaterialization);
        
        // Limpar o formulário
        if (document.getElementById('newMaterializationForm')) {
            document.getElementById('newMaterializationForm').reset();
        }
        
        // Fechar o modal após um curto atraso
        setTimeout(() => {
            closeNewMaterializationModal();
        }, 2000);
    })
    .catch(error => {
        console.error('Erro ao criar materialização:', error);
        if (errorMessage) {
            errorMessage.textContent = `Erro ao criar materialização: ${error.message}`;
            errorMessage.style.display = 'block';
        }
    })
    .finally(() => {
        if (spinner) spinner.style.display = 'none';
    });
}

/**
 * Fecha o modal de resultados de otimização
 */
function closeOptimizationResultModal() {
    const modal = document.getElementById('optimizationResultModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Configura as abas do modal de resultados de otimização
 */
function setupOptimizationModalTabs() {
    const tabsContainer = document.getElementById('optimizationModalTabs');
    if (!tabsContainer) return;

    const tabs = tabsContainer.querySelectorAll('.tab');
    tabs.forEach(tab => {
        // Remover listeners antigos clonando o elemento
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);

        newTab.addEventListener('click', function() {
            // Desativar todas as abas e conteúdos
            tabsContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            const modal = document.getElementById('optimizationResultModal');
            modal.querySelectorAll(':scope > .modal-content > .tab-content').forEach(c => c.classList.remove('active'));

            // Ativar a aba clicada e o conteúdo correspondente
            newTab.classList.add('active');
            const tabId = newTab.getAttribute('data-tab');
            const content = document.getElementById(tabId + '-content');
            if (content) content.classList.add('active');
        });
    });

    // Garantir que a primeira aba está ativa por padrão
    const allTabs = tabsContainer.querySelectorAll('.tab');
    const allContents = document.getElementById('optimizationResultModal')
        .querySelectorAll(':scope > .modal-content > .tab-content');
    allTabs.forEach(t => t.classList.remove('active'));
    allContents.forEach(c => c.classList.remove('active'));
    if (allTabs.length > 0) allTabs[0].classList.add('active');
    if (allContents.length > 0) allContents[0].classList.add('active');
}

/**
 * Fecha o modal de configuração de otimização
 */
function closeOptimizationConfigModal() {
    const modal = document.getElementById('optimizationConfigModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Função para atualizar demandas e metas do comitê
 */
function updateDemandsAndGoals() {
    // Verificar se uma instância está selecionada
    const instanceId = document.getElementById('instanceSelect').value;
    if (!instanceId) {
        showNotification('Selecione uma instância de comitê primeiro!', 'error');
        return;
    }
    
    // Pedir confirmação ao usuário
    if (!confirm('Esta operação irá atualizar os valores de demanda e metas com base nas instâncias relacionadas. Deseja continuar?')) {
        return;
    }
    
    // Mostrar status de processamento
    const statusElement = document.getElementById('updateStatus');
    statusElement.style.display = 'inline-block';
    
    // Mostrar notificação de processamento
    const processingNotification = showNotification('Processando atualização de demandas e metas...', 'info');
    
    // Chamar a API para atualizar as demandas e metas
    fetch(`/api/committees/${instanceId}/update-demands-goals`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            return handleHttpError(response);
        }
        return response.json();
    })
    .then(data => {
        // Processar a resposta e atualizar as tabelas
        updateStockDemandTable(data.stockDemand);
        updateProductionTargets(data.productionTargets);
        
        // Remover notificação de processamento
        processingNotification.remove();
        
        // Mostrar mensagem de sucesso
        showNotification('Demandas e metas atualizadas com sucesso!', 'success');
        
        // Marcar que há alterações pendentes para salvar
        pageState.isDirty = true;
    })
    .catch(error => {
        console.error('Erro:', error);
        
        // Remover notificação de processamento
        processingNotification.remove();
        
        // Se o erro já foi tratado por handleHttpError, não mostrar notificação duplicada
        if (!error.status) {
            showNotification(`Erro ao atualizar demandas e metas: ${error.message}`, 'error');
        }
    })
    .finally(() => {
        // Esconder status de processamento
        statusElement.style.display = 'none';
    });
}

/**
 * Atualiza a tabela de estoque e demanda com os novos valores calculados
 */
function updateStockDemandTable(stockDemandData) {
    // Implementação da atualização da tabela de estoque/demanda
    console.log('Atualizando tabela de estoque e demanda com dados:', stockDemandData);
    
    // Se a tabela já estiver carregada, podemos atualizar os valores diretamente
    const table = document.getElementById('demandStockTable');
    if (table && stockDemandData) {
        const rows = table.querySelectorAll('tbody tr');
        
        // Percorrer as linhas e atualizar os valores dos inputs
        rows.forEach(row => {
            const materializationId = row.getAttribute('data-id');
            if (materializationId && stockDemandData[materializationId]) {
                const data = stockDemandData[materializationId];
                
                // Atualizar campos de estoque e demanda
                const stockInput = row.querySelector('input[name="stock"]');
                if (stockInput && data.stock !== undefined) {
                    stockInput.value = data.stock;
                    // Disparar evento de change
                    stockInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
                
                const demandInput = row.querySelector('input[name="demand"]');
                if (demandInput && data.demand !== undefined) {
                    demandInput.value = data.demand;
                    // Disparar evento de change
                    demandInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
                
                // Atualizar campo de saldo, se existir
                const balanceCell = row.querySelector('.balance');
                if (balanceCell) {
                    const stock = parseFloat(data.stock || 0);
                    const demand = parseFloat(data.demand || 0);
                    const balance = stock - demand;
                    balanceCell.textContent = balance.toFixed(2);
                    
                    // Atualizar classe CSS baseada no saldo
                    balanceCell.className = 'balance';
                    if (balance < 0) {
                        balanceCell.classList.add('negative');
                    } else if (balance > 0) {
                        balanceCell.classList.add('positive');
                    }
                }
            }
        });
    }
}

/**
 * Atualiza os campos de produção e metas com os novos valores calculados
 */
function updateProductionTargets(targetData) {
    // Implementação da atualização dos campos de produção e metas
    console.log('Atualizando campos de produção e metas com dados:', targetData);
    
    if (targetData) {
        // Atualizar campo de quantidade produzida
        const producedQuantityInput = document.getElementById('producedQuantity');
        if (producedQuantityInput && targetData.producedQuantity !== undefined) {
            producedQuantityInput.value = targetData.producedQuantity;
            // Disparar evento de change
            producedQuantityInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Atualizar campo de quantidade restante
        const remainingQuantityElement = document.getElementById('remainingQuantity');
        if (remainingQuantityElement && targetData.remainingQuantity !== undefined) {
            remainingQuantityElement.textContent = targetData.remainingQuantity;
        }
    }
}

/**
 * Exibe uma mensagem ao usuário
 * @param {string} message - A mensagem a ser exibida
 * @param {string} type - O tipo de mensagem ('success', 'error', etc.)
 */
function showMessage(message, type = 'info') {
    showNotification(message, type);
}

// Substituir a função de salvamento existente para usar o novo endpoint
// Assumindo que a função existente é chamada 'saveChanges' ou algo similar
window.saveChanges = saveCommitteeState;

/**
 * Exibe o plano de produção do produto principal do comitê
 * Usando dados do conselho planificador central
 */
function showProductPlan() {
    if (!pageState.id || !pageState.socialMaterializationId) {
        showErrorMessage("Dados do comitê não carregados completamente.");
        return;
    }

    // Buscar projects summary antes de abrir o modal
    fetchProjectsSummary().then(() => {

    // Buscar a materialização principal do comitê
    const mainProduct = pageState.materializations.find(m => m.id === pageState.socialMaterializationId);
    if (!mainProduct) {
        showErrorMessage("Produto principal não encontrado.");
        return;
    }

    // Capturar o nome do produto para uso em todo o escopo da função
    const productName = mainProduct.name || "Produto principal";
    console.log(`Exibindo plano para produto: ${productName}`);

    // Mostrar indicador de carregamento na modal
    const modal = document.getElementById('optimizationResultModal');
    const modalContent = document.getElementById('optimizationModalContent');
    
    if (!modal || !modalContent) {
        showErrorMessage("Elementos da interface não encontrados.");
        return;
    }
    
    // MODIFICADO: Usar querySelectorAll com classe para atualizar todos os elementos de uma vez
    const productNameElements = document.querySelectorAll('.optimization-product-name');
    productNameElements.forEach(element => {
        element.textContent = productName;
    });
    
    // Exibir indicador de carregamento
    modalContent.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Carregando dados de otimização...</p></div>';
    
    // Configurar abas do modal e exibir a primeira aba por padrão
    setupOptimizationModalTabs();
    
    // Exibir a modal
    modal.style.display = 'block';
    
    // Buscar dados de otimização do produto principal do conselho planificador central
    fetch(`/api/committees/${pageState.id}/central-optimization/${pageState.socialMaterializationId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro ao buscar dados: ${response.status}`);
            }
            return response.json();
        })
        .then(result => {
            // Armazenar os dados para uso futuro
            pageState.optimizationData = result;
            
            // MODIFICADO: Verificar e corrigir nome do produto em todos os elementos
            const productNameElements = document.querySelectorAll('.optimization-product-name');
            productNameElements.forEach(element => {
                if (element.textContent === "Carregando...") {
                    console.log("Corrigindo nome do produto que foi redefinido para 'Carregando...'");
                    element.textContent = productName;
                }
            });
            
            // Exibir os dados de otimização
            displayOptimizationResults(result);
            
            // Preencher aba "Dessa Unidade Produtiva"
            displayUnitPlanData(result);
        })
        .catch(error => {
            console.error('Erro ao buscar dados de otimização central:', error);
            modalContent.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Erro ao carregar dados de otimização: ${error.message}</p>
                </div>
            `;
            
            // MODIFICADO: Garantir que o nome do produto ainda está definido em caso de erro
            const productNameElements = document.querySelectorAll('.optimization-product-name');
            productNameElements.forEach(element => {
                element.textContent = productName;
            });
        });
    }); // close fetchProjectsSummary().then()
}

/**
 * Exibe os resultados da otimização na modal
 */
function displayOptimizationResults(result) {
    const modalContent = document.getElementById('optimizationModalContent');
    if (!modalContent) return;
    
    // MODIFICADO: Usar a classe em vez do ID
    // Garantir que o nome do produto não seja alterado ao exibir os resultados
    const productNameElements = document.querySelectorAll('.optimization-product-name');
    const currentProductName = productNameElements.length > 0 ? productNameElements[0].textContent : 'Produto';
    console.log(`Nome do produto na renderização dos resultados: ${currentProductName}`);
    
    // Função para formatar números com verificação de existência
    const formatNumber = (value, decimals = 2, scientific = false) => {
        if (value === undefined || value === null) return 'N/A';
        
        // Usar mais casas decimais para valores científicos pequenos
        if (scientific && Math.abs(value) < 0.01 && value !== 0) {
            return value.toExponential(4);
        }
        
        // Para valores de produção e outros valores críticos
        if (scientific) {
            return typeof value === 'number' ? value.toFixed(Math.max(4, decimals)) : value;
        }
        
        return typeof value === 'number' ? value.toFixed(decimals) : value;
    };
    
    // Use os valores diretos do banco de dados para fábricas
    const existingFactories = result.committeeCount || 0;
    // MODIFICADO: Usar valores diretos do banco sem Math.ceil
    const requiredFactories = result.factoriesNeeded || 0;
    const factoryDifference = Math.round((requiredFactories - existingFactories) * 100) / 100;

    // Determine the appropriate message and value to display for factories
    let factoryDifferenceLabel = 'Fábricas a serem construídas';
    let factoryDifferenceValue = factoryDifference;
    if (factoryDifference < 0) {
        factoryDifferenceLabel = 'Fábricas a serem revertidas';
        factoryDifferenceValue = Math.abs(factoryDifference);
    }
    
    // MODIFICADO: Usar o valor direto do banco para trabalhadores necessários
    // NÃO aplicar Math.ceil para preservar o valor original
    const requiredWorkers = result.workersNeeded || 0;
    const workerLimit = result.workerLimit || 0;
    const workerDifference = Math.round((requiredWorkers - workerLimit) * 100) / 100;
    
    // Determine the appropriate message and value to display for workers
    let workerDifferenceLabel = 'Trabalhadores a serem contratados';
    let workerDifferenceValue = workerDifference;
    if (workerDifference < 0) {
        workerDifferenceLabel = 'Trabalhadores a serem realocados';
        workerDifferenceValue = Math.abs(workerDifference);
    }
    
    // Para a aba "Da Materialização Social", o valor calculado na página tem prioridade
    // sobre o valor do banco (especialmente na primeira vez, antes do primeiro salvamento)
    const sociallyNecessaryTimeValue = (pageState.sociallyNecessaryTimePerUnit !== undefined &&
        pageState.sociallyNecessaryTimePerUnit !== null &&
        !isNaN(pageState.sociallyNecessaryTimePerUnit) &&
        pageState.sociallyNecessaryTimePerUnit > 0)
        ? pageState.sociallyNecessaryTimePerUnit
        : result.sociallyNecessaryTimePerUnit;

    // Criar o conteúdo HTML estruturado em seções com formatação melhorada
    let contentHTML = `
        <div class="optimization-section">
            <h4>Dados de Produção</h4>
            <p><strong>Produção Necessária:</strong> ${formatNumber(result.productionNeeded, 6, true)} unidades</p>
            <p><strong>Total de Horas Necessárias:</strong> ${formatNumber(result.totalHours, 4, true)} horas</p>
        </div>
        
        <div class="optimization-section">
            <h4>Parâmetros Configurados</h4>
            <p><strong>Limite de Trabalhadores por Fábrica:</strong> ${result.workerLimit || '0'}</p>
            <p><strong>Horas de Trabalho por Dia:</strong> ${formatNumber(result.workerHours, 2)} horas</p>
            <p><strong>Tempo Localmente Necessário para Produzir 1 Unidade:</strong> ${formatNumber(result.productionTime, 4, true)} horas</p>
            <p><strong>Tempo Socialmente Necessário para Produzir 1 Unidade:</strong> ${sociallyNecessaryTimeValue !== undefined && sociallyNecessaryTimeValue !== null ? formatNumber(sociallyNecessaryTimeValue, 4, true) + ' horas' : 'N/A'}</p>
            <p><strong>Escala Semanal:</strong> ${formatNumber(result.weeklyScale, 0)} dias por semana</p>
            <p><strong>Turno Noturno:</strong> ${result.nightShift ? 'Sim' : 'Não'}</p>
        </div>
        
        <div class="optimization-section">
            <h4>Resultados Calculados</h4>
            <p><strong>Trabalhadores Necessários:</strong> ${formatNumber(result.workersNeeded, 4, true)} trabalhadores</p>
            <p><strong>${workerDifferenceLabel}:</strong> ${formatNumber(workerDifferenceValue, 4, true)} trabalhadores</p>
            <p><strong>Fábricas Existentes:</strong> ${result.committeeCount || '0'} fábricas</p>
            <p><strong>Fábricas Necessárias:</strong> ${formatNumber(result.factoriesNeeded, 4, true)} fábricas</p>
            <p><strong>${factoryDifferenceLabel}:</strong> ${formatNumber(factoryDifferenceValue, 4, true)} fábricas</p>
            <p><strong>Tempo Mínimo de Produção:</strong> ${formatNumber(result.minimumProductionTimeInDays, 4, true)} dias</p>
        </div>
    `;

    // Adicionar seção de CO2 se houver dados
    if (result.co2EmissionFactor != null || result.co2Allocated != null || result.co2ShadowPrice != null) {
        contentHTML += `
        <div class="optimization-section" style="border-left: 3px solid #4caf50;">
            <h4><i class="fas fa-leaf"></i> Dados de Emissão de CO₂</h4>
            ${result.co2EmissionFactor != null ? '<p><strong>Fator de Emissão:</strong> ' + formatNumber(result.co2EmissionFactor, 6, true) + ' kg CO₂/unidade</p>' : ''}
            ${result.co2Allocated != null ? '<p><strong>CO₂ Alocado (Materialização):</strong> ' + formatNumber(result.co2Allocated, 4, true) + ' kg CO₂</p>' : ''}
            ${result.co2AllocatedToCommittee != null ? '<p><strong>CO₂ Alocado (Este Comitê):</strong> ' + formatNumber(result.co2AllocatedToCommittee, 4, true) + ' kg CO₂</p>' : ''}
            ${result.co2ShadowPrice != null && result.co2ShadowPrice > 0 ? '<p><strong>Preço-Sombra do CO₂:</strong> ' + formatNumber(result.co2ShadowPrice, 6, true) + ' h/kg CO₂</p>' : ''}
        </div>
        `;
    }
    
    // Inserir o HTML na modal
    modalContent.innerHTML = contentHTML;
    
    // Adicionar estilos para as seções na modal
    if (!document.getElementById('optimization-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'optimization-modal-styles';
        style.textContent = `
            .optimization-section {
                margin-bottom: 20px;
                padding: 15px;
                background-color: var(--card-bg, #f9f9f9);
                border-radius: 6px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            
            .optimization-section h4 {
                margin-top: 0;
                margin-bottom: 10px;
                color: var(--accent-color, #3498db);
                font-size: 16px;
            }
            
            .loading-container {
                text-align: center;
                padding: 20px;
            }
            
            .spinner {
                display: inline-block;
                width: 40px;
                height: 40px;
                border: 4px solid rgba(0,0,0,0.1);
                border-radius: 50%;
                border-top-color: var(--primary-color, #2196f3);
                animation: spin 1s ease-in-out infinite;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            .error-message {
                color: var(--danger-color, #dc3545);
                padding: 15px;
                text-align: center;
                border: 1px solid var(--danger-color, #dc3545);
                border-radius: 4px;
                margin: 10px 0;
            }
            
            .error-message i {
                font-size: 24px;
                margin-bottom: 10px;
            }
        `;
        document.head.appendChild(style);
    }
}

function fetchProjectsSummary() {
    if (!pageState.id) return Promise.resolve();
    return fetch(`/api/committees/${pageState.id}/projects-summary`)
        .then(r => r.json())
        .then(data => {
            pageState.projectsSummary = data;
        })
        .catch(err => {
            console.error('Erro ao buscar projetos:', err);
            pageState.projectsSummary = { hasActiveProjects: false, totalHours: 0, avgDeadline: 0, projectCount: 0 };
        });
}

function fetchIncomingProjects() {
    const projectsList = document.getElementById('incomingProjectsList');
    if (!projectsList || !pageState.id) return;

    fetch(`/api/committees/${pageState.id}/incoming-orders`)
        .then(r => r.json())
        .then(orders => {
            // Filtrar apenas projetos (inputUnitName='h' é um heuristic, o backend já marca)
            // Idealmente o backend retornaria o tipo, mas filtramos pelo que temos
            const projects = orders.filter(o => {
                // Projetos têm inputMaterialization com type=PROJECT - mas o incoming-orders não retorna type
                // Heurística: se o comitê demandante é um conselho (nome contém "Conselho")
                const name = (o.orderingCommitteeName || '').toLowerCase();
                return name.includes('conselho');
            });

            if (!projects || projects.length === 0) {
                projectsList.innerHTML = '<p style="color: var(--text-secondary, #666); font-style: italic;">Nenhum projeto recebido.</p>';
                return;
            }

            let html = '<table class="incoming-orders-table" style="width:100%; border-collapse: collapse;">';
            html += '<thead><tr>' +
                '<th style="text-align:left; padding: 6px 8px; border-bottom: 1px solid var(--border-color, #444);">Conselho</th>' +
                '<th style="text-align:left; padding: 6px 8px; border-bottom: 1px solid var(--border-color, #444);">Projeto Público</th>' +
                '<th style="text-align:right; padding: 6px 8px; border-bottom: 1px solid var(--border-color, #444);">Investimento (h)</th>' +
                '<th style="text-align:center; padding: 6px 8px; border-bottom: 1px solid var(--border-color, #444);">Status</th>' +
                '<th style="text-align:center; padding: 6px 8px; border-bottom: 1px solid var(--border-color, #444);">Ações</th>' +
                '</tr></thead><tbody>';
            projects.forEach(order => {
                const qty = parseFloat(order.demandedQuantity) || 0;
                const qtyDisplay = (Math.abs(qty) < 0.01 && qty !== 0) ? qty.toExponential(4) : qty.toFixed(2);
                const status = order.orderStatus || 'solicitada';
                const statusBadge = getOrderStatusBadge(status);
                let actionsHtml = '';
                if (status === 'solicitada') {
                    actionsHtml = `<button class="btn btn-sm" style="padding:2px 8px; font-size:0.8em;" onclick="updateOrderStatus(${order.orderId}, 'aceita em produção')">Aceitar</button>
                        <button class="btn btn-sm btn-secondary" style="padding:2px 8px; font-size:0.8em;" onclick="updateOrderStatus(${order.orderId}, 'recusada')">Recusar</button>`;
                } else if (status === 'aceita em produção') {
                    actionsHtml = `<button class="btn btn-sm" style="padding:2px 8px; font-size:0.8em;" onclick="updateOrderStatus(${order.orderId}, 'produzida e enviada')">Enviar Produção</button>`;
                } else if (status === 'recebida pelo demandante') {
                    actionsHtml = `<button class="btn btn-sm" style="padding:2px 8px; font-size:0.8em;" onclick="distributeHours(${pageState.id}, ${order.orderId}, ${qty})">Liberar Horas</button>`;
                }
                html += `<tr>
                    <td style="padding: 6px 8px; border-bottom: 1px solid var(--border-color-light, #333);">${escapeHtml(order.orderingCommitteeName || 'Conselho #' + order.orderingCommitteeId)}</td>
                    <td style="padding: 6px 8px; border-bottom: 1px solid var(--border-color-light, #333); font-size:0.9em;">ID#${order.inputMaterializationId}</td>
                    <td style="text-align:right; padding: 6px 8px; border-bottom: 1px solid var(--border-color-light, #333);">${qtyDisplay} h</td>
                    <td style="text-align:center; padding: 6px 8px; border-bottom: 1px solid var(--border-color-light, #333);">${statusBadge}</td>
                    <td style="text-align:center; padding: 6px 8px; border-bottom: 1px solid var(--border-color-light, #333);">${actionsHtml}</td>
                </tr>`;
            });
            html += '</tbody></table>';
            projectsList.innerHTML = html;
        })
        .catch(err => {
            console.error('Erro ao buscar projetos:', err);
        });
}

/**
 * Preenche a aba "Dessa Unidade Produtiva" com Produção Necessária e Participação Estimada
 */
function displayUnitPlanData(result) {
    const emptyMessage = document.getElementById('unitPlanEmptyMessage');
    const fieldsContainer = document.getElementById('unitPlanFieldsContainer');
    const requiredProdEl = document.getElementById('unitRequiredProduction');
    const estimatedPartEl = document.getElementById('unitEstimatedParticipation');
    
    if (!emptyMessage || !fieldsContainer) return;
    
    const hasData = result.requiredProductionForCommittee != null && result.estimatedParticipation != null;
    
    if (hasData) {
        emptyMessage.style.display = 'none';
        fieldsContainer.style.display = 'block';
        
        // Produção Necessária: valor com formatação adequada
        const reqProd = result.requiredProductionForCommittee;
        if (requiredProdEl) {
            requiredProdEl.textContent = (Math.abs(reqProd) < 0.01 && reqProd !== 0)
                ? reqProd.toExponential(4)
                : parseFloat(reqProd).toFixed(2);
        }
        
        // Participação Estimada (mensal): exibição em horas (h) — valor planificado
        if (estimatedPartEl) {
            const hours = result.estimatedParticipationHours;
            if (hours != null) {
                estimatedPartEl.textContent = parseFloat(hours).toFixed(2) + ' h';
            }
        }

        // Participação Estimada Localmente (mensal): horas por trabalhador das encomendas pendentes
        const localPartEl = document.getElementById('unitLocalParticipation');
        if (localPartEl) {
            const localHours = result.estimatedLocalParticipationHours;
            if (localHours != null) {
                localPartEl.textContent = parseFloat(localHours).toFixed(2) + ' h';
            }
        }

        // Tempo Estimado para Conclusão
        const localTimeEl = document.getElementById('unitLocalTimeToComplete');
        if (localTimeEl) {
            const timeVal = result.estimatedLocalTimeToComplete;
            const timeUnit = result.estimatedLocalTimeUnit;
            if (timeVal != null && timeUnit != null) {
                if (timeUnit === 'anos') {
                    const years = parseInt(timeVal) || 0;
                    const months = parseInt(result.estimatedLocalTimeMonths) || 0;
                    if (months > 0) {
                        localTimeEl.textContent = years + ' anos e ' + months + ' meses';
                    } else {
                        localTimeEl.textContent = years + ' anos';
                    }
                } else {
                    const decimals = timeUnit === 'meses' ? 2 : 0;
                    localTimeEl.textContent = parseFloat(timeVal).toFixed(decimals) + ' ' + timeUnit;
                }
            }
        }
    } else {
        emptyMessage.style.display = 'block';
        fieldsContainer.style.display = 'none';
    }

    // Atualizar badge de CO2 no header do comitê
    if (result.co2AllocatedToCommittee != null) {
        var badgeEl = document.getElementById('co2Badge');
        var limitEl = document.getElementById('co2LimitDisplay');
        if (badgeEl) badgeEl.style.display = 'block';
        if (limitEl) {
            var co2Val = parseFloat(result.co2AllocatedToCommittee);
            limitEl.textContent = (Math.abs(co2Val) < 0.01 && co2Val !== 0)
                ? co2Val.toExponential(4) : co2Val.toFixed(2);
        }
    }

    // Buscar encomendas de produção e projetos
    if (pageState.id) {
        fetchOpenProjects();
        fetchIncomingProjects();
        fetchIncomingOrders();
    }
}

/**
 * Busca e exibe as encomendas de produção recebidas por este comitê.
 */
function fetchIncomingOrders() {
    const ordersList = document.getElementById('incomingOrdersList');
    if (!ordersList) return;

    fetch(`/api/committees/${pageState.id}/incoming-orders`)
        .then(response => {
            if (!response.ok) throw new Error('Erro ao buscar encomendas');
            return response.json();
        })
        .then(orders => {
            if (!orders || orders.length === 0) {
                ordersList.innerHTML = '<p style="color: var(--text-secondary, #666); font-style: italic;">Nenhuma encomenda recebida.</p>';
                return;
            }

            let html = '<table class="incoming-orders-table" style="width:100%; border-collapse: collapse;">';
            html += '<thead><tr>' +
                '<th style="text-align:left; padding: 6px 8px; border-bottom: 1px solid var(--border-color, #444);">Comitê Demandante</th>' +
                '<th style="text-align:right; padding: 6px 8px; border-bottom: 1px solid var(--border-color, #444);">Quantidade Demandada</th>' +
                '<th style="text-align:center; padding: 6px 8px; border-bottom: 1px solid var(--border-color, #444);">Status</th>' +
                '<th style="text-align:center; padding: 6px 8px; border-bottom: 1px solid var(--border-color, #444);">Ações</th>' +
                '</tr></thead>';
            html += '<tbody>';
            orders.forEach(order => {
                const qty = parseFloat(order.demandedQuantity) || 0;
                const qtyDisplay = (Math.abs(qty) < 0.01 && qty !== 0) ? qty.toExponential(4) : qty.toFixed(2);
                const unitName = order.inputUnitName || '';
                const unitHtml = unitName ? ` <span style="color: var(--text-secondary, #888); font-size: 0.85em;">${escapeHtml(unitName)}</span>` : '';
                const status = order.orderStatus || 'solicitada';
                const statusBadge = getOrderStatusBadge(status);

                let actionsHtml = '';
                if (status === 'solicitada') {
                    actionsHtml = `<button class="btn btn-sm" style="padding:2px 8px; font-size:0.8em;" onclick="updateOrderStatus(${order.orderId}, 'aceita em produção')">Aceitar</button>
                        <button class="btn btn-sm btn-secondary" style="padding:2px 8px; font-size:0.8em;" onclick="updateOrderStatus(${order.orderId}, 'recusada')">Recusar</button>`;
                } else if (status === 'aceita em produção') {
                    actionsHtml = `<button class="btn btn-sm" style="padding:2px 8px; font-size:0.8em;" onclick="updateOrderStatus(${order.orderId}, 'produzida e enviada')">Enviar Produção</button>`;
                } else if (status === 'recebida pelo demandante') {
                    actionsHtml = `<button class="btn btn-sm" style="padding:2px 8px; font-size:0.8em;" onclick="distributeHours(${pageState.id}, ${order.orderId}, ${qty})">Liberar Horas</button>`;
                }

                html += `<tr>
                    <td style="padding: 6px 8px; border-bottom: 1px solid var(--border-color-light, #333);">${escapeHtml(order.orderingCommitteeName || 'Comitê #' + order.orderingCommitteeId)}</td>
                    <td style="text-align:right; padding: 6px 8px; border-bottom: 1px solid var(--border-color-light, #333);">${qtyDisplay}${unitHtml}</td>
                    <td style="text-align:center; padding: 6px 8px; border-bottom: 1px solid var(--border-color-light, #333);">${statusBadge}</td>
                    <td style="text-align:center; padding: 6px 8px; border-bottom: 1px solid var(--border-color-light, #333);">${actionsHtml}</td>
                </tr>`;
            });
            html += '</tbody></table>';
            ordersList.innerHTML = html;
        })
        .catch(error => {
            console.error('Erro ao buscar encomendas:', error);
            if (ordersList) {
                ordersList.innerHTML = '<p style="color: var(--text-secondary, #666); font-style: italic;">Erro ao carregar encomendas.</p>';
            }
        });
}

function getOrderStatusBadge(status) {
    const colors = {
        'solicitada': '#1976d2',
        'aceita em produção': '#f57c00',
        'produzida e enviada': '#388e3c',
        'recebida pelo demandante': '#7b8c8d',
        'recusada': '#c62828',
        'horas liberadas': '#6a1b9a'
    };
    const labels = {
        'solicitada': 'Solicitada',
        'aceita em produção': 'Em Produção',
        'produzida e enviada': 'Enviada',
        'recebida pelo demandante': 'Recebida',
        'recusada': 'Recusada',
        'horas liberadas': 'Horas Liberadas'
    };
    const color = colors[status] || '#888';
    const label = labels[status] || status;
    return `<span style="display:inline-block; padding:2px 6px; border-radius:3px; font-size:0.8em; font-weight:500; background:${color}22; color:${color}; border:1px solid ${color}44;">${label}</span>`;
}

function updateOrderStatus(orderId, newStatus) {
    fetch(`/api/committees/${pageState.id}/orders/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            orderId: orderId,
            orderStatus: newStatus
        })
    })
    .then(r => r.json())
    .then(result => {
        if (result.success) {
            showSuccessMessage('Status atualizado com sucesso');
            fetchIncomingOrders();
            fetchIncomingProjects();
            if (pageState.id) {
                fetch(`/api/committees/${pageState.id}/state`)
                    .then(r => r.json())
                    .then(data => {
                        globalState.orderStatuses = data.orderStatuses || {};
                        globalState.supplierChoices = data.supplierChoices || {};
                        globalState.supplierNames = data.supplierNames || {};
                        updateTechnologicalMatrixTable();
                    });
            }
        } else {
            showErrorMessage(result.message || 'Erro ao atualizar status');
        }
    })
    .catch(err => {
        console.error('Erro ao atualizar status:', err);
        showErrorMessage('Erro ao atualizar status');
    });
}

function distributeHours(committeeId, orderId, demandedQuantity) {
    if (!confirm('Liberar horas para todos os trabalhadores associados a este comitê?')) return;

    fetch(`/api/committees/${committeeId}/distribute-hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            orderId: orderId,
            demandedQuantity: demandedQuantity
        })
    })
    .then(r => r.json())
    .then(result => {
        if (result.success) {
            const hPerWorker = parseFloat(result.hoursPerWorker) || 0;
            const hTotal = parseFloat(result.totalHours) || 0;
            const hPerWorkerDisplay = (Math.abs(hPerWorker) < 0.01 && hPerWorker !== 0)
                ? hPerWorker.toExponential(4)
                : hPerWorker.toFixed(6);
            const hTotalDisplay = (Math.abs(hTotal) < 0.01 && hTotal !== 0)
                ? hTotal.toExponential(4)
                : hTotal.toFixed(6);
            showSuccessMessage(`Horas distribuídas: ${hPerWorkerDisplay}h por trabalhador (${result.workerCount} trabalhadores, total ${hTotalDisplay}h)`);
            fetchIncomingOrders();
            fetchIncomingProjects();
        } else {
            showErrorMessage(result.message || 'Erro ao distribuir horas');
        }
    })
    .catch(err => {
        console.error('Erro ao distribuir horas:', err);
        showErrorMessage('Erro ao distribuir horas');
    });
}

/**
 * Abre o modal de seleção de fornecedor para um insumo específico.
 */
function openSupplierSelectionModal(matId) {
    const modal = document.getElementById('supplierSelectionModal');
    const insumoNameEl = document.getElementById('supplierModalInsumoName');
    const listContainer = document.getElementById('supplierListContainer');
    const searchInput = document.getElementById('supplierSearchInput');
    
    if (!modal || !listContainer) return;

    // Mover para o final do body e garantir z-index máximo
    document.body.appendChild(modal);
    modal.style.zIndex = '9999';
    modal.style.display = 'block';

    globalState.currentSupplierInputId = matId;

    const mat = pageState.materializations.find(m => m.id === matId);
    if (insumoNameEl) {
        insumoNameEl.textContent = mat ? mat.name : `Insumo #${matId}`;
    }

    // Limpar busca
    if (searchInput) searchInput.value = '';

    listContainer.innerHTML = '<p style="color: var(--text-secondary, #666); font-style: italic;">Carregando...</p>';
    modal.style.display = 'block';

    fetch(`/api/committees/producers-of/${matId}`)
        .then(response => {
            if (!response.ok) throw new Error('Erro ao buscar produtores');
            return response.json();
        })
        .then(producers => {
            _allProducers = producers || [];
            renderSupplierList(_allProducers);
        })
        .catch(error => {
            console.error('Erro ao buscar produtores:', error);
            listContainer.innerHTML = '<p style="color: var(--error-color, #c62828);">Erro ao carregar lista de produtores.</p>';
        });
}

let _allProducers = [];

function renderSupplierList(producers) {
    const listContainer = document.getElementById('supplierListContainer');
    if (!listContainer) return;

    if (!producers || producers.length === 0) {
        listContainer.innerHTML = '<p style="color: var(--text-secondary, #666); font-style: italic;">Nenhuma unidade produtiva encontrada para este insumo.</p>';
        return;
    }

    const matId = globalState.currentSupplierInputId;
    const currentSupplierId = matId != null ? globalState.supplierChoices[matId] : null;

    let html = '<div class="supplier-list">';
    producers.forEach(producer => {
        const isSelected = currentSupplierId != null && currentSupplierId === producer.id;
        const selectedClass = isSelected ? ' supplier-item-selected' : '';
        html += `<div class="supplier-list-item${selectedClass}" onclick="selectSupplier(${matId}, ${producer.id})" style="cursor: pointer; padding: 10px; margin-bottom: 4px; border: 1px solid var(--border-color, #444); border-radius: 4px; transition: background-color 0.2s;">
            <strong>${escapeHtml(producer.committeeName || 'Comitê #' + producer.id)}</strong>
            ${isSelected ? ' <span style="color: var(--primary-color); font-size: 0.8em;">(selecionado)</span>' : ''}
        </div>`;
    });
    html += '</div>';
    listContainer.innerHTML = html;
}

function filterSupplierList() {
    const term = (document.getElementById('supplierSearchInput')?.value || '').trim().toLowerCase();
    if (!term) {
        renderSupplierList(_allProducers);
        _supplierHighlightIndex = -1;
        return;
    }
    const filtered = _allProducers.filter(p => {
        const name = (p.committeeName || '').toLowerCase();
        const id = String(p.id);
        return name.includes(term) || id.includes(term);
    });
    renderSupplierList(filtered);
    _supplierHighlightIndex = -1;
}

let _supplierHighlightIndex = -1;

function supplierSearchKeydown(event) {
    const items = document.querySelectorAll('#supplierListContainer .supplier-list-item');
    if (items.length === 0) return;

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        _supplierHighlightIndex = Math.min(_supplierHighlightIndex + 1, items.length - 1);
        updateSupplierHighlight(items);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        _supplierHighlightIndex = Math.max(_supplierHighlightIndex - 1, 0);
        updateSupplierHighlight(items);
    } else if (event.key === 'Enter') {
        event.preventDefault();
        if (_supplierHighlightIndex >= 0 && _supplierHighlightIndex < items.length) {
            items[_supplierHighlightIndex].click();
        }
    } else if (event.key === 'Escape') {
        closeSupplierSelectionModal();
    }
}

function updateSupplierHighlight(items) {
    items.forEach((item, i) => {
        if (i === _supplierHighlightIndex) {
            item.style.backgroundColor = 'var(--primary-color, #1976d2)';
            item.style.color = '#fff';
            item.querySelector('strong').style.color = '#fff';
        } else {
            item.style.backgroundColor = '';
            item.style.color = '';
            if (item.querySelector('strong')) item.querySelector('strong').style.color = '';
        }
    });
}

/**
 * Seleciona um fornecedor para o insumo atual.
 */
function selectSupplier(matId, supplierId) {
    // Extrair nome do fornecedor do DOM do modal
    let supplierName = null;
    const modalList = document.querySelector('#supplierListContainer .supplier-list');
    if (modalList) {
        const selectedItem = modalList.querySelector(`[onclick*="${supplierId}"]`);
        if (selectedItem) {
            const nameEl = selectedItem.querySelector('strong');
            if (nameEl) supplierName = nameEl.textContent;
        }
    }

    // Se há callback do modal de novo pedido, apenas notificar, sem alterar o fornecedor padrão
    if (typeof globalState._newOrderCallback === 'function') {
        globalState.supplierNames[supplierId] = supplierName || ('Fornecedor #' + supplierId);
        globalState._newOrderCallback(supplierId, supplierName);
        globalState._newOrderCallback = null;
        closeSupplierSelectionModal();
        return;
    }

    // Alterar fornecedor padrão
    globalState.supplierChoices[matId] = supplierId;
    globalState.supplierNames[supplierId] = supplierName || ('Fornecedor #' + supplierId);

    pageState.isDirty = true;
    closeSupplierSelectionModal();

    // Atualizar exibição do fornecedor padrão no modal de histórico, se aberto
    const defSupplierEl = document.getElementById('historyDefaultSupplier');
    if (defSupplierEl && globalState.supplierNames[supplierId]) {
        defSupplierEl.textContent = globalState.supplierNames[supplierId];
    }

    updateTechnologicalMatrixTable();

    // Salvar automaticamente a alteração do fornecedor padrão
    saveCommitteeStateSilent();
}

/**
 * Salva o estado sem mostrar spinner/desabilitar botões (usado para auto-save do fornecedor padrão).
 */
function saveCommitteeStateSilent() {
    if (!pageState.id) return;
    updateStateFromUI();

    const committeeData = {
        id: pageState.id,
        committeeName: pageState.committeeName,
        producedQuantity: pageState.producedQuantity,
        targetQuantity: pageState.targetQuantity,
        workerEffectiveLimit: pageState.workerEffectiveLimit,
        socialMaterializationId: pageState.socialMaterializationId,
        councilId: pageState.councilId,
        workerProposal: pageState.workerProposal,
        members: pageState.members,
        materializations: pageState.materializations,
        supplierChoices: globalState.supplierChoices
    };

    fetch('/api/committees/save-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(committeeData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            pageState.isDirty = false;
            if (data.committeeId && !pageState.id) {
                pageState.id = data.committeeId;
            }
            if (pageState.id) {
                localCache.remove(`committee_state_${pageState.id}`);
            }
            console.log('Fornecedor padrão salvo automaticamente');
        }
    })
    .catch(err => console.error('Erro ao salvar fornecedor padrão:', err));
}

/**
 * Remove a seleção de fornecedor para o insumo atual.
 */
function clearCurrentSupplierSelection() {
    const matId = globalState.currentSupplierInputId;
    if (matId != null) {
        delete globalState.supplierChoices[matId];
        pageState.isDirty = true;
        closeSupplierSelectionModal();
        updateTechnologicalMatrixTable();
    }
}

/**
 * Confirma o recebimento da encomenda (usado pelo comitê demandante).
 * Busca o último pedido com status "produzida e enviada" para este insumo e confirma.
 */
function confirmReceipt(committeeId, inputMatId, outputMatId) {
    fetch(`/api/committees/${committeeId}/orders/history/${inputMatId}`)
        .then(r => r.json())
        .then(orders => {
            const pending = orders.find(o => o.orderStatus === 'produzida e enviada');
            if (pending) {
                updateOrderStatus(pending.orderId, 'recebida pelo demandante');
            } else {
                showErrorMessage('Nenhuma encomenda pendente de recebimento encontrada.');
            }
        })
        .catch(err => {
            console.error('Erro ao confirmar recebimento:', err);
            showErrorMessage('Erro ao confirmar recebimento');
        });
}

/**
 * Fecha o modal de seleção de fornecedor.
 */
function closeSupplierSelectionModal() {
    const modal = document.getElementById('supplierSelectionModal');
    if (modal) {
        modal.style.display = 'none';
        modal.style.zIndex = '';
    }
    globalState.currentSupplierInputId = null;
}

// Dados dos trabalhadores para filtro
let _allWorkers = [];

function openWorkersModal() {
    if (!pageState.id) {
        showErrorMessage("Comitê não carregado.");
        return;
    }

    const modal = document.getElementById('workersModal');
    const container = document.getElementById('workersListContainer');
    const searchInput = document.getElementById('workersSearchInput');
    if (!modal || !container) return;

    container.innerHTML = '<p style="color: var(--text-secondary, #666); font-style: italic;">Carregando...</p>';
    if (searchInput) searchInput.value = '';
    modal.style.display = 'block';

    fetch(`/api/instances/${pageState.id}/workers`)
        .then(r => {
            if (!r.ok) throw new Error('Erro ao buscar trabalhadores');
            return r.json();
        })
        .then(workers => {
            _allWorkers = workers || [];
            renderWorkersList(_allWorkers);
        })
        .catch(err => {
            console.error('Erro ao carregar trabalhadores:', err);
            container.innerHTML = '<p style="color: var(--error-color, #c62828);">Erro ao carregar trabalhadores.</p>';
        });
}

function renderWorkersList(workers) {
    const container = document.getElementById('workersListContainer');
    if (!container) return;
    if (!workers || workers.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary, #666); font-style: italic;">Nenhum trabalhador associado.</p>';
        return;
    }
    let html = `<p style="margin-bottom:8px; color:var(--text-secondary,#888); font-size:0.85em;">${workers.length} trabalhador(es)</p>`;
    html += '<table style="width:100%; border-collapse:collapse;">';
    html += '<thead><tr><th style="text-align:left; padding:6px 8px; border-bottom:1px solid var(--border-color,#444);">ID</th><th style="text-align:left; padding:6px 8px; border-bottom:1px solid var(--border-color,#444);">Nome</th></tr></thead><tbody>';
    workers.forEach(w => {
        html += `<tr>
            <td style="padding:5px 8px; border-bottom:1px solid var(--border-color-light,#333);">${w.id}</td>
            <td style="padding:5px 8px; border-bottom:1px solid var(--border-color-light,#333);">${escapeHtml(w.name || 'Trabalhador #' + w.id)}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function filterWorkersList() {
    const input = document.getElementById('workersSearchInput');
    if (!input) return;
    const term = input.value.trim().toLowerCase();
    if (!term) {
        renderWorkersList(_allWorkers);
        return;
    }
    const filtered = _allWorkers.filter(w => {
        const name = (w.name || '').toLowerCase();
        const id = String(w.id);
        return name.includes(term) || id.includes(term);
    });
    renderWorkersList(filtered);
}

function closeWorkersModal() {
    const modal = document.getElementById('workersModal');
    if (modal) modal.style.display = 'none';
}

// --- Histórico de Pedidos ---
let _orderHistory = [];
let _orderHistorySortDesc = true;
let _orderHistoryInputMatId = null;

function openOrderHistoryModal(matId) {
    if (!pageState.id) return;
    _orderHistoryInputMatId = matId;
    _orderHistorySortDesc = true;

    const modal = document.getElementById('orderHistoryModal');
    const insumoName = document.getElementById('historyInsumoName');
    const container = document.getElementById('orderHistoryList');
    const searchInput = document.getElementById('historySearchInput');

    if (!modal || !container) return;

    const mat = pageState.materializations.find(m => m.id === matId);
    if (insumoName) insumoName.textContent = mat ? mat.name : `Insumo #${matId}`;
    // Fornecedor padrão
    const defSupplierEl = document.getElementById('historyDefaultSupplier');
    if (defSupplierEl) {
        const sid = globalState.supplierChoices[matId];
        if (sid && globalState.supplierNames[sid]) {
            defSupplierEl.textContent = globalState.supplierNames[sid];
        } else if (sid) {
            defSupplierEl.textContent = 'Fornecedor #' + sid;
        } else {
            defSupplierEl.textContent = 'Nenhum';
        }
    }
    if (searchInput) searchInput.value = '';
    container.innerHTML = '<p style="color: var(--text-secondary, #666); font-style: italic;">Carregando...</p>';
    modal.style.display = 'block';

    fetch(`/api/committees/${pageState.id}/orders/history/${matId}`)
        .then(r => r.json())
        .then(orders => {
            _orderHistory = orders || [];
            renderOrderHistoryList(_orderHistory);
        })
        .catch(err => {
            console.error('Erro ao carregar histórico:', err);
            container.innerHTML = '<p style="color: var(--error-color);">Erro ao carregar histórico.</p>';
        });
}

function renderOrderHistoryList(orders) {
    const container = document.getElementById('orderHistoryList');
    if (!container) return;

    if (!orders || orders.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary, #666); font-style: italic;">Nenhum pedido encontrado.</p>';
        return;
    }

    let list = [...orders];
    if (_orderHistorySortDesc) {
        list.sort((a, b) => (b.orderId || 0) - (a.orderId || 0));
    } else {
        list.sort((a, b) => (a.orderId || 0) - (b.orderId || 0));
    }

    let html = `<p style="margin-bottom:8px; color:var(--text-secondary,#888); font-size:0.85em;">${list.length} pedido(s)</p>`;
    html += '<table style="width:100%; border-collapse:collapse; table-layout:auto;">';
    html += '<thead><tr><th style="padding:5px 8px; border-bottom:1px solid var(--border-color);">ID</th><th style="padding:5px 8px; border-bottom:1px solid var(--border-color);">Data</th><th style="padding:5px 8px; border-bottom:1px solid var(--border-color);">Fornecedor</th><th style="padding:5px 8px; border-bottom:1px solid var(--border-color); text-align:right;">Qtd</th><th style="padding:5px 8px; border-bottom:1px solid var(--border-color); text-align:center;">Status</th><th style="padding:5px 8px; border-bottom:1px solid var(--border-color); text-align:center;">Ações</th></tr></thead><tbody>';
    list.forEach(o => {
        const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleDateString('pt-BR') : '-';
        const qty = parseFloat(o.quantity) || 0;
        const qtyDisp = (Math.abs(qty) < 0.01 && qty !== 0) ? qty.toExponential(4) : qty.toFixed(4);
        const unit = o.inputUnitName ? ` ${escapeHtml(o.inputUnitName)}` : '';
        const badge = getOrderStatusBadge(o.orderStatus);
        const isProduzidaEnviada = (o.orderStatus === 'produzida e enviada');
        const actionHtml = isProduzidaEnviada
            ? `<button class="btn btn-sm" style="padding:1px 6px; font-size:0.7em; white-space:nowrap;" onclick="var tr=this.closest('tr');this.style.display='none';tr.cells[4].innerHTML=getOrderStatusBadge('recebida pelo demandante');updateOrderStatus(${o.orderId}, 'recebida pelo demandante')">Confirmar Recebimento</button>`
            : '';
        html += `<tr>
            <td style="padding:4px 8px; border-bottom:1px solid var(--border-color-light);">${o.orderId}</td>
            <td style="padding:4px 8px; border-bottom:1px solid var(--border-color-light); font-size:0.85em;">${dateStr}</td>
            <td style="padding:4px 8px; border-bottom:1px solid var(--border-color-light);">${escapeHtml(o.supplierName || 'Fornecedor #' + o.supplierInstanceId)}</td>
            <td style="padding:4px 8px; border-bottom:1px solid var(--border-color-light); text-align:right;">${qtyDisp}${unit}</td>
            <td style="padding:4px 8px; border-bottom:1px solid var(--border-color-light); text-align:center;">${badge}</td>
            <td style="padding:4px 8px; border-bottom:1px solid var(--border-color-light); text-align:center;">${actionHtml}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function filterOrderHistory() {
    const term = (document.getElementById('historySearchInput')?.value || '').trim().toLowerCase();
    if (!term) {
        renderOrderHistoryList(_orderHistory);
        return;
    }
    const filtered = _orderHistory.filter(o => {
        const name = (o.supplierName || '').toLowerCase();
        const idStr = String(o.orderId || '');
        return name.includes(term) || idStr.includes(term);
    });
    renderOrderHistoryList(filtered);
}

function toggleOrderHistorySort() {
    _orderHistorySortDesc = !_orderHistorySortDesc;
    const icon = document.getElementById('historySortIcon');
    if (icon) {
        icon.className = _orderHistorySortDesc ? 'fas fa-sort-amount-down' : 'fas fa-sort-amount-up';
    }
    renderOrderHistoryList(_orderHistory);
}

function closeOrderHistoryModal() {
    const modal = document.getElementById('orderHistoryModal');
    if (modal) modal.style.display = 'none';
}

function openSupplierSelectionFromHistory() {
    if (_orderHistoryInputMatId != null) {
        openSupplierSelectionModal(_orderHistoryInputMatId);
    }
}

// --- Novo Pedido ---
let _newOrderInputMatId = null;
let _newOrderSupplierId = null;
let _newOrderDefaultQty = 0;
let _newOrderUnitName = '';

function openNewOrderModal() {
    if (!pageState.id || _orderHistoryInputMatId == null) return;

    _newOrderInputMatId = _orderHistoryInputMatId;
    _newOrderSupplierId = globalState.supplierChoices[_newOrderInputMatId] || null;

    const modal = document.getElementById('newOrderModal');
    const insumoName = document.getElementById('newOrderInsumoName');
    const supplierName = document.getElementById('newOrderSupplierName');
    const qtyInput = document.getElementById('newOrderQuantity');
    const unitLabel = document.getElementById('newOrderUnitLabel');

    if (!modal) return;

    const mat = pageState.materializations.find(m => m.id === _newOrderInputMatId);
    if (insumoName) insumoName.textContent = mat ? mat.name : `Insumo #${_newOrderInputMatId}`;

    // Fornecedor padrão
    updateNewOrderSupplierDisplay();

    // Quantidade padrão: valor da coluna "Quantidade" da tabela
    const qtyVal = getTechnologicalQuantityValue(mat);
    _newOrderDefaultQty = parseFloat(qtyVal) || 0;
    if (qtyInput) qtyInput.value = qtyVal;

    // Unidade de medida
    _newOrderUnitName = getMaterializationMeasurementUnitLabel(mat) || '';
    if (unitLabel) unitLabel.textContent = _newOrderUnitName;

    modal.style.display = 'block';
}

function updateNewOrderSupplierDisplay() {
    const supplierName = document.getElementById('newOrderSupplierName');
    if (!supplierName) return;
    if (_newOrderSupplierId && globalState.supplierNames[_newOrderSupplierId]) {
        supplierName.textContent = globalState.supplierNames[_newOrderSupplierId];
    } else if (_newOrderSupplierId) {
        supplierName.textContent = 'Fornecedor #' + _newOrderSupplierId;
    } else {
        supplierName.textContent = 'Não selecionado';
    }
}

function openSupplierSelectionForNewOrder() {
    if (_newOrderInputMatId == null) return;
    globalState._newOrderCallback = function(supplierId) {
        _newOrderSupplierId = supplierId;
        updateNewOrderSupplierDisplay();
    };
    openSupplierModalForTarget(_newOrderInputMatId);
}

function openSupplierModalForTarget(matId) {
    // Reusa o modal existente, mas com callback customizado
    const origOnSelect = selectSupplier;
    // Guarda estado atual e sobrescreve comportamento
    globalState.currentSupplierInputId = matId;
    openSupplierSelectionModal(matId);
    // Interceptar o fechamento: ao selecionar, chamar o callback
    globalState._supplierSelectInterceptor = true;
}

function confirmNewOrder() {
    if (!_newOrderSupplierId) {
        showErrorMessage('Selecione um fornecedor.');
        return;
    }

    const qtyInput = document.getElementById('newOrderQuantity');
    const quantity = qtyInput ? qtyInput.value : _newOrderDefaultQty;

    if (!quantity || parseFloat(quantity) <= 0) {
        showErrorMessage('Informe uma quantidade válida.');
        return;
    }

    const payload = {
        inputMaterializationId: _newOrderInputMatId,
        outputMaterializationId: pageState.socialMaterializationId,
        supplierInstanceId: _newOrderSupplierId,
        quantity: parseFloat(quantity)
    };

    fetch(`/api/committees/${pageState.id}/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(result => {
        if (result.success) {
            showSuccessMessage('Pedido criado com sucesso!');
            closeNewOrderModal();
            closeOrderHistoryModal();
            // Atualizar estado
            if (pageState.id) {
                fetch(`/api/committees/${pageState.id}/state`)
                    .then(r => r.json())
                    .then(data => {
                        globalState.supplierChoices = data.supplierChoices || {};
                        globalState.supplierNames = data.supplierNames || {};
                        globalState.orderStatuses = data.orderStatuses || {};
                        updateTechnologicalMatrixTable();
                    });
            }
        } else {
            showErrorMessage(result.message || 'Erro ao criar pedido');
        }
    })
    .catch(err => {
        console.error('Erro ao criar pedido:', err);
        showErrorMessage('Erro ao criar pedido');
    });
}

function closeNewOrderModal() {
    const modal = document.getElementById('newOrderModal');
    if (modal) modal.style.display = 'none';
}
var _bidOrderId = null;

function fetchOpenProjects() {
    var list = document.getElementById('openProjectsList');
    if (!list || !pageState.id) return;

    var currentCommitteeId = pageState.id;
    list.innerHTML = '<p style="color:var(--text-secondary,#666);font-style:italic;">Carregando...</p>';

    fetch('/api/committees/open-projects')
        .then(function(r) { return r.json(); })
        .then(function(projects) {
            if (pageState.id !== currentCommitteeId) return;
            if (!projects || projects.length === 0) {
                list.innerHTML = '<p style="color:var(--text-secondary,#666);font-style:italic;">Nenhum projeto aberto.</p>';
                return;
            }
            return Promise.all(projects.map(function(p) {
                return fetch('/api/council/' + (p.councilId || '0') + '/projects/' + p.orderId + '/bids')
                    .then(function(r){return r.json();}).catch(function(){return [];})
                    .then(function(bids) { p.bids = bids; return p; });
            }));
        })
        .then(function(projects) {
            if (pageState.id !== currentCommitteeId || !projects) return;
            if (projects.length === 0) {
                list.innerHTML = '<p style="color:var(--text-secondary,#666);font-style:italic;">Nenhum projeto aberto.</p>';
                return;
            }
            var html = '<table style="width:100%;border-collapse:collapse;">';
            html += '<thead><tr><th style="text-align:left;padding:6px 8px;">Conselho</th><th style="text-align:left;padding:6px 8px;">Projeto</th><th style="text-align:right;padding:6px 8px;">Investimento (h)</th><th style="text-align:center;padding:6px 8px;">Ações</th></tr></thead><tbody>';
            projects.forEach(function(p) {
                var myBid = (p.bids || []).find(function(b) { return b.committeeId == pageState.id; });
                var actionsHtml = '';
                if (myBid) {
                    actionsHtml = '<button class="btn btn-sm" style="padding:2px 6px;font-size:0.7em;margin-right:3px;" onclick="editBid(' + p.orderId + ',\'' + escapeHtml(p.projectName) + '\',\'' + escapeHtml(p.councilName || '') + '\',' + parseFloat(p.quantity) + ',' + parseFloat(myBid.bidHours) + ')">Editar Lance</button>' +
                        '<i class="fas fa-times" style="cursor:pointer;color:#c62828;font-size:0.9em;" onclick="removeBid(' + p.orderId + ')" title="Remover lance"></i>';
                } else {
                    actionsHtml = '<button class="btn btn-sm" style="padding:2px 6px;font-size:0.7em;" onclick="openBidModal(' + p.orderId + ',\'' + escapeHtml(p.projectName) + '\',\'' + escapeHtml(p.councilName || '') + '\',' + parseFloat(p.quantity) + ')">Dar Lance</button>';
                }
                html += '<tr><td style="padding:6px 8px;border-bottom:1px solid var(--border-color-light);">' + escapeHtml(p.councilName || '-') + '</td>' +
                    '<td style="padding:6px 8px;border-bottom:1px solid var(--border-color-light);">' + escapeHtml(p.projectName) + '</td>' +
                    '<td style="text-align:right;padding:6px 8px;border-bottom:1px solid var(--border-color-light);">' + parseFloat(p.quantity).toFixed(2) + ' h</td>' +
                    '<td style="text-align:center;padding:6px 8px;border-bottom:1px solid var(--border-color-light);">' + actionsHtml + '</td></tr>';
            });
            html += '</tbody></table>';
            list.innerHTML = html;
        })
        .catch(function(err) { console.error('Erro ao buscar projetos abertos:', err); });
}

function openBidModal(orderId, projectName, councilName, maxBid, currentBid) {
    _bidOrderId = orderId;
    document.getElementById('bidProjectName').textContent = projectName;
    document.getElementById('bidCouncilName').textContent = councilName + (maxBid ? ' — Lance máximo: ' + maxBid.toFixed(2) + ' h' : '');
    document.getElementById('bidHours').value = currentBid ? currentBid.toFixed(2) : '';
    document.getElementById('bidHours').max = maxBid || '';
    document.getElementById('bidModal').style.display = 'block';
    // Resetar footer para botão padrão
    var mf = document.querySelector('#bidModal .modal-footer');
    if (mf) mf.innerHTML = '<button class="btn btn-primary" onclick="placeBid()">Enviar Lance</button><button class="btn btn-secondary" onclick="closeBidModal()">Cancelar</button>';
}

function closeBidModal() {
    document.getElementById('bidModal').style.display = 'none';
}


function placeBid() {
    var hours = parseFloat(document.getElementById('bidHours').value) || 0;
    if (hours <= 0) { showErrorMessage('Informe as horas propostas.'); return; }
    if (!_bidOrderId || !pageState.id) return;

    fetch('/api/committees/' + pageState.id + '/projects/' + _bidOrderId + '/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidHours: hours })
    })
    .then(function(r) { return r.json(); })
    .then(function(result) {
        if (result.success) {
            showSuccessMessage('Lance enviado com sucesso!');
            closeBidModal();
            // Atualizar botão imediatamente
            var openList = document.getElementById('openProjectsList');
            if (openList) fetchOpenProjects();
        } else {
            showErrorMessage(result.message || 'Erro ao enviar lance');
        }
    })
    .catch(function() { showErrorMessage('Erro ao enviar lance.'); });
}


function editBid(orderId, projectName, councilName, maxBid, currentBid) {
    openBidModal(orderId, projectName, councilName, maxBid, currentBid);
    // Mudar o botão do modal para "Atualizar Lance"
    var modalFooter = document.querySelector('#bidModal .modal-footer');
    if (modalFooter) {
        modalFooter.innerHTML = '<button class="btn btn-primary" onclick="updateBid()">Atualizar Lance</button>' +
            '<button class="btn btn-secondary" onclick="closeBidModal()">Cancelar</button>';
    }
}

function updateBid() {
    var hours = parseFloat(document.getElementById('bidHours').value) || 0;
    if (hours <= 0) { showErrorMessage('Informe as horas propostas.'); return; }
    if (!_bidOrderId || !pageState.id) return;

    fetch('/api/committees/' + pageState.id + '/projects/' + _bidOrderId + '/bid', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidHours: hours })
    })
    .then(function(r) { return r.json(); })
    .then(function(result) {
        if (result.success) {
            showSuccessMessage('Lance atualizado!');
            closeBidModal();
            var openList = document.getElementById('openProjectsList');
            if (openList) fetchOpenProjects();
        } else {
            showErrorMessage(result.message || 'Erro ao atualizar lance');
        }
    })
    .catch(function() { showErrorMessage('Erro ao atualizar lance.'); });
}

function removeBid(orderId) {
    if (!confirm('Remover seu lance deste projeto?')) return;
    fetch('/api/committees/' + pageState.id + '/projects/' + orderId + '/bid', { method: 'DELETE' })
        .then(function(r) { return r.json(); })
        .then(function(result) {
            if (result.success) {
                showSuccessMessage('Lance removido.');
                var openList = document.getElementById('openProjectsList');
                if (openList) fetchOpenProjects();
            } else {
                showErrorMessage(result.message || 'Erro ao remover lance');
            }
        })
        .catch(function() { showErrorMessage('Erro ao remover lance.'); });
}
