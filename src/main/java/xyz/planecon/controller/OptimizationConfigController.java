package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.OptimizationInputsResults;
import xyz.planecon.model.entity.OptimizationInputsResults.OptimizationInputsResultsId;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.repository.InstanceRepository;
import xyz.planecon.repository.OptimizationInputsResultsRepository;
import xyz.planecon.repository.SocialMaterializationRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/planification/optimization-config")
public class OptimizationConfigController {

    @Autowired
    private OptimizationInputsResultsRepository optimizationRepository;
    
    @Autowired
    private InstanceRepository instanceRepository;
    
    @Autowired
    private SocialMaterializationRepository materializationRepository;

    /**
     * Endpoint para salvar configuração de otimização
     */
    @PostMapping
    public ResponseEntity<?> saveOptimizationConfig(@RequestBody Map<String, Object> payload) {
        try {
            // Extrair dados do payload
            Integer instanceId = payload.get("instanceId") instanceof Number ? 
                ((Number) payload.get("instanceId")).intValue() : null;
            
            Integer materializationId = payload.get("materializationId") instanceof Number ? 
                ((Number) payload.get("materializationId")).intValue() : null;
            
            Integer workerLimit = payload.get("workerLimit") instanceof Number ? 
                ((Number) payload.get("workerLimit")).intValue() : null;
            
            Double workerHours = payload.get("workerHours") instanceof Number ? 
                ((Number) payload.get("workerHours")).doubleValue() : null;
            
            Double productionTime = payload.get("productionTime") instanceof Number ? 
                ((Number) payload.get("productionTime")).doubleValue() : null;
            
            Integer weeklyScale = payload.get("weeklyScale") instanceof Number ? 
                ((Number) payload.get("weeklyScale")).intValue() : null;
            
            Boolean nightShift = (Boolean) payload.get("nightShift");
            
            // Validar campos obrigatórios
            if (instanceId == null || materializationId == null || workerLimit == null || 
                workerHours == null || productionTime == null || weeklyScale == null || nightShift == null) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("message", "Todos os campos são obrigatórios");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // Buscar instância e materialização
            Optional<Instance> instanceOpt = instanceRepository.findById(instanceId);
            Optional<SocialMaterialization> materializationOpt = materializationRepository.findById(materializationId);
            
            if (!instanceOpt.isPresent() || !materializationOpt.isPresent()) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("message", "Instância ou materialização social não encontrada");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // Verificar se já existe configuração para atualizar
            OptimizationInputsResultsId id = new OptimizationInputsResultsId(instanceId, materializationId);
            Optional<OptimizationInputsResults> existingConfig = optimizationRepository.findById(id);
            
            OptimizationInputsResults config;
            if (existingConfig.isPresent()) {
                config = existingConfig.get();
            } else {
                config = new OptimizationInputsResults();
                config.setId(id);
                config.setInstance(instanceOpt.get());
                config.setSocialMaterialization(materializationOpt.get());
                config.setCreatedAt(LocalDateTime.now());
                
                // Inicializar campos não editáveis com valores padrão
                config.setProductionGoal(BigDecimal.ZERO);
                config.setTotalHours(BigDecimal.ZERO);
                config.setTotalShifts(1);
                config.setMinimumProductionTime(BigDecimal.ONE);
                config.setTotalEmploymentPeriodSeconds(0L);
                config.setPlannedFinalDemand(BigDecimal.ZERO);
                config.setWorkersNeeded(0);
                config.setFactoriesNeeded(0);
                config.setPlannedWeeklyScale(weeklyScale);
            }
            
            // Atualizar com valores do formulário
            config.setWorkerLimit(workerLimit);
            config.setWorkerHours(new BigDecimal(workerHours));
            config.setProductionTime(new BigDecimal(productionTime));
            config.setWeeklyScale(weeklyScale);
            config.setNightShift(nightShift);
            
            // Salvar configuração
            OptimizationInputsResults saved = optimizationRepository.save(config);
            
            // Preparar resposta
            Map<String, Object> response = new HashMap<>();
            response.put("id", Map.of("instanceId", saved.getId().getInstanceId(), 
                                      "materializationId", saved.getId().getSocialMaterializationId()));
            response.put("workerLimit", saved.getWorkerLimit());
            response.put("workerHours", saved.getWorkerHours());
            response.put("productionTime", saved.getProductionTime());
            response.put("weeklyScale", saved.getWeeklyScale());
            response.put("nightShift", saved.getNightShift());
            response.put("createdAt", saved.getCreatedAt());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Erro ao salvar configuração de otimização: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    /**
     * Endpoint para buscar configuração de otimização
     */
    @GetMapping("/{instanceId}/{materializationId}")
    public ResponseEntity<?> getOptimizationConfig(
            @PathVariable Integer instanceId,
            @PathVariable Integer materializationId) {
        try {
            OptimizationInputsResultsId id = new OptimizationInputsResultsId(instanceId, materializationId);
            Optional<OptimizationInputsResults> configOpt = optimizationRepository.findById(id);
            
            if (!configOpt.isPresent()) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Configuração não encontrada");
                return ResponseEntity.notFound().build();
            }
            
            OptimizationInputsResults config = configOpt.get();
            
            // Preparar resposta
            Map<String, Object> response = new HashMap<>();
            response.put("instanceId", config.getId().getInstanceId());
            response.put("materializationId", config.getId().getSocialMaterializationId());
            response.put("workerLimit", config.getWorkerLimit());
            response.put("workerHours", config.getWorkerHours());
            response.put("productionTime", config.getProductionTime());
            response.put("weeklyScale", config.getWeeklyScale());
            response.put("nightShift", config.getNightShift());
            response.put("createdAt", config.getCreatedAt());
            
            if (config.getWorkersNeeded() != null && config.getWorkersNeeded() > 0) {
                // Só inclui resultados se já tiver sido otimizado
                response.put("workersNeeded", config.getWorkersNeeded());
                response.put("factoriesNeeded", config.getFactoriesNeeded());
                response.put("totalHours", config.getTotalHours());
                response.put("minimumProductionTime", config.getMinimumProductionTime());
                response.put("productionGoal", config.getProductionGoal());
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Erro ao buscar configuração de otimização: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    /**
     * Endpoint para buscar todas as configurações de otimização de uma instância
     */
    @GetMapping("/by-instance/{instanceId}")
    public ResponseEntity<?> getOptimizationConfigsByInstance(@PathVariable Integer instanceId) {
        try {
            List<OptimizationInputsResults> configs = optimizationRepository.findById_InstanceId(instanceId);
            
            List<Map<String, Object>> responseList = new ArrayList<>();
            for (OptimizationInputsResults config : configs) {
                Map<String, Object> item = new HashMap<>();
                item.put("instanceId", config.getId().getInstanceId());
                item.put("materializationId", config.getId().getSocialMaterializationId());
                item.put("workerLimit", config.getWorkerLimit());
                item.put("workerHours", config.getWorkerHours());
                item.put("productionTime", config.getProductionTime());
                item.put("weeklyScale", config.getWeeklyScale());
                item.put("nightShift", config.getNightShift());
                
                // Incluir informações da materialização
                if (config.getSocialMaterialization() != null) {
                    Map<String, Object> materializationInfo = new HashMap<>();
                    materializationInfo.put("id", config.getSocialMaterialization().getId());
                    materializationInfo.put("name", config.getSocialMaterialization().getName());
                    item.put("socialMaterialization", materializationInfo);
                }
                
                responseList.add(item);
            }
            
            return ResponseEntity.ok(responseList);
            
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Erro ao buscar configurações de otimização: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}