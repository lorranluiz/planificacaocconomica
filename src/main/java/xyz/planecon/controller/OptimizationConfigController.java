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
import java.util.*;
import java.util.stream.Collectors;

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
            // Logging detalhado para depuração
            System.out.println("Payload recebido: " + payload);
            
            // Extrair e validar dados com validação mais robusta
            Integer instanceId = null;
            Integer materializationId = null;
            Integer workerLimit = null;
            BigDecimal workerHours = null;
            BigDecimal productionTime = null;
            Integer weeklyScale = null;
            Boolean nightShift = false;
            
            try {
                if (payload.containsKey("instanceId")) {
                    instanceId = Integer.valueOf(payload.get("instanceId").toString());
                }
                
                if (payload.containsKey("materializationId")) {
                    materializationId = Integer.valueOf(payload.get("materializationId").toString());
                }
                
                if (payload.containsKey("workerLimit")) {
                    workerLimit = Integer.valueOf(payload.get("workerLimit").toString());
                }
                
                if (payload.containsKey("workerHours")) {
                    workerHours = new BigDecimal(payload.get("workerHours").toString());
                }
                
                if (payload.containsKey("productionTime")) {
                    productionTime = new BigDecimal(payload.get("productionTime").toString());
                }
                
                if (payload.containsKey("weeklyScale")) {
                    weeklyScale = Integer.valueOf(payload.get("weeklyScale").toString());
                }
                
                if (payload.containsKey("nightShift")) {
                    nightShift = Boolean.valueOf(payload.get("nightShift").toString());
                }
            } catch (NumberFormatException e) {
                System.err.println("Erro na conversão de tipos: " + e.getMessage());
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("message", "Formato inválido para um ou mais valores numéricos: " + e.getMessage());
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            System.out.println("Dados extraídos: instanceId=" + instanceId + 
                              ", materializationId=" + materializationId +
                              ", workerLimit=" + workerLimit +
                              ", workerHours=" + workerHours +
                              ", productionTime=" + productionTime +
                              ", weeklyScale=" + weeklyScale +
                              ", nightShift=" + nightShift);
            
            // Validar campos obrigatórios
            if (instanceId == null || materializationId == null) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("message", "ID da instância e ID da materialização são obrigatórios");
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
                config.setPlannedWeeklyScale(weeklyScale != null ? weeklyScale : 5);
            }
            
            // Usar valores padrão para campos que podem ser nulos
            config.setWorkerLimit(workerLimit != null ? workerLimit : 100);
            config.setWorkerHours(workerHours != null ? workerHours : new BigDecimal("8.0"));
            config.setProductionTime(productionTime != null ? productionTime : new BigDecimal("1.0"));
            config.setWeeklyScale(weeklyScale != null ? weeklyScale : 5);
            config.setNightShift(nightShift != null ? nightShift : false);
            
            // Salvar configuração
            OptimizationInputsResults saved = optimizationRepository.save(config);
            
            // Preparar resposta
            Map<String, Object> response = new HashMap<>();
            response.put("instanceId", saved.getId().getInstanceId());
            response.put("materializationId", saved.getId().getSocialMaterializationId());
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
            
            List<Map<String, Object>> responseList = configs.stream().map(config -> {
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
                
                return item;
            }).collect(Collectors.toList());
            
            return ResponseEntity.ok(responseList);
            
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Erro ao buscar configurações de otimização: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    /**
     * Endpoint para salvar resultados de otimização
     */
    @PostMapping("/results")
    public ResponseEntity<?> saveOptimizationResults(@RequestBody Map<String, Object> payload) {
        try {
            // Logging detalhado para depuração
            System.out.println("Payload de resultados recebido: " + payload);
            
            // Extrair e validar ids
            Integer instanceId = getIntegerValue(payload, "instanceId");
            Integer materializationId = getIntegerValue(payload, "materializationId");
            
            if (instanceId == null || materializationId == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "message", "instanceId e materializationId são obrigatórios"
                ));
            }
            
            // Buscar instância e materialização
            Instance instance = instanceRepository.findById(instanceId)
                .orElseThrow(() -> new IllegalArgumentException("Instância não encontrada: " + instanceId));
            
            SocialMaterialization materialization = materializationRepository.findById(materializationId)
                .orElseThrow(() -> new IllegalArgumentException("Materialização não encontrada: " + materializationId));
            
            // Criar ou buscar o objeto de otimização existente
            OptimizationInputsResults optimization = null;
            
            OptimizationInputsResultsId id = new OptimizationInputsResultsId(instanceId, materializationId);
            Optional<OptimizationInputsResults> existingOpt = optimizationRepository.findById(id);
            
            if (existingOpt.isPresent()) {
                optimization = existingOpt.get();
            } else {
                optimization = new OptimizationInputsResults();
                optimization.setInstance(instance);
                optimization.setSocialMaterialization(materialization);
                optimization.setCreatedAt(LocalDateTime.now());
            }
            
            // Campos obrigatórios
            optimization.setWorkerLimit(getIntegerValue(payload, "workerLimit", 100));
            optimization.setWorkerHours(getBigDecimalValue(payload, "workerHours", new BigDecimal("8.0")));
            optimization.setProductionTime(getBigDecimalValue(payload, "productionTime", BigDecimal.ONE));
            optimization.setWeeklyScale(getIntegerValue(payload, "weeklyScale", 5));
            optimization.setNightShift(getBooleanValue(payload, "nightShift", false));
            optimization.setPlannedWeeklyScale(getIntegerValue(payload, "weeklyScale", 5));
            
            // Resultados calculados
            BigDecimal productionGoal = getBigDecimalValue(payload, "productionGoal", BigDecimal.ZERO);
            optimization.setProductionGoal(productionGoal);
            optimization.setPlannedFinalDemand(productionGoal);
            
            optimization.setWorkersNeeded(getIntegerValue(payload, "workersNeeded", 0));
            optimization.setFactoriesNeeded(getIntegerValue(payload, "factoriesNeeded", 0));
            optimization.setMinimumProductionTime(getBigDecimalValue(payload, "minimumProductionTime", BigDecimal.ZERO));
            
            BigDecimal totalHours = getBigDecimalValue(payload, "totalHours", BigDecimal.ZERO);
            optimization.setTotalHours(totalHours);
            optimization.setTotalShifts(1);
            
            // Campos adicionais
            optimization.setWorkersToContract(getIntegerValue(payload, "workersToContract", 0));
            optimization.setCurrentFactories(getIntegerValue(payload, "currentFactories", 0));
            optimization.setNeededFactoriesToBuild(getIntegerValue(payload, "neededFactoriesToBuild", 0));
            optimization.setFactoryDailyOperatingHours(getBigDecimalValue(payload, "factoryDailyOperatingHours", BigDecimal.ZERO));
            
            // Definir período de emprego total (pode ser calculado com base em outros campos)
            optimization.setTotalEmploymentPeriodSeconds(86400L); // 1 dia em segundos como valor padrão
            
            // Salvar a entidade
            OptimizationInputsResults savedOptimization = optimizationRepository.save(optimization);
            
            // Retornar resposta de sucesso
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Resultados de otimização salvos com sucesso",
                "optimizationId", savedOptimization.getId()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Erro ao salvar resultados de otimização: " + e.getMessage()
            ));
        }
    }
    
    // Métodos auxiliares para extrair valores do payload
    private Integer getIntegerValue(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (value == null) return null;
        
        if (value instanceof Integer) {
            return (Integer) value;
        } else if (value instanceof Number) {
            return ((Number) value).intValue();
        } else if (value instanceof String) {
            try {
                return Integer.parseInt((String) value);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
    
    private Integer getIntegerValue(Map<String, Object> payload, String key, Integer defaultValue) {
        Integer value = getIntegerValue(payload, key);
        return value != null ? value : defaultValue;
    }
    
    private BigDecimal getBigDecimalValue(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (value == null) return null;
        
        if (value instanceof BigDecimal) {
            return (BigDecimal) value;
        } else if (value instanceof Number) {
            return new BigDecimal(value.toString());
        } else if (value instanceof String) {
            try {
                return new BigDecimal((String) value);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
    
    private BigDecimal getBigDecimalValue(Map<String, Object> payload, String key, BigDecimal defaultValue) {
        BigDecimal value = getBigDecimalValue(payload, key);
        return value != null ? value : defaultValue;
    }
    
    private Boolean getBooleanValue(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (value == null) return null;
        
        if (value instanceof Boolean) {
            return (Boolean) value;
        } else if (value instanceof String) {
            return Boolean.parseBoolean((String) value);
        }
        return null;
    }
    
    private Boolean getBooleanValue(Map<String, Object> payload, String key, Boolean defaultValue) {
        Boolean value = getBooleanValue(payload, key);
        return value != null ? value : defaultValue;
    }
}