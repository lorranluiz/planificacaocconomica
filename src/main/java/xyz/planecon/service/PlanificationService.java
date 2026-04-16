package xyz.planecon.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import xyz.planecon.dto.PlanificationFullDataDTO;
import xyz.planecon.dto.PlanificationRequest;
import xyz.planecon.dto.PlanificationResponse;
import xyz.planecon.dto.PlanificationResponse.OptimizationResult;
import xyz.planecon.model.entity.DemandVector;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.OptimizationInputsResults;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.entity.TechnologicalTensor;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.repository.DemandVectorRepository;
import xyz.planecon.repository.InstanceRepository;
import xyz.planecon.repository.OptimizationInputsResultsRepository;
import xyz.planecon.repository.SocialMaterializationRepository;
import xyz.planecon.repository.TechnologicalTensorRepository;
import xyz.planecon.util.MatrixOperations;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class PlanificationService {

    @Autowired
    private TechnologicalTensorRepository tensorRepository;

    @Autowired
    private DemandVectorRepository demandVectorRepository;

    @Autowired
    private SocialMaterializationRepository socMatRepository;

    @Autowired
    private InstanceRepository instanceRepository;

    @Autowired
    private OptimizationInputsResultsRepository optimizationRepository;

    @Autowired
    private OptimizationService optimizationService;

    private static final Logger logger = LoggerFactory.getLogger(PlanificationService.class);

    @Autowired
    public PlanificationService(
        TechnologicalTensorRepository tensorRepository,
        DemandVectorRepository demandVectorRepository,
        SocialMaterializationRepository socMatRepository,
        InstanceRepository instanceRepository,
        OptimizationInputsResultsRepository optimizationRepository,
        OptimizationService optimizationService) {
        this.tensorRepository = tensorRepository;
        this.demandVectorRepository = demandVectorRepository;
        this.socMatRepository = socMatRepository;
        this.instanceRepository = instanceRepository;
        this.optimizationRepository = optimizationRepository;
        this.optimizationService = optimizationService;
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "planificationFullData", key = "#instanceId")
    public PlanificationFullDataDTO getFullPlanificationData(Integer instanceId) {
        PlanificationFullDataDTO dto = new PlanificationFullDataDTO();
        dto.setInstanceId(instanceId);

        // 1. Buscar a instância
        Instance instance = instanceRepository.findById(instanceId).orElse(null);
        if (instance == null) {
            return null;
        }

        PlanificationFullDataDTO.InstanceDTO instanceDto = new PlanificationFullDataDTO.InstanceDTO(
            instance.getId(),
            instance.getCommitteeName(),
            instance.getType().toString()
        );
        dto.setInstance(instanceDto);

        // 2. Buscar materializações sociais
        List<SocialMaterialization> materializations = socMatRepository.findByInstanceId(instanceId);

        List<PlanificationFullDataDTO.SocialMaterializationDTO> materializationsDto = materializations.stream()
            .map(m -> new PlanificationFullDataDTO.SocialMaterializationDTO(
                m.getId(),
                m.getName(),
                m.getType().toString(),
                m.getSector() != null ? m.getSector().getId() : null,
                m.getSector() != null ? m.getSector().getName() : null
            ))
            .collect(Collectors.toList());
        dto.setMaterializations(materializationsDto);

        // 3. Buscar e montar matriz tecnológica
        List<TechnologicalTensor> tensors = tensorRepository.findByInstanceId(instanceId);

        int size = materializations.size();
        BigDecimal[][] matrix = new BigDecimal[size][size];

        // Inicializar com zeros
        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                matrix[i][j] = BigDecimal.ZERO;
            }
        }

        // Mapear índices de materializações
        Map<Integer, Integer> materializationToIndex = new HashMap<>();
        for (int i = 0; i < materializations.size(); i++) {
            materializationToIndex.put(materializations.get(i).getId(), i);
        }

        // Preencher matriz com valores dos tensores
        for (TechnologicalTensor tensor : tensors) {
            Integer inputIndex = materializationToIndex.get(tensor.getInputSocialMaterialization().getId());
            Integer outputIndex = materializationToIndex.get(tensor.getOutputSocialMaterialization().getId());

            if (inputIndex != null && outputIndex != null) {
                matrix[inputIndex][outputIndex] = tensor.getTechnicalCoefficientElementValue();
            }
        }

        // Nomes das materializações na ordem da matriz
        String[] productNames = new String[size];
        Integer[] productIds = new Integer[size];

        for (int i = 0; i < materializations.size(); i++) {
            SocialMaterialization mat = materializations.get(i);
            int index = materializationToIndex.get(mat.getId());
            productNames[index] = mat.getName();
            productIds[index] = mat.getId();
        }

        PlanificationFullDataDTO.MatrixData matrixData = new PlanificationFullDataDTO.MatrixData(
            matrix, productNames, productIds
        );
        dto.setTechnologicalMatrix(matrixData);

        // 4. Buscar vetor de demanda
        List<DemandVector> demandVectors = demandVectorRepository.findByInstanceId(instanceId);
        BigDecimal[] vector = new BigDecimal[size];

        // Inicializar com zeros
        for (int i = 0; i < size; i++) {
            vector[i] = BigDecimal.ZERO;
        }

        // Preencher vetor com valores de demanda
        for (DemandVector demand : demandVectors) {
            Integer index = materializationToIndex.get(demand.getSocialMaterialization().getId());
            if (index != null) {
                vector[index] = demand.getDemand();
            }
        }

        PlanificationFullDataDTO.VectorData vectorData = new PlanificationFullDataDTO.VectorData(
            vector, productNames, productIds
        );
        dto.setDemandVector(vectorData);

        // 5. Buscar configurações de otimização
        List<OptimizationInputsResults> optimizationConfigs = optimizationRepository.findById_InstanceId(instanceId);
        List<PlanificationFullDataDTO.OptimizationConfigDTO> configDtos = optimizationConfigs.stream()
            .map(c -> {
                SocialMaterialization mat = c.getSocialMaterialization();
                return new PlanificationFullDataDTO.OptimizationConfigDTO(
                    c.getId().getSocialMaterializationId(),
                    mat != null ? mat.getName() : "Desconhecido",
                    c.getWorkerLimit(),
                    c.getWorkerHours(),
                    c.getProductionTime(),
                    c.getWeeklyScale(),
                    c.getNightShift()
                );
            })
            .collect(Collectors.toList());
        dto.setOptimizationConfigs(configDtos);

        // 6. Buscar resultados anteriores se existirem
        if (!optimizationConfigs.isEmpty()) {
            // Construir o vetor de produção
            Double[] productionVector = new Double[size];
            List<PlanificationResponse.OptimizationResult> optimizationResults = new ArrayList<>();

            for (int i = 0; i < size; i++) {
                productionVector[i] = 0.0;
            }

            for (OptimizationInputsResults config : optimizationConfigs) {
                Integer materializationId = config.getId().getSocialMaterializationId();
                Integer index = materializationToIndex.get(materializationId);

                if (index != null && config.getProductionGoal() != null) {
                    productionVector[index] = config.getProductionGoal().doubleValue() / 1000.0;

                    SocialMaterialization mat = materializations.stream()
                        .filter(m -> m.getId().equals(materializationId))
                        .findFirst().orElse(null);

                    if (mat != null) {
                        double factoryOperationHours = config.getWorkerHours().doubleValue();
                        if (config.getNightShift()) {
                            factoryOperationHours *= 3;
                        }

                        Integer committeeCount = countCommitteesForMaterialization(materializationId);

                        PlanificationResponse.OptimizationResult result = new PlanificationResponse.OptimizationResult(
                            materializationId,
                            mat.getName(),
                            config.getProductionGoal().doubleValue(),
                            config.getTotalHours().doubleValue(),
                            (double) config.getWorkersNeeded(),
                            (double) config.getFactoriesNeeded(),
                            config.getProductionTime().doubleValue(),
                            (double) config.getWeeklyScale(),
                            config.getWorkerHours().doubleValue(),
                            factoryOperationHours,
                            config.getWorkerLimit(),
                            config.getMinimumProductionTime().doubleValue(),
                            config.getNightShift(),
                            committeeCount,
                            null // totalMaterializationCapacity
                        );

                        optimizationResults.add(result);
                    }
                }
            }

            if (!optimizationResults.isEmpty()) {
                PlanificationFullDataDTO.PlanificationResultsDTO results =
                    new PlanificationFullDataDTO.PlanificationResultsDTO(
                        productionVector, optimizationResults
                    );
                dto.setPreviousResults(results);
            }
        }

        return dto;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PlanificationResponse planify(PlanificationRequest request) {
        Integer instanceId = request.getInstanceId();

        // Não limpar resultados anteriores para preservar configurações do usuário
        // Remova a linha: optimizationService.clearPreviousResults(instanceId);

        // Converter matrizes de Double para double primitivo
        double[][] techMatrix = convertToDoublePrimitive(request.getTechnologicalMatrix());
        double[] demandVector = convertToDoublePrimitive(request.getDemandVector());

        // Calcular o vetor de produção usando o modelo de Leontief
        double[] productionVector = MatrixOperations.calculateProductionVector(techMatrix, demandVector);

        // Carregar configurações existentes para usar nos cálculos de otimização
        Map<Integer, OptimizationInputsResults> existingConfigs = new HashMap<>();
        List<OptimizationInputsResults> configs = optimizationRepository.findById_InstanceId(instanceId);

        for (OptimizationInputsResults config : configs) {
            existingConfigs.put(config.getId().getSocialMaterializationId(), config);
        }

        // Realizar otimização para cada produto
        List<OptimizationResult> optimizationResults = new ArrayList<>();
        for (int i = 0; i < productionVector.length; i++) {
            try {
                // Obter dados para otimização
                Integer materializationId = request.getMaterializationIds()[i];
                String productName = request.getProductNames()[i];
                double productionNeeded = productionVector[i] * 1000; // Ajustar escala (mil unidades)

                // Contar os comitês existentes para esta materialização
                Integer committeeCount = countCommitteesForMaterialization(materializationId);

                // Verificar se já existe uma configuração para esta materialização
                OptimizationResult result;

                if (existingConfigs.containsKey(materializationId)) {
                    // Usar configuração existente para a otimização
                    OptimizationInputsResults existingConfig = existingConfigs.get(materializationId);

                    // Realizar otimização COM a configuração existente
                    result = optimizationService.performOptimization(
                        materializationId,
                        productName,
                        productionNeeded,
                        instanceId,
                        existingConfig,
                        committeeCount
                    );
                } else {
                    // Criar uma configuração padrão nova
                    result = optimizationService.performOptimization(
                        materializationId,
                        productName,
                        productionNeeded,
                        instanceId,
                        committeeCount
                    );
                }

                optimizationResults.add(result);
            } catch (Exception e) {
                logger.error("Erro ao processar otimização para produto {}: {}", i, e.getMessage(), e);
                
                // Contar comitês para este produto, mesmo em caso de erro
                Integer materializationId = request.getMaterializationIds()[i];
                Integer committeeCount = countCommitteesForMaterialization(materializationId);
                
                // Adicionar um resultado vazio para manter a ordem
                optimizationResults.add(createEmptyOptimizationResult(
                    request.getMaterializationIds()[i],
                    request.getProductNames()[i],
                    productionVector[i] * 1000,
                    committeeCount
                ));
            }
        }

        // Calcular capacidade produtiva mensal por materialização (c_total_i) e total (c_total)
        // c_trabalhador = 4 semanas * escala_semanal * carga_horária_diária
        // T_mensal = limite_trabalhadores * c_trabalhador
        // c_total_i = quantidade_comitês * T_mensal
        double cTotal = 0.0;
        for (OptimizationResult result : optimizationResults) {
            int committees = result.getCommitteeCount() != null ? result.getCommitteeCount() : 0;
            double wHours = result.getWorkerHours() != null ? result.getWorkerHours() : 8.0;
            double wScale = result.getWeeklyScale() != null ? result.getWeeklyScale() : 5.0;
            int wLimit = result.getWorkerLimit() != null ? result.getWorkerLimit() : 100;

            double monthlyWorkerCapacity = 4.0 * wScale * wHours;
            double monthlyCommitteeCapacity = wLimit * monthlyWorkerCapacity;
            double totalMaterializationCapacity = committees * monthlyCommitteeCapacity;

            result.setTotalMaterializationCapacity(totalMaterializationCapacity);
            cTotal += totalMaterializationCapacity;
        }

        // Converter o vetor de produção para Double[]
        Double[] boxedProductionVector = new Double[productionVector.length];
        for (int i = 0; i < productionVector.length; i++) {
            boxedProductionVector[i] = productionVector[i];
        }

        PlanificationResponse response = new PlanificationResponse(
            instanceId,
            boxedProductionVector,
            optimizationResults
        );
        response.setTotalSocialProductionCapacity(cTotal);
        return response;
    }

    /**
     * Conta quantos comitês existem para uma materialização específica
     */
    private Integer countCommitteesForMaterialization(Integer materializationId) {
        try {
            // Contar comitês que produzem esta materialização
            Integer count = instanceRepository.countByTypeAndSocialMaterializationId(
                InstanceType.COMMITTEE, materializationId);
            return count != null ? count : 0;
        } catch (Exception e) {
            logger.warn("Erro ao contar comitês para materialização {}: {}", materializationId, e.getMessage());
            return 0;
        }
    }

    /**
     * Converte matriz de Double para double primitivo
     */
    private double[][] convertToDoublePrimitive(Double[][] matrix) {
        double[][] result = new double[matrix.length][matrix[0].length];
        for (int i = 0; i < matrix.length; i++) {
            for (int j = 0; j < matrix[i].length; j++) {
                result[i][j] = matrix[i][j] != null ? matrix[i][j] : 0.0;
            }
        }
        return result;
    }

    /**
     * Converte vetor de Double para double primitivo
     */
    private double[] convertToDoublePrimitive(Double[] vector) {
        double[] result = new double[vector.length];
        for (int i = 0; i < vector.length; i++) {
            result[i] = vector[i] != null ? vector[i] : 0.0;
        }
        return result;
    }

    // Método auxiliar para criar um resultado de otimização vazio
    private OptimizationResult createEmptyOptimizationResult(Integer materializationId, String productName, double productionNeeded, Integer committeeCount) {
        return new OptimizationResult(
            materializationId,
            productName,
            productionNeeded,
            0.0,  // totalHours
            0.0,  // workersNeeded
            0.0,  // factoriesNeeded
            0.0,  // productionTime
            0.0,  // weeklyScale
            0.0,  // workerHours
            0.0,  // factoryOperationHours
            0,    // workerLimit
            0.0,  // minimumProductionTimeInDays
            false, // nightShift
            committeeCount,
            null  // totalMaterializationCapacity
        );
    }
}