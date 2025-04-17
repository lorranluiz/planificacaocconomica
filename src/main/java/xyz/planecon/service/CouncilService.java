package xyz.planecon.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.planecon.dto.EstimatesResponseDTO;
import xyz.planecon.dto.InstanceDto;
import xyz.planecon.dto.OptimizationConfigsResponseDTO;
import xyz.planecon.exception.ResourceNotFoundException;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.TechnologicalTensor;
import xyz.planecon.model.entity.DemandVector;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.entity.OptimizationInputsResults;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.repository.DemandVectorRepository;
import xyz.planecon.repository.InstanceRepository;
import xyz.planecon.repository.TechnologicalTensorRepository;
import xyz.planecon.repository.SocialMaterializationRepository;
import xyz.planecon.repository.OptimizationInputsResultsRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CouncilService {

    private static final Logger logger = LoggerFactory.getLogger(CouncilService.class);

    @Autowired
    private InstanceRepository instanceRepository;

    @Autowired
    private TechnologicalTensorRepository tensorRepository;

    @Autowired
    private DemandVectorRepository demandVectorRepository;

    @Autowired
    private SocialMaterializationRepository materializationRepository;

    @Autowired
    private OptimizationInputsResultsRepository optimizationRepository;

    /**
     * Calcula estimativas de matriz tecnológica e vetor de demanda com base nas instâncias filhas
     *
     * @param councilId ID da instância do conselho
     * @return Objeto contendo a matriz tecnológica e vetor de demanda calculados
     * @throws ResourceNotFoundException se o conselho não for encontrado
     * @throws IllegalArgumentException se a instância não for um conselho ou não tiver instâncias filhas
     */
    @Transactional(readOnly = true)
    public EstimatesResponseDTO calculateEstimates(Integer councilId) {
        logger.info("Iniciando cálculo de estimativas para conselho ID: {}", councilId);

        // 1. Buscar instância do conselho
        Instance council = instanceRepository.findById(councilId)
                .orElseThrow(() -> new ResourceNotFoundException("Conselho", councilId));

        // 2. Verificar se é realmente um conselho (comentado pois pode ser qualquer tipo de conselho)
        //if (council.getType() != InstanceType.POPULARCOUNCIL) {
        //    throw new IllegalArgumentException("A instância não é um conselho: " + councilId);
        //}

        // 3. Buscar todas as materializações sociais usadas pelas instâncias relevantes
        // Agora vamos buscar separadamente materializações para comitês e conselhos populares
        Set<Integer> allMaterializationIds = findAllRelevantMaterializationIds(councilId);

        if (allMaterializationIds.isEmpty()) {
            logger.warn("Nenhuma materialização encontrada para as instâncias relevantes");
            throw new IllegalArgumentException("Não foram encontradas materializações relevantes para o cálculo de estimativas");
        }

        logger.info("Encontradas {} materializações distintas para cálculos", allMaterializationIds.size());

        // 4. Buscar todas as materializações de uma vez para evitar múltiplas consultas
        List<SocialMaterialization> allMaterializations = materializationRepository.findAllById(allMaterializationIds);

        // 5. Calcular matriz tecnológica média usando TODOS os comitês do sistema
        EstimatesResponseDTO.TechnologicalMatrixDTO techMatrix = calculateAverageTechnologicalMatrixFromAllCommittees(allMaterializations);

        // 6. Calcular vetor de demanda médio usando apenas instâncias POPULARCOUNCIL filhas
        EstimatesResponseDTO.DemandVectorDTO demandVector = calculateAverageDemandVectorFromPopularCouncilChildren(councilId, allMaterializations);

        logger.info("Cálculo de estimativas concluído com sucesso para conselho ID: {}", councilId);

        // 7. Atualizar os dados do conselho com as novas médias
        updateCouncilWithNewEstimates(council, techMatrix, demandVector);

        // 8. Retornar resultado
        return EstimatesResponseDTO.builder()
                .technologicalMatrix(techMatrix)
                .demandVector(demandVector)
                .build();
    }

    /**
     * Encontra todos os IDs de materializações sociais relevantes para os cálculos
     * Inclui materializações de TODOS os comitês e dos conselhos populares filhos
     */
    private Set<Integer> findAllRelevantMaterializationIds(Integer councilId) {
        Set<Integer> materializationIds = new HashSet<>();

        // 1. Coletar IDs das materializações dos tensores tecnológicos de TODOS os comitês
        List<Object[]> committeeTensorsData = tensorRepository
                .calculateAverageCoefficientsByMaterializationPairForAllCommittees();

        for (Object[] row : committeeTensorsData) {
            Integer inputId = ((Number) row[0]).intValue();
            Integer outputId = ((Number) row[1]).intValue();
            materializationIds.add(inputId);
            materializationIds.add(outputId);
        }

        // 2. Coletar IDs das materializações dos vetores de demanda apenas de filhos POPULARCOUNCIL
        List<Object[]> popularCouncilDemandsData = demandVectorRepository
                .calculateAverageDemandsByMaterializationForPopularCouncilChildren(councilId);

        for (Object[] row : popularCouncilDemandsData) {
            Integer matId = ((Number) row[0]).intValue();
            materializationIds.add(matId);
        }

        return materializationIds;
    }

    /**
     * Calcula a matriz tecnológica média baseada em TODOS os comitês do sistema
     */
    private EstimatesResponseDTO.TechnologicalMatrixDTO calculateAverageTechnologicalMatrixFromAllCommittees(
            List<SocialMaterialization> allMaterializations) {

        // 1. Ordenar materializações para garantir consistência
        List<SocialMaterialization> sortedMaterializations = allMaterializations.stream()
                .sorted(Comparator.comparing(SocialMaterialization::getId))
                .collect(Collectors.toList());

        int matSize = sortedMaterializations.size();

        // 2. Mapear IDs de materialização para índices na matriz
        Map<Integer, Integer> matIdToIndex = new HashMap<>();
        for (int i = 0; i < sortedMaterializations.size(); i++) {
            matIdToIndex.put(sortedMaterializations.get(i).getId(), i);
        }

        // 3. Criar matriz de resultados e preenchê-la com zeros
        List<List<Double>> resultMatrix = new ArrayList<>();
        for (int i = 0; i < matSize; i++) {
            List<Double> row = new ArrayList<>();
            for (int j = 0; j < matSize; j++) {
                row.add(0.0);
            }
            resultMatrix.add(row);
        }

        // 4. Buscar médias pré-calculadas de TODOS os comitês do sistema
        List<Object[]> tensorsData = tensorRepository
                .calculateAverageCoefficientsByMaterializationPairForAllCommittees();

        logger.info("Obtidos {} coeficientes médios de tensores de todos os comitês", tensorsData.size());

        // 5. Preencher a matriz com as médias calculadas
        for (Object[] row : tensorsData) {
            Integer inputId = ((Number) row[0]).intValue();
            Integer outputId = ((Number) row[1]).intValue();
            Double avgCoeff = ((Number) row[2]).doubleValue();

            // Verificar se ambas as materializações estão no mapa
            if (matIdToIndex.containsKey(inputId) && matIdToIndex.containsKey(outputId)) {
                int inputIndex = matIdToIndex.get(inputId);
                int outputIndex = matIdToIndex.get(outputId);

                // Atualizar valor na matriz
                resultMatrix.get(inputIndex).set(outputIndex, avgCoeff);
            }
        }

        // 6. Preparar listas de nomes e IDs para o frontend
        List<String> productNames = sortedMaterializations.stream()
                .map(SocialMaterialization::getName)
                .collect(Collectors.toList());

        List<Integer> productIds = sortedMaterializations.stream()
                .map(SocialMaterialization::getId)
                .collect(Collectors.toList());

        return EstimatesResponseDTO.TechnologicalMatrixDTO.builder()
                .matrix(resultMatrix)
                .productNames(productNames)
                .productIds(productIds)
                .build();
    }

    /**
     * Calcula o vetor de demanda médio baseado apenas nas instâncias POPULARCOUNCIL filhas
     */
    private EstimatesResponseDTO.DemandVectorDTO calculateAverageDemandVectorFromPopularCouncilChildren(
            Integer councilId,
            List<SocialMaterialization> allMaterializations) {

        // 1. Ordenar materializações para garantir consistência
        List<SocialMaterialization> sortedMaterializations = allMaterializations.stream()
                .sorted(Comparator.comparing(SocialMaterialization::getId))
                .collect(Collectors.toList());

        // 2. Mapear IDs de materialização para índices no vetor
        Map<Integer, Integer> matIdToIndex = new HashMap<>();
        for (int i = 0; i < sortedMaterializations.size(); i++) {
            matIdToIndex.put(sortedMaterializations.get(i).getId(), i);
        }

        // 3. Criar vetor de resultados inicializado com zeros
        List<Double> resultVector = new ArrayList<>(Collections.nCopies(sortedMaterializations.size(), 0.0));

        // 4. Buscar médias pré-calculadas apenas de filhos POPULARCOUNCIL
        List<Object[]> demandsData = demandVectorRepository
                .calculateAverageDemandsByMaterializationForPopularCouncilChildren(councilId);

        logger.info("Obtidos {} valores médios de demanda de filhos POPULARCOUNCIL", demandsData.size());

        // 5. Preencher o vetor com as médias calculadas
        for (Object[] row : demandsData) {
            Integer matId = ((Number) row[0]).intValue();
            Double avgDemand = ((Number) row[1]).doubleValue();

            // Verificar se a materialização está no mapa
            if (matIdToIndex.containsKey(matId)) {
                int index = matIdToIndex.get(matId);
                resultVector.set(index, avgDemand);
            }
        }

        // 6. Preparar listas de nomes e IDs para o frontend
        List<String> productNames = sortedMaterializations.stream()
                .map(SocialMaterialization::getName)
                .collect(Collectors.toList());

        List<Integer> productIds = sortedMaterializations.stream()
                .map(SocialMaterialization::getId)
                .collect(Collectors.toList());

        return EstimatesResponseDTO.DemandVectorDTO.builder()
                .vector(resultVector)
                .productNames(productNames)
                .productIds(productIds)
                .build();
    }

    /**
     * Retorna todas as instâncias filhas de um conselho
     * 
     * @param councilId ID da instância do conselho
     * @return Lista de instâncias filhas
     */
    @Transactional(readOnly = true)
    public List<InstanceDto> getChildInstances(Integer councilId) {
        logger.info("Buscando instâncias filhas para conselho ID: {}", councilId);
        
        // Verificar se o conselho existe
        Instance council = instanceRepository.findById(councilId)
                .orElseThrow(() -> new ResourceNotFoundException("Conselho", councilId));
        
        // Buscar todas as instâncias filhas diretas (comitês e trabalhadores)
        List<Instance> directChildren = instanceRepository.findByPopularCouncilAssociatedWithCommitteeOrWorker(council);
        
        // Buscar todos os conselhos filhos
        List<Instance> childCouncils = instanceRepository.findByPopularCouncilAssociatedWithPopularCouncil(council);
        
        // Combinar ambas as listas
        List<Instance> allChildren = new ArrayList<>();
        allChildren.addAll(directChildren);
        allChildren.addAll(childCouncils);
        
        // Filtrar para garantir que o conselho atual não está na lista de filhos
        allChildren = allChildren.stream()
                .filter(child -> !child.getId().equals(councilId))
                .collect(Collectors.toList());
        
        logger.info("Encontradas {} instâncias filhas para conselho ID: {} (após filtrar a própria instância)", 
                  allChildren.size(), councilId);
        
        // Converter para DTOs
        return allChildren.stream()
                .map(instance -> {
                    InstanceDto dto = new InstanceDto();
                    dto.setId(instance.getId());
                    
					// Definir nome apropriado com base no tipo
					if (instance.getType() == InstanceType.COMMITTEE) {
						dto.setName(instance.getCommitteeName());
					} else if (instance.getType() == InstanceType.POPULARCOUNCIL) {
						dto.setName(instance.getCommitteeName() != null ? instance.getCommitteeName() : "Conselho #" + instance.getId());
					} else {
						// Caso seja um trabalhador ou outro tipo, usar nome padrão
						dto.setName("Trabalhador #" + instance.getId());
					}
                    
                    // Passar o enum diretamente, não o nome como string
                    dto.setType(instance.getType());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * Calcula a média das configurações de otimização das instâncias filhas por materialização
     * 
     * @param councilId ID do conselho pai
     * @return DTO com as configurações médias de otimização por materialização
     */
    @Transactional(readOnly = true)
    public OptimizationConfigsResponseDTO calculateAverageOptimizationConfigs(Integer councilId) {
        logger.info("Calculando configurações médias de otimização para o conselho ID: {}", councilId);
        
        // 1. Buscar instância do conselho
        Instance council = instanceRepository.findById(councilId)
                .orElseThrow(() -> new ResourceNotFoundException("Conselho", councilId));
                
        // 2. Verificar se é realmente um conselho
        //if (council.getType() != InstanceType.POPULARCOUNCIL) {
        //    throw new IllegalArgumentException("A instância não é um conselho: " + councilId);
       // }
        
        // 3. Buscar todas as instâncias filhas
        List<Instance> allChildren = new ArrayList<>();
        
        // Buscar todas as instâncias filhas diretas (comitês e trabalhadores)
        List<Instance> directChildren = instanceRepository.findByPopularCouncilAssociatedWithCommitteeOrWorker(council);
        allChildren.addAll(directChildren);
        
        // Buscar todos os conselhos filhos
        List<Instance> childCouncils = instanceRepository.findByPopularCouncilAssociatedWithPopularCouncil(council);
        allChildren.addAll(childCouncils);
        
        // Filtrar para evitar incluir o próprio conselho na lista
        allChildren = allChildren.stream()
                .filter(child -> !child.getId().equals(councilId))
                .collect(Collectors.toList());
                
        logger.info("Encontradas {} instâncias filhas para cálculo de configurações de otimização", allChildren.size());
        
        // 4. Para cada materialização, calcular a média das configurações
        Map<Integer, Map<String, List<Object>>> materializationConfigsAggregated = new HashMap<>();
        
        // Para cada instância filha, buscar as configurações de otimização
        for (Instance child : allChildren) {
            // Buscar configurações de otimização desta instância
            List<OptimizationInputsResults> childConfigs = optimizationRepository.findById_InstanceId(child.getId());
            
            for (OptimizationInputsResults config : childConfigs) {
                // Obter a materialização
                Integer materializationId = config.getSocialMaterialization().getId();
                
                // Inicializar o mapa de agregação para esta materialização se não existir
                materializationConfigsAggregated.putIfAbsent(materializationId, new HashMap<>());
                Map<String, List<Object>> configValues = materializationConfigsAggregated.get(materializationId);
                
                // Adicionar valores para as médias
                addToListInMap(configValues, "workerLimit", config.getWorkerLimit());
                addToListInMap(configValues, "workerHours", config.getWorkerHours());
                addToListInMap(configValues, "productionTime", config.getProductionTime());
                addToListInMap(configValues, "weeklyScale", config.getWeeklyScale());
                addToListInMap(configValues, "nightShift", config.getNightShift());
            }
        }
        
        // 5. Calcular as médias
        Map<Integer, OptimizationConfigsResponseDTO.OptimizationConfigDTO> finalConfigs = new HashMap<>();
        
        for (Map.Entry<Integer, Map<String, List<Object>>> entry : materializationConfigsAggregated.entrySet()) {
            Integer materializationId = entry.getKey();
            Map<String, List<Object>> configValues = entry.getValue();
            
            // Calcular média de workerLimit
            Integer workerLimit = calculateIntegerAverage(configValues.get("workerLimit"));
            
            // Calcular média de workerHours
            BigDecimal workerHours = calculateBigDecimalAverage(configValues.get("workerHours"));
            
            // Calcular média de productionTime
            BigDecimal productionTime = calculateBigDecimalAverage(configValues.get("productionTime"));
            
            // Calcular média de weeklyScale
            Integer weeklyScale = calculateIntegerAverage(configValues.get("weeklyScale"));
            
            // Calcular valor mais comum de nightShift
            Boolean nightShift = calculateMostCommonBoolean(configValues.get("nightShift"));
            
            // Criar DTO de configuração
            OptimizationConfigsResponseDTO.OptimizationConfigDTO configDTO = 
                OptimizationConfigsResponseDTO.OptimizationConfigDTO.builder()
                    .workerLimit(workerLimit)
                    .workerHours(workerHours)
                    .productionTime(productionTime)
                    .weeklyScale(weeklyScale)
                    .nightShift(nightShift)
                    .build();
                    
            // Adicionar ao mapa final
            finalConfigs.put(materializationId, configDTO);
            
            logger.info("Configuração média calculada para materialização {}: {}", materializationId, configDTO);
        }
        
        return OptimizationConfigsResponseDTO.builder()
                .materializationConfigs(finalConfigs)
                .build();
    }
    
    /**
     * Adiciona um valor a uma lista em um mapa, criando a lista se não existir
     */
    private <T> void addToListInMap(Map<String, List<Object>> map, String key, T value) {
        if (value == null) return;
        
        map.putIfAbsent(key, new ArrayList<>());
        map.get(key).add(value);
    }
    
    /**
     * Calcula a média de valores inteiros
     */
    private Integer calculateIntegerAverage(List<Object> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        
        int sum = 0;
        int count = 0;
        
        for (Object value : values) {
            if (value instanceof Integer) {
                sum += (Integer) value;
                count++;
            } else if (value instanceof Number) {
                sum += ((Number) value).intValue();
                count++;
            }
        }
        
        return count > 0 ? sum / count : null;
    }
    
    /**
     * Calcula a média de valores BigDecimal
     */
    private BigDecimal calculateBigDecimalAverage(List<Object> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        
        BigDecimal sum = BigDecimal.ZERO;
        int count = 0;
        
        for (Object value : values) {
            if (value instanceof BigDecimal) {
                sum = sum.add((BigDecimal) value);
                count++;
            } else if (value instanceof Number) {
                sum = sum.add(BigDecimal.valueOf(((Number) value).doubleValue()));
                count++;
            }
        }
        
        return count > 0 ? sum.divide(BigDecimal.valueOf(count), 4, RoundingMode.HALF_UP) : null;
    }
    
    /**
     * Calcula o valor booleano mais comum (moda)
     */
    private Boolean calculateMostCommonBoolean(List<Object> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        
        int trueCount = 0;
        int falseCount = 0;
        
        for (Object value : values) {
            if (value instanceof Boolean) {
                if ((Boolean) value) {
                    trueCount++;
                } else {
                    falseCount++;
                }
            }
        }
        
        return trueCount >= falseCount;
    }

    /**
     * Atualiza os dados do conselho com as novas estimativas calculadas
     */
    @Transactional
    private void updateCouncilWithNewEstimates(
            Instance council,
            EstimatesResponseDTO.TechnologicalMatrixDTO techMatrix,
            EstimatesResponseDTO.DemandVectorDTO demandVector) {

        try {
            // 1. Atualizar tensores tecnológicos do conselho
            updateCouncilTensors(council, techMatrix);

            // 2. Atualizar vetores de demanda do conselho
            updateCouncilDemands(council, demandVector);

            logger.info("Dados do conselho atualizados com as novas estimativas");
        } catch (Exception e) {
            logger.error("Erro ao atualizar dados do conselho com novas estimativas", e);
            throw e;
        }
    }

    /**
     * Atualiza os tensores tecnológicos do conselho com os novos valores
     */
    private void updateCouncilTensors(Instance council, EstimatesResponseDTO.TechnologicalMatrixDTO techMatrix) {
        List<List<Double>> matrix = techMatrix.getMatrix();
        List<Integer> productIds = techMatrix.getProductIds();

        for (int i = 0; i < matrix.size(); i++) {
            for (int j = 0; j < matrix.get(i).size(); j++) {
                Double value = matrix.get(i).get(j);
                // Só salvar se o valor for maior que zero
                if (value > 0) {
                    Integer inputMatId = productIds.get(i);
                    Integer outputMatId = productIds.get(j);

                    // Buscar materializações
                    SocialMaterialization inputMat = materializationRepository.findById(inputMatId)
                            .orElseThrow(() -> new IllegalArgumentException("Materialização de entrada não encontrada: " + inputMatId));

                    SocialMaterialization outputMat = materializationRepository.findById(outputMatId)
                            .orElseThrow(() -> new IllegalArgumentException("Materialização de saída não encontrada: " + outputMatId));

                    // Criar ID do tensor
                    TechnologicalTensor.TechnologicalTensorId tensorId =
                            new TechnologicalTensor.TechnologicalTensorId(council.getId(), inputMatId, outputMatId);

                    // Buscar tensor existente ou criar novo
                    TechnologicalTensor tensor = tensorRepository.findById(tensorId)
                            .orElseGet(() -> {
                                TechnologicalTensor newTensor = new TechnologicalTensor();
                                newTensor.setId(tensorId);
                                newTensor.setInstance(council);
                                newTensor.setInputSocialMaterialization(inputMat);
                                newTensor.setOutputSocialMaterialization(outputMat);
                                newTensor.setCreatedAt(java.time.LocalDateTime.now());
                                return newTensor;
                            });

                    // Atualizar coeficiente
                    tensor.setTechnicalCoefficientElementValue(BigDecimal.valueOf(value));

                    // Salvar
                    tensorRepository.save(tensor);
                }
            }
        }
    }

    /**
     * Atualiza os vetores de demanda do conselho com os novos valores
     */
    private void updateCouncilDemands(Instance council, EstimatesResponseDTO.DemandVectorDTO demandVector) {
        List<Double> vector = demandVector.getVector();
        List<Integer> productIds = demandVector.getProductIds();

        for (int i = 0; i < vector.size(); i++) {
            Double value = vector.get(i);
            // Mesmo para valor zero, criar/atualizar o vetor de demanda
            Integer matId = productIds.get(i);

            // Buscar materialização
            SocialMaterialization mat = materializationRepository.findById(matId)
                    .orElseThrow(() -> new IllegalArgumentException("Materialização não encontrada: " + matId));

            // Criar ID do vetor de demanda
            DemandVector.DemandVectorId demandId =
                    new DemandVector.DemandVectorId(council.getId(), matId);

            // Buscar vetor existente ou criar novo
            DemandVector demand = demandVectorRepository.findById(demandId)
                    .orElseGet(() -> {
                        DemandVector newDemand = new DemandVector();
                        newDemand.setId(demandId);
                        newDemand.setInstance(council);
                        newDemand.setSocialMaterialization(mat);
                        newDemand.setCreatedAt(java.time.LocalDateTime.now());
                        return newDemand;
                    });

            // Atualizar demanda
            demand.setDemand(BigDecimal.valueOf(value));

            // Salvar
            demandVectorRepository.save(demand);
        }
    }
}
