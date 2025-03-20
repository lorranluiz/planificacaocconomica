package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import xyz.planecon.dto.InstanceDto;
import xyz.planecon.dto.PlanificationRequest;
import xyz.planecon.dto.PlanificationResponse;
import xyz.planecon.dto.SocialMaterializationDto;
import xyz.planecon.dto.TensorCreationDto;
import xyz.planecon.model.entity.DemandVector;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.entity.TechnologicalTensor;
import xyz.planecon.model.entity.TechnologicalTensor.TechnologicalTensorId;
import xyz.planecon.repository.DemandVectorRepository;
import xyz.planecon.repository.InstanceRepository;
import xyz.planecon.repository.SocialMaterializationRepository;
import xyz.planecon.repository.TechnologicalTensorRepository;
import xyz.planecon.service.PlanificationService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/planification")
public class PlanificationController {

    private final PlanificationService planificationService;
    private final InstanceRepository instanceRepository;
    private final SocialMaterializationRepository materializationRepository;
    private final TechnologicalTensorRepository tensorRepository;
    private final DemandVectorRepository demandVectorRepository;

    @Autowired
    public PlanificationController(
            PlanificationService planificationService,
            InstanceRepository instanceRepository,
            SocialMaterializationRepository materializationRepository,
            TechnologicalTensorRepository tensorRepository,
            DemandVectorRepository demandVectorRepository) {
        this.planificationService = planificationService;
        this.instanceRepository = instanceRepository;
        this.materializationRepository = materializationRepository;
        this.tensorRepository = tensorRepository;
        this.demandVectorRepository = demandVectorRepository;
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
                        case COUNCIL:
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
                            case COUNCIL:
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
    public ResponseEntity<TechnologicalTensor> saveTensor(@RequestBody TensorCreationDto tensorDto) {
        try {
            // Buscar entidades relacionadas
            SocialMaterialization inputMat = materializationRepository.findById(tensorDto.getInputMaterializationId())
                    .orElseThrow(() -> new RuntimeException("Materialização de entrada não encontrada"));
            
            SocialMaterialization outputMat = materializationRepository.findById(tensorDto.getOutputMaterializationId())
                    .orElseThrow(() -> new RuntimeException("Materialização de saída não encontrada"));
            
            Instance instance = instanceRepository.findById(tensorDto.getInstanceId())
                    .orElseThrow(() -> new RuntimeException("Instância não encontrada"));
            
            // Verificar se já existe um tensor com esses IDs
            TechnologicalTensorId id = new TechnologicalTensorId(
                tensorDto.getInputMaterializationId(), 
                tensorDto.getOutputMaterializationId()
            );
            
            TechnologicalTensor tensor;
            Optional<TechnologicalTensor> existingTensor = tensorRepository.findById(id);
            
            if (existingTensor.isPresent()) {
                // Atualizar tensor existente
                tensor = existingTensor.get();
                tensor.setTechnicalCoefficientElementValue(new BigDecimal(tensorDto.getQuantity().toString()));
                tensor.setInstance(instance);
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
            return ResponseEntity.ok(savedTensor);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Endpoint para salvar um valor no vetor de demanda
     */
    @PostMapping("/demand-vector")
    public ResponseEntity<DemandVector> saveDemandVector(@RequestBody Map<String, Object> payload) {
        try {
            Integer instanceId = ((Number) payload.get("instanceId")).intValue();
            Integer materializationId = ((Number) payload.get("materializationId")).intValue();
            BigDecimal quantity = new BigDecimal(payload.get("quantity").toString());
            
            // Buscar entidades relacionadas
            SocialMaterialization materialization = materializationRepository.findById(materializationId)
                    .orElseThrow(() -> new RuntimeException("Materialização não encontrada"));
                    
            Instance instance = instanceRepository.findById(instanceId)
                    .orElseThrow(() -> new RuntimeException("Instância não encontrada"));
            
            // Verificar se já existe um vetor com esses IDs
            DemandVector.DemandVectorId id = new DemandVector.DemandVectorId(materializationId, instanceId);
            DemandVector demandVector;
            
            Optional<DemandVector> existingVector = demandVectorRepository.findById(id);
            if (existingVector.isPresent()) {
                // Atualizar vetor existente
                demandVector = existingVector.get();
                demandVector.setDemand(quantity);
            } else {
                // Criar novo vetor
                demandVector = new DemandVector();
                demandVector.setSocialMaterialization(materialization);
                demandVector.setInstance(instance);
                demandVector.setDemand(quantity);
                demandVector.setCreatedAt(LocalDateTime.now());
            }
            
            DemandVector savedVector = demandVectorRepository.save(demandVector);
            return ResponseEntity.ok(savedVector);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}