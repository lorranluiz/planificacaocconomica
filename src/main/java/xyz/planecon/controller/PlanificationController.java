package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.dto.PlanificationRequest;
import xyz.planecon.dto.PlanificationResponse;
import xyz.planecon.model.entity.DemandVector;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.entity.TechnologicalTensor;
import xyz.planecon.repository.DemandVectorRepository;
import xyz.planecon.repository.InstanceRepository;
import xyz.planecon.repository.SocialMaterializationRepository;
import xyz.planecon.repository.TechnologicalTensorRepository;
import xyz.planecon.service.PlanificationService;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    public ResponseEntity<List<Instance>> getAllInstances() {
        List<Instance> instances = instanceRepository.findAll();
        return ResponseEntity.ok(instances);
    }

    /**
     * Endpoint para obter materializações sociais de uma instância
     */
    @GetMapping("/instances/{instanceId}/materializations")
    public ResponseEntity<List<SocialMaterialization>> getMaterializations(@PathVariable Integer instanceId) {
        List<SocialMaterialization> materializations = materializationRepository.findByInstanceId(instanceId);
        return ResponseEntity.ok(materializations);
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
        Double[][] matrix = new Double[size][size];
        
        // Inicializar com zeros
        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                matrix[i][j] = 0.0;
            }
        }
        
        // Mapear índices de materializações
        Map<Integer, Integer> materializationToIndex = new HashMap<>();
        for (int i = 0; i < materializations.size(); i++) {
            materializationToIndex.put(materializations.get(i).getId(), i);
        }
        
        // Preencher matriz com valores dos tensores
        for (TechnologicalTensor tensor : tensors) {
            Integer inputIndex = materializationToIndex.get(tensor.getInputMaterializationId());
            Integer outputIndex = materializationToIndex.get(tensor.getOutputMaterializationId());
            
            if (inputIndex != null && outputIndex != null) {
                matrix[inputIndex][outputIndex] = tensor.getQuantity();
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
        Double[] vector = new Double[size];
        
        // Inicializar com zeros
        for (int i = 0; i < size; i++) {
            vector[i] = 0.0;
        }
        
        // Preencher vetor com valores de demanda
        for (DemandVector demand : demandVectors) {
            Integer index = materializationToIndex.get(demand.getMaterializationId());
            
            if (index != null) {
                vector[index] = demand.getQuantity();
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
    public ResponseEntity<TechnologicalTensor> saveTensor(@RequestBody TechnologicalTensor tensor) {
        TechnologicalTensor saved = tensorRepository.save(tensor);
        return ResponseEntity.ok(saved);
    }
    
    /**
     * Endpoint para salvar um valor no vetor de demanda
     */
    @PostMapping("/demand-vector")
    public ResponseEntity<DemandVector> saveDemandVector(@RequestBody DemandVector demandVector) {
        DemandVector saved = demandVectorRepository.save(demandVector);
        return ResponseEntity.ok(saved);
    }
}