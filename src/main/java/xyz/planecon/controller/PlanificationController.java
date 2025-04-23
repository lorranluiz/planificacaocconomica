package xyz.planecon.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import xyz.planecon.dto.InstanceDto;
import xyz.planecon.dto.PlanificationRequest;
import xyz.planecon.dto.PlanificationResponse;
import xyz.planecon.dto.SocialMaterializationDto;
import xyz.planecon.dto.TensorCreationDto;
import xyz.planecon.dto.PlanificationFullDataDTO;
import xyz.planecon.model.entity.DemandVector;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.OptimizationInputsResults;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.entity.TechnologicalTensor;
import xyz.planecon.model.entity.TechnologicalTensor.TechnologicalTensorId;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.repository.DemandVectorRepository;
import xyz.planecon.repository.InstanceRepository;
import xyz.planecon.repository.SocialMaterializationRepository;
import xyz.planecon.repository.TechnologicalTensorRepository;
import xyz.planecon.repository.OptimizationInputsResultsRepository;
import xyz.planecon.service.PlanificationService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/planification")
public class PlanificationController {

    private static final Logger logger = LoggerFactory.getLogger(PlanificationController.class);

    private final PlanificationService planificationService;
    private final InstanceRepository instanceRepository;
    private final SocialMaterializationRepository materializationRepository;
    private final TechnologicalTensorRepository tensorRepository;
    private final DemandVectorRepository demandVectorRepository;
    private final OptimizationInputsResultsRepository optimizationRepository;

    @Autowired
    public PlanificationController(
            PlanificationService planificationService,
            InstanceRepository instanceRepository,
            SocialMaterializationRepository materializationRepository,
            TechnologicalTensorRepository tensorRepository,
            DemandVectorRepository demandVectorRepository,
            OptimizationInputsResultsRepository optimizationRepository) {
        this.planificationService = planificationService;
        this.instanceRepository = instanceRepository;
        this.materializationRepository = materializationRepository;
        this.tensorRepository = tensorRepository;
        this.demandVectorRepository = demandVectorRepository;
        this.optimizationRepository = optimizationRepository;
    }

    /**
     * Endpoint para obter todas as instâncias disponíveis
     */
    @GetMapping("/instances")
    public ResponseEntity<List<InstanceDto>> getAllInstances() {
        List<Instance> instances = instanceRepository.findAll();
        List<InstanceDto> instanceDtos = instances.stream()
            .map(instance -> {
                InstanceDto dto = new InstanceDto();
                dto.setId(instance.getId());
                
                // Gerar nome com base no tipo da instância
                if (instance.getType() != null) {
                    switch (instance.getType()) {
                        case COMMITTEE:
                            dto.setName(instance.getCommitteeName() != null ? 
                                       instance.getCommitteeName() : "Comitê #" + instance.getId());
                            break;
                        case POPULARCOUNCIL:
                            dto.setName("Conselho #" + instance.getId());
                            break;
                        case WORKER:
                            dto.setName("Worker #" + instance.getId());
                            break;
                        default:
                            dto.setName("Instância #" + instance.getId());
                            break;
                    }
                } else {
                    dto.setName("Instância #" + instance.getId());
                }
                
                // Gerar descrição com informações adicionais úteis
                StringBuilder description = new StringBuilder();
                if (instance.getType() != null) {
                    description.append("Tipo: ").append(instance.getType());
                }
                if (instance.getCreatedAt() != null) {
                    description.append(description.length() > 0 ? ", " : "");
                    description.append("Criado em: ").append(instance.getCreatedAt());
                }
                dto.setDescription(description.toString());
                
                // Se tiver uma instância pai, adicione apenas o ID e nome
                if (instance.getPopularCouncilAssociatedWithPopularCouncil() != null) {
                    Instance parent = instance.getPopularCouncilAssociatedWithPopularCouncil();
                    dto.setParentInstanceId(parent.getId());
                    
                    // Gerar nome para o pai também
                    String parentName;
                    if (parent.getType() == null) {
                        parentName = "Instância #" + parent.getId();
                    } else {
                        switch (parent.getType()) {
                            case COMMITTEE:
                                parentName = parent.getCommitteeName() != null ? 
                                           parent.getCommitteeName() : "Comitê #" + parent.getId();
                                break;
                            case POPULARCOUNCIL:
                                parentName = "Conselho #" + parent.getId();
                                break;
                            case WORKER:
                                parentName = "Worker #" + parent.getId();
                                break;
                            default:
                                parentName = "Instância #" + parent.getId();
                                break;
                        }
                    }
                    dto.setParentInstanceName(parentName);
                }
                
                return dto;
            })
            .collect(Collectors.toList());
        return ResponseEntity.ok(instanceDtos);
    }

    /**
     * Endpoint para obter materializações sociais de uma instância
     */
    @GetMapping("/instances/{instanceId}/materializations")
    public ResponseEntity<List<SocialMaterializationDto>> getMaterializations(@PathVariable Integer instanceId) {
        List<SocialMaterialization> materializations = materializationRepository.findByInstanceId(instanceId);
        
        List<SocialMaterializationDto> dtos = materializations.stream()
            .map(material -> new SocialMaterializationDto(material))
            .collect(Collectors.toList());
            
        return ResponseEntity.ok(dtos);
    }

    /**
     * Endpoint para obter a matriz tecnológica de uma instância
     */
    @GetMapping("/instances/{instanceId}/technological-matrix")
    public ResponseEntity<Map<String, Object>> getTechnologicalMatrix(@PathVariable Integer instanceId) {
        // Buscar materializações sociais da instância
        List<SocialMaterialization> materializations = materializationRepository.findByInstanceId(instanceId);
        
        if (materializations.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        // Organizar as materializações por ID
        Map<Integer, SocialMaterialization> materializationsMap = materializations.stream()
            .collect(Collectors.toMap(SocialMaterialization::getId, mat -> mat));
        
        // Buscar tensores tecnológicos
        List<TechnologicalTensor> tensors = tensorRepository.findByInstanceId(instanceId);
        
        // Criar matriz tecnológica
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
        
        // Retornar resultado
        Map<String, Object> result = new HashMap<>();
        result.put("matrix", matrix);
        result.put("productNames", productNames);
        result.put("productIds", productIds);
        
        return ResponseEntity.ok(result);
    }
    
    /**
     * Endpoint para obter o vetor de demanda de uma instância
     */
    @GetMapping("/instances/{instanceId}/demand-vector")
    public ResponseEntity<Map<String, Object>> getDemandVector(@PathVariable Integer instanceId) {
        // Buscar materializações sociais da instância
        List<SocialMaterialization> materializations = materializationRepository.findByInstanceId(instanceId);
        
        if (materializations.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        // Buscar vetores de demanda
        List<DemandVector> demandVectors = demandVectorRepository.findByInstanceId(instanceId);
        
        // Mapear índices de materializações
        Map<Integer, Integer> materializationToIndex = new HashMap<>();
        for (int i = 0; i < materializations.size(); i++) {
            materializationToIndex.put(materializations.get(i).getId(), i);
        }
        
        // Criar vetor de demanda
        int size = materializations.size();
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
        
        // Nomes das materializações na ordem do vetor
        String[] productNames = new String[size];
        Integer[] productIds = new Integer[size];
        
        for (int i = 0; i < materializations.size(); i++) {
            SocialMaterialization mat = materializations.get(i);
            int index = materializationToIndex.get(mat.getId());
            productNames[index] = mat.getName();
            productIds[index] = mat.getId();
        }
        
        // Retornar resultado
        Map<String, Object> result = new HashMap<>();
        result.put("vector", vector);
        result.put("productNames", productNames);
        result.put("productIds", productIds);
        
        return ResponseEntity.ok(result);
    }
    
    /**
     * Novo endpoint que busca o vetor de demanda diretamente sem depender de TechnologicalTensor
     * Este endpoint é especificamente para a página popularcouncil.js
     */
    @GetMapping("/demand-vector/by-instance/{instanceId}")
    public ResponseEntity<Map<String, Object>> getDemandVectorDirectlyByInstance(@PathVariable Integer instanceId) {
        logger.info("Buscando vetor de demanda diretamente para instância {}", instanceId);
        
        try {
            // Buscar todos os vetores de demanda para esta instância
            List<DemandVector> demandVectors = demandVectorRepository.findByInstanceId(instanceId);
            
            // Se não houver vetores de demanda, retornar arrays vazios
            if (demandVectors.isEmpty()) {
                Map<String, Object> emptyResult = new HashMap<>();
                emptyResult.put("vector", new BigDecimal[0]);
                emptyResult.put("productNames", new String[0]);
                emptyResult.put("productIds", new Integer[0]);
                
                logger.info("Nenhum vetor de demanda encontrado para instância {}", instanceId);
                return ResponseEntity.ok(emptyResult);
            }
            
            // Extrair materializações únicas dos vetores de demanda
            Set<SocialMaterialization> materializationSet = demandVectors.stream()
                .map(DemandVector::getSocialMaterialization)
                .collect(Collectors.toSet());
            
            List<SocialMaterialization> materializations = new ArrayList<>(materializationSet);
            
            // Ordenar por ID para consistência
            materializations.sort(Comparator.comparing(SocialMaterialization::getId));
            
            // Mapear índices de materializações
            Map<Integer, Integer> materializationToIndex = new HashMap<>();
            for (int i = 0; i < materializations.size(); i++) {
                materializationToIndex.put(materializations.get(i).getId(), i);
            }
            
            // Criar vetor de demanda
            int size = materializations.size();
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
            
            // Nomes das materializações na ordem do vetor
            String[] productNames = new String[size];
            Integer[] productIds = new Integer[size];
            
            for (int i = 0; i < materializations.size(); i++) {
                SocialMaterialization mat = materializations.get(i);
                int index = materializationToIndex.get(mat.getId());
                productNames[index] = mat.getName();
                productIds[index] = mat.getId();
            }
            
            // Retornar resultado
            Map<String, Object> result = new HashMap<>();
            result.put("vector", vector);
            result.put("productNames", productNames);
            result.put("productIds", productIds);
            
            logger.info("Vetor de demanda retornado com sucesso, contendo {} materializações", size);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Erro ao buscar vetor de demanda para instância {}: {}", instanceId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Endpoint para executar a planificação
     */
    @PostMapping("/planify")
    public ResponseEntity<PlanificationResponse> planify(@RequestBody PlanificationRequest request) {
        PlanificationResponse response = planificationService.planify(request);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Endpoint para salvar um tensor na matriz tecnológica
     */
    @PostMapping("/technological-tensor")
    public ResponseEntity<?> saveTensor(@RequestBody TensorCreationDto tensorDto) {
        try {
            // Buscar entidades relacionadas
            SocialMaterialization inputMat = materializationRepository.findById(tensorDto.getInputMaterializationId())
                    .orElseThrow(() -> new RuntimeException("Materialização de entrada não encontrada"));
            
            SocialMaterialization outputMat = materializationRepository.findById(tensorDto.getOutputMaterializationId())
                    .orElseThrow(() -> new RuntimeException("Materialização de saída não encontrada"));
            
            Instance instance = instanceRepository.findById(tensorDto.getInstanceId())
                    .orElseThrow(() -> new RuntimeException("Instância não encontrada"));
            
            // Criar o ID completo com os três campos
            TechnologicalTensor.TechnologicalTensorId id = new TechnologicalTensor.TechnologicalTensorId(
                instance.getId(),
                tensorDto.getInputMaterializationId(), 
                tensorDto.getOutputMaterializationId()
            );
            
            TechnologicalTensor tensor;
            Optional<TechnologicalTensor> existingTensor = tensorRepository.findById(id);
            
            if (existingTensor.isPresent()) {
                // Atualizar tensor existente
                tensor = existingTensor.get();
                tensor.setTechnicalCoefficientElementValue(new BigDecimal(tensorDto.getQuantity().toString()));
            } else {
                // Criar novo tensor
                tensor = new TechnologicalTensor();
                tensor.setId(id);
                tensor.setInputSocialMaterialization(inputMat);
                tensor.setOutputSocialMaterialization(outputMat);
                tensor.setInstance(instance);
                tensor.setTechnicalCoefficientElementValue(new BigDecimal(tensorDto.getQuantity().toString()));
                tensor.setCreatedAt(LocalDateTime.now());
            }
            
            TechnologicalTensor savedTensor = tensorRepository.save(tensor);
            
            // CORREÇÃO: Em vez de retornar a entidade diretamente, retornar um Map com os dados simplificados
            // para evitar ciclos de referência durante a serialização JSON
            Map<String, Object> response = new HashMap<>();
            response.put("id", Map.of(
                "instanceId", savedTensor.getId().getInstanceId(),
                "inputSocialMaterializationId", savedTensor.getId().getInputSocialMaterializationId(),
                "outputSocialMaterializationId", savedTensor.getId().getOutputSocialMaterializationId()
            ));
            response.put("coefficient", savedTensor.getTechnicalCoefficientElementValue());
            response.put("inputMaterialization", savedTensor.getInputSocialMaterialization().getName());
            response.put("outputMaterialization", savedTensor.getOutputSocialMaterialization().getName());
            response.put("createdAt", savedTensor.getCreatedAt());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Erro ao salvar tensor tecnológico", e);
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Erro ao salvar tensor tecnológico: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * Endpoint para salvar um valor no vetor de demanda
     */
    @PostMapping("/demand-vector")
    @CacheEvict(value = {"demandVector", "demandVectors"}, allEntries = true)
    public ResponseEntity<?> saveDemandVector(@RequestBody Map<String, Object> payload) {
        try {
            // Log para debug dos dados recebidos
            logger.info("Recebido payload para salvar vetor de demanda: {}", payload);
            
            // Safe conversion of instanceId
            Integer instanceId = null;
            if (payload.get("instanceId") instanceof Number) {
                instanceId = ((Number) payload.get("instanceId")).intValue();
            } else if (payload.get("instanceId") instanceof String) {
                instanceId = Integer.parseInt((String) payload.get("instanceId"));
            } else {
                throw new IllegalArgumentException("instanceId deve ser um número válido");
            }

            // Safe conversion of materializationId
            Integer materializationId = null;
            if (payload.get("materializationId") instanceof Number) {
                materializationId = ((Number) payload.get("materializationId")).intValue();
            } else if (payload.get("materializationId") instanceof String) {
                materializationId = Integer.parseInt((String) payload.get("materializationId"));
            } else {
                throw new IllegalArgumentException("materializationId deve ser um número válido");
            }

            // Safe conversion of quantity/demand to BigDecimal
            BigDecimal demand = null;
            // Primeiro tente com o nome "demand" (novo nome do campo)
            Object demandObj = payload.get("demand");
            if (demandObj == null) {
                // Se não encontrar, tente com "quantity" (nome antigo do campo) para compatibilidade
                demandObj = payload.get("quantity");
            }
            
            if (demandObj instanceof Number) {
                demand = new BigDecimal(demandObj.toString());
            } else if (demandObj instanceof String) {
                demand = new BigDecimal((String) demandObj);
            } else {
                demand = BigDecimal.ZERO; // Default to zero if invalid
                logger.warn("Valor de demanda inválido no payload: {}, usando 0 como padrão", demandObj);
            }
            
            logger.info("Valores convertidos: instanceId={}, materializationId={}, demand={}", 
                       instanceId, materializationId, demand);
            
            // Buscar entidades relacionadas
            SocialMaterialization materialization = materializationRepository.findById(materializationId)
                    .orElseThrow(() -> new RuntimeException("Materialização não encontrada"));
                    
            Instance instance = instanceRepository.findById(instanceId)
                    .orElseThrow(() -> new RuntimeException("Instância não encontrada"));
            
            // Verificar se já existe um vetor com esses IDs
            DemandVector.DemandVectorId id = new DemandVector.DemandVectorId(instanceId, materializationId);
            DemandVector demandVector;
            
            Optional<DemandVector> existingVector = demandVectorRepository.findById(id);
            if (existingVector.isPresent()) {
                // Atualizar vetor existente
                logger.info("Atualizando vetor de demanda existente: {}", id);
                demandVector = existingVector.get();
                demandVector.setDemand(demand);
            } else {
                // Criar novo vetor
                logger.info("Criando novo vetor de demanda: {}", id);
                demandVector = new DemandVector();
                demandVector.setId(id); // Definir ID diretamente
                demandVector.setSocialMaterialization(materialization);
                demandVector.setInstance(instance);
                demandVector.setDemand(demand);
                demandVector.setCreatedAt(LocalDateTime.now());
            }
            
            DemandVector savedVector = demandVectorRepository.save(demandVector);
            logger.info("Vetor de demanda salvo com sucesso: {}", savedVector.getId());
            
            // Return a simplified response instead of the entity to avoid circular references
            Map<String, Object> response = new HashMap<>();
            response.put("instanceId", instanceId);
            response.put("materializationId", materializationId);
            response.put("materializationName", materialization.getName());
            response.put("demand", savedVector.getDemand());
            response.put("createdAt", savedVector.getCreatedAt());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Erro ao salvar vetor de demanda", e);
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Erro ao salvar vetor de demanda: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * Endpoint para buscar resultados de planificação anteriores
     */
    @GetMapping("/previous-results/{instanceId}")
    public ResponseEntity<PlanificationResponse> getPreviousResults(@PathVariable Integer instanceId) {
        try {
            // Buscar materializações sociais da instância
            List<SocialMaterialization> materializations = materializationRepository.findByInstanceId(instanceId);
            
            if (materializations.isEmpty()) {
                logger.info("Nenhuma materialização social encontrada para instância {}", instanceId);
                return ResponseEntity.notFound().build();
            }
            
            // Buscar resultados de otimização existentes
            List<OptimizationInputsResults> configs = optimizationRepository.findById_InstanceId(instanceId);
            
            if (configs.isEmpty()) {
                logger.info("Nenhuma configuração de otimização encontrada para instância {}", instanceId);
                return ResponseEntity.notFound().build();
            }
            
            // Construir o vetor de produção a partir dos resultados de otimização
            Double[] productionVector = new Double[materializations.size()];
            List<PlanificationResponse.OptimizationResult> optimizationResults = new ArrayList<>();
            
            // Mapear materializações por ID
            Map<Integer, Integer> materializationToIndex = new HashMap<>();
            for (int i = 0; i < materializations.size(); i++) {
                materializationToIndex.put(materializations.get(i).getId(), i);
                productionVector[i] = 0.0; // Inicializar com zero
            }
            
            // Preencher com valores das configurações
            for (OptimizationInputsResults config : configs) {
                Integer materializationId = config.getId().getSocialMaterializationId();
                Integer index = materializationToIndex.get(materializationId);
                
                if (index != null && config.getProductionGoal() != null) {
                    // Converter de unidades para milhares (divisão por 1000)
                    productionVector[index] = config.getProductionGoal().doubleValue() / 1000.0;
                    
                    // Adicionar resultado de otimização
                    SocialMaterialization materialization = materializations.get(index);
                    
                    // O valor de factoryOperationHours depende do nightShift
                    double factoryOperationHours = config.getWorkerHours().doubleValue();
                    if (config.getNightShift()) {
                        factoryOperationHours *= 3; // 3 turnos quando noturno está ativo
                    }
                    
                    // Obter o número de comitês associados à materialização
                    Integer committeeCount = instanceRepository.countByTypeAndSocialMaterializationId(
                        InstanceType.COMMITTEE, materializationId);
                    
                    PlanificationResponse.OptimizationResult result = new PlanificationResponse.OptimizationResult(
                        materializationId,
                        materialization.getName(),
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
                        committeeCount // Adicionar o número de comitês
                    );
                    
                    optimizationResults.add(result);
                }
            }
            
            // Verificar se temos pelo menos um resultado de otimização
            if (optimizationResults.isEmpty()) {
                logger.info("Nenhum resultado de otimização calculado para instância {}", instanceId);
                return ResponseEntity.notFound().build();
            }
            
            // Criar a resposta
            PlanificationResponse response = new PlanificationResponse(
                instanceId,
                productionVector,
                optimizationResults
            );
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Erro ao buscar resultados anteriores: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Endpoint para excluir um tensor da matriz tecnológica por materialização
     */
    @DeleteMapping("/technological-tensor/by-materialization/{materializationId}/instance/{instanceId}")
    @Transactional
    public ResponseEntity<?> deleteTensorByMaterialization(@PathVariable Integer materializationId, 
                                                          @PathVariable Integer instanceId) {
        try {
            logger.info("Solicitada exclusão de tensores para materialização {} na instância {}", 
                      materializationId, instanceId);
            
            // Modificação: Em vez de usar deleteAll que lança exceção quando o registro não existe,
            // usar um método personalizado que executa uma query nativa SQL para excluir sem validar existência
            int deletedCount = tensorRepository.deleteByInstanceIdAndMaterializationId(
                instanceId, materializationId);
            
            // Log do resultado para depuração
            logger.info("Exclusão de tensores concluída. {} registros afetados", deletedCount);
            
            return ResponseEntity.ok(Map.of(
                "message", "Tensores tecnológicos excluídos com sucesso",
                "deletedCount", deletedCount
            ));
        } catch (Exception e) {
            logger.error("Erro ao excluir tensores tecnológicos", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Erro ao excluir tensores tecnológicos: " + e.getMessage()));
        }
    }

    /**
     * Endpoint para excluir um valor do vetor de demanda
     */
    @DeleteMapping("/demand-vector/{materializationId}/instance/{instanceId}")
    @CacheEvict(value = {"demandVector", "demandVectors"}, allEntries = true)
    public ResponseEntity<?> deleteDemandVector(
            @PathVariable Integer materializationId,
            @PathVariable Integer instanceId) {
        try {
            logger.info("Excluindo vetor de demanda para materialização {} na instância {}", 
                        materializationId, instanceId);
            
            // CORREÇÃO: Invertida a ordem dos parâmetros para corresponder à definição da classe
            DemandVector.DemandVectorId id = new DemandVector.DemandVectorId(instanceId, materializationId);
            
            // Verificar se existe
            Optional<DemandVector> vectorOptional = demandVectorRepository.findById(id);
            if (!vectorOptional.isPresent()) {
                // Se não encontrar, pode ser devido à ordem invertida nas versões anteriores
                // Tente com a ordem inversa para compatibilidade
                DemandVector.DemandVectorId alternativeId = new DemandVector.DemandVectorId(materializationId, instanceId);
                vectorOptional = demandVectorRepository.findById(alternativeId);
                
                if (!vectorOptional.isPresent()) {
                    Map<String, String> response = new HashMap<>();
                    response.put("message", "Vetor de demanda não encontrado");
                    return ResponseEntity.ok(response); // Retornar OK mesmo se não encontrar
                } else {
                    // Se encontrou com a ordem inversa, use esse ID
                    id = alternativeId;
                }
            }
            
            // 1. Excluir o vetor de demanda
            demandVectorRepository.deleteById(id);
            
            // 2. Excluir os tensores tecnológicos relacionados usando a nova query otimizada
            // MODIFICAÇÃO: Use o método específico em vez de buscar e depois excluir
            try {
                tensorRepository.deleteByInstanceIdAndMaterializationId(instanceId, materializationId);
                logger.info("Tensores tecnológicos relacionados excluídos com sucesso");
            } catch (Exception e) {
                // Log o erro mas continue - não queremos falhar a operação inteira
                // se alguns tensores não puderam ser excluídos
                logger.warn("Aviso ao excluir tensores tecnológicos relacionados: {}", e.getMessage());
            }
            
            // 3. Excluir configurações de otimização relacionadas
            try {
                OptimizationInputsResults.OptimizationInputsResultsId optimizationId = 
                    new OptimizationInputsResults.OptimizationInputsResultsId(instanceId, materializationId);
                
                if (optimizationRepository.existsById(optimizationId)) {
                    logger.info("Excluindo também configuração de otimização relacionada");
                    optimizationRepository.deleteById(optimizationId);
                }
            } catch (Exception e) {
                // Log o erro mas continue
                logger.warn("Aviso ao excluir configuração de otimização relacionada: {}", e.getMessage());
            }
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Vetor de demanda e dados relacionados excluídos com sucesso");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Erro ao excluir vetor de demanda: {}", e.getMessage(), e);
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Erro ao excluir vetor de demanda: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Endpoint para obter configuração de otimização para uma materialização específica
     */
    @GetMapping("/instances/{instanceId}/optimization/{materializationId}")
    public ResponseEntity<?> getOptimizationConfig(
            @PathVariable Integer instanceId,
            @PathVariable Integer materializationId) {
        try {
            logger.info("Buscando configuração de otimização para instância {} e materialização {}", 
                        instanceId, materializationId);
            
            // Criar ID composto
            OptimizationInputsResults.OptimizationInputsResultsId id = 
                new OptimizationInputsResults.OptimizationInputsResultsId(instanceId, materializationId);
            
            // Buscar configuração
            Optional<OptimizationInputsResults> optConfig = optimizationRepository.findById(id);
            
            if (optConfig.isPresent()) {
                OptimizationInputsResults config = optConfig.get();
                
                // Converter para formato compatível com frontend
                Map<String, Object> result = new HashMap<>();
                result.put("workerLimit", config.getWorkerLimit());
                result.put("workerHours", config.getWorkerHours());
                result.put("productionTime", config.getProductionTime());
                result.put("weeklyScale", config.getWeeklyScale());
                result.put("nightShift", config.getNightShift());
                result.put("materializationId", materializationId);
                
                // Adicionar cabeçalho de cache para prevenir cache do navegador
                return ResponseEntity
                    .ok()
                    .cacheControl(CacheControl.noCache().mustRevalidate())
                    .header("Pragma", "no-cache") // HTTP 1.0 compatibilidade
                    .header("Expires", "0") // Proxies
                    .body(result);
            } else {
                logger.info("Configuração não encontrada, retornando valores padrão");
                // Retornar valores padrão se não encontrar configuração
                Map<String, Object> defaultConfig = new HashMap<>();
                defaultConfig.put("workerLimit", 100);
                defaultConfig.put("workerHours", new BigDecimal("8.0"));
                defaultConfig.put("productionTime", new BigDecimal("1.0"));
                defaultConfig.put("weeklyScale", 5);
                defaultConfig.put("nightShift", false);
                defaultConfig.put("materializationId", materializationId);
                
                // Adicionar cabeçalho de cache para prevenir cache do navegador
                return ResponseEntity
                    .ok()
                    .cacheControl(CacheControl.noCache().mustRevalidate())
                    .header("Pragma", "no-cache")
                    .header("Expires", "0")
                    .body(defaultConfig);
            }
        } catch (Exception e) {
            logger.error("Erro ao buscar configuração de otimização: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erro ao buscar configuração: " + e.getMessage()));
        }
    }

    /**
     * Deletes an optimization configuration for a given materialization and instance
     * @param materializationId The materialization ID
     * @param instanceId The instance ID
     * @return ResponseEntity with success or error message
     */
    @DeleteMapping("/optimization/{materializationId}/instance/{instanceId}")
    public ResponseEntity<?> deleteOptimizationConfig(@PathVariable Integer materializationId, @PathVariable Integer instanceId) {
        try {
            logger.info("Excluindo configuração de otimização para materialização {} na instância {}", materializationId, instanceId);
            
            // First check if the configuration exists
            boolean exists = optimizationRepository.existsById(
                new OptimizationInputsResults.OptimizationInputsResultsId(instanceId, materializationId));
            
            if (!exists) {
                // If it doesn't exist, return success without trying to delete
                logger.info("Configuração de otimização não encontrada para materialização {} na instância {}, nada a excluir", 
                        materializationId, instanceId);
                return ResponseEntity.ok().build();
            }
            
            // If it exists, proceed with deletion
            optimizationRepository.deleteById(new OptimizationInputsResults.OptimizationInputsResultsId(instanceId, materializationId));
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Erro ao excluir configuração de otimização: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erro ao excluir configuração de otimização: " + e.getMessage());
        }
    }

    /**
     * Endpoint composto que retorna todos os dados necessários para a página de planificação em uma única chamada
     */
    @GetMapping("/instances/{instanceId}/full-data")
    public ResponseEntity<PlanificationFullDataDTO> getFullPlanificationData(@PathVariable Integer instanceId) {
        try {
            PlanificationFullDataDTO fullData = planificationService.getFullPlanificationData(instanceId);
            
            if (fullData == null) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok(fullData);
        } catch (Exception e) {
            logger.error("Erro ao buscar dados completos de planificação: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Endpoint para obter dados consolidados de uma instância específica
     * Este endpoint combina informações da matriz tecnológica e do vetor de demanda
     */
    @GetMapping("/instances/{instanceId}/data")
    public ResponseEntity<?> getInstanceData(@PathVariable Integer instanceId) {
        try {
            // Verificar se a instância existe
            Optional<Instance> instanceOpt = instanceRepository.findById(instanceId);
            if (instanceOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            // Obter a instância
            Instance instance = instanceOpt.get();
            
            // Buscar materializações sociais da instância
            List<SocialMaterialization> materializations = materializationRepository.findByInstanceId(instanceId);
            if (materializations.isEmpty()) {
                // Buscar todas as materializações como fallback
                materializations = materializationRepository.findAll();
            }
            
            // Organizar por ID
            Map<Integer, SocialMaterialization> materializationsMap = materializations.stream()
                .collect(Collectors.toMap(SocialMaterialization::getId, mat -> mat));
                
            // Mapear índices
            Map<Integer, Integer> materializationToIndex = new HashMap<>();
            for (int i = 0; i < materializations.size(); i++) {
                materializationToIndex.put(materializations.get(i).getId(), i);
            }
            
            // Nomes e IDs das materializações na ordem
            String[] productNames = new String[materializations.size()];
            Integer[] productIds = new Integer[materializations.size()];
            
            for (int i = 0; i < materializations.size(); i++) {
                SocialMaterialization mat = materializations.get(i);
                int index = materializationToIndex.get(mat.getId());
                productNames[index] = mat.getName();
                productIds[index] = mat.getId();
            }
            
            // Buscar tensores tecnológicos
            List<TechnologicalTensor> tensors = tensorRepository.findByInstanceId(instanceId);
            
            // Criar matriz tecnológica
            int size = materializations.size();
            BigDecimal[][] technologicalMatrix = new BigDecimal[size][size];
            
            // Inicializar com zeros
            for (int i = 0; i < size; i++) {
                for (int j = 0; j < size; j++) {
                    technologicalMatrix[i][j] = BigDecimal.ZERO;
                }
            }
            
            // Preencher matriz com valores dos tensores
            for (TechnologicalTensor tensor : tensors) {
                Integer inputIndex = materializationToIndex.get(tensor.getInputSocialMaterialization().getId());
                Integer outputIndex = materializationToIndex.get(tensor.getOutputSocialMaterialization().getId());
                
                if (inputIndex != null && outputIndex != null) {
                    technologicalMatrix[inputIndex][outputIndex] = tensor.getTechnicalCoefficientElementValue();
                }
            }
            
            // Buscar vetores de demanda
            List<DemandVector> demandVectors = demandVectorRepository.findByInstanceId(instanceId);
            
            // Criar vetor de demanda
            BigDecimal[] demandVector = new BigDecimal[size];
            
            // Inicializar com zeros
            for (int i = 0; i < size; i++) {
                demandVector[i] = BigDecimal.ZERO;
            }
            
            // Preencher vetor com valores de demanda
            for (DemandVector demand : demandVectors) {
                Integer index = materializationToIndex.get(demand.getSocialMaterialization().getId());
                
                if (index != null) {
                    demandVector[index] = demand.getDemand();
                }
            }
            
            // Retornar resultado consolidado
            Map<String, Object> result = new HashMap<>();
            result.put("technologicalMatrix", technologicalMatrix);
            result.put("demandVector", demandVector);
            result.put("productNames", productNames);
            result.put("productIds", productIds);
            result.put("instanceType", instance.getType().toString());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Erro ao buscar dados da instância", e);
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Erro ao buscar dados da instância: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Obtém as instâncias filhas de uma instância específica
     * Esta API é uma versão mais flexível que aceita instâncias do tipo PLANNERCOUNCIL
     * @param instanceId ID da instância
     * @param type Tipo opcional da instância (PLANNERCOUNCIL, COUNCIL, etc.)
     * @return Lista de instâncias filhas
     */
    @GetMapping("/instance/{instanceId}/children")
    public ResponseEntity<List<Instance>> getInstanceChildren(
            @PathVariable Integer instanceId,
            @RequestParam(required = false) String type) {
        
        logger.info("Buscando instâncias filhas para instância ID: {}, tipo: {}", instanceId, type);
        
        try {
            Instance instance = instanceRepository.findById(instanceId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Instância não encontrada: " + instanceId));
            
            // Verificar se a instância é do tipo esperado, se o tipo foi especificado
            if (type != null && !type.isEmpty() && !instance.getType().equals(type)) {
                logger.warn("Instância {} não é do tipo esperado: {} (atual: {})", 
                        instanceId, type, instance.getType());
                
                // Retornamos uma lista vazia em vez de erro para ser mais robusto
                return ResponseEntity.ok(new ArrayList<>());
            }
            
            // Para PLANNERCOUNCIL, buscamos instâncias associadas de forma diferente
            // Também incluímos lógica para POPULARCOUNCIL para compatibilidade
            List<Instance> childInstances;
            
            if (InstanceType.PLANNERCOUNCIL.toString().equals(instance.getType()) || 
                InstanceType.POPULARCOUNCIL.toString().equals(instance.getType())) {
                
                // Buscar instâncias que têm esta instância como parent
                // Usar a instância obtida pelo findById em vez de passar o ID diretamente
                childInstances = instanceRepository.findByPopularCouncilAssociatedWithPopularCouncil(instance);
                
                // Também podemos buscar comitês vinculados ao conselho
                // Usar a instância obtida pelo findById em vez de passar o ID diretamente
                List<Instance> committees = instanceRepository.findByPopularCouncilAssociatedWithCommitteeOrWorker(instance);
                
                // Combinar as listas, evitando duplicatas
                Set<Instance> allChildrenSet = new HashSet<>(childInstances);
                allChildrenSet.addAll(committees);
                
                childInstances = new ArrayList<>(allChildrenSet);
                
                logger.info("Encontradas {} instâncias filhas para o PLANNERCOUNCIL/POPULARCOUNCIL {}", 
                        childInstances.size(), instanceId);
            } else {
                // Para outros tipos, retornamos lista vazia
                childInstances = new ArrayList<>();
                logger.info("Tipo de instância não suportado para buscar filhos: {}", instance.getType());
            }
            
            return ResponseEntity.ok(childInstances);
        } catch (ResponseStatusException e) {
            logger.error("Instância não encontrada: {}", instanceId);
            throw e;
        } catch (Exception e) {
            logger.error("Erro ao buscar instâncias filhas: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}