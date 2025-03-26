package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import xyz.planecon.model.entity.DemandVector;
import xyz.planecon.model.entity.DemandVector.DemandVectorId;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.repository.DemandVectorRepository;
import xyz.planecon.repository.InstanceRepository;
import xyz.planecon.repository.SocialMaterializationRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/demand-vectors")
public class DemandVectorController {

    @Autowired
    private DemandVectorRepository demandVectorRepository;
    
    @Autowired
    private InstanceRepository instanceRepository;
    
    @Autowired
    private SocialMaterializationRepository socialMaterializationRepository;

    @GetMapping
    public ResponseEntity<?> getAllDemandVectors() {
        try {
            List<DemandVector> demandVectors = demandVectorRepository.findAll();
            
            // Converter para formato simplificado para evitar problemas de serialização
            List<Map<String, Object>> result = new ArrayList<>();
            for (DemandVector dv : demandVectors) {
                Map<String, Object> item = new HashMap<>();
                
                // Para evitar referência nula ao id no front-end
                item.put("materializationId", dv.getSocialMaterialization() != null ? 
                    dv.getSocialMaterialization().getId() : null);
                item.put("instanceId", dv.getInstance() != null ? dv.getInstance().getId() : null);
                
                // Adicionar informações da materialização social
                if (dv.getSocialMaterialization() != null) {
                    Map<String, Object> materialInfo = new HashMap<>();
                    materialInfo.put("id", dv.getSocialMaterialization().getId());
                    materialInfo.put("name", dv.getSocialMaterialization().getName());
                    materialInfo.put("type", dv.getSocialMaterialization().getType());
                    item.put("socialMaterialization", materialInfo);
                }
                
                // Adicionar informações da instância com nome correto
                if (dv.getInstance() != null) {
                    Map<String, Object> instanceInfo = new HashMap<>();
                    instanceInfo.put("id", dv.getInstance().getId());
                    
                    // Processar o tipo e definir o nome apropriado
                    String instanceName;
                    
                    if (dv.getInstance().getType() != null) {
                        String typeStr = dv.getInstance().getType().toString();
                        instanceInfo.put("type", typeStr);
                        
                        // Lógica de nome baseada no tipo
                        if ("COMMITTEE".equals(typeStr)) {
                            // Se for comitê, usa o nome do comitê
                            String committeeName = dv.getInstance().getCommitteeName();
                            instanceName = committeeName != null && !committeeName.isEmpty() ? 
                                committeeName : "Committee #" + dv.getInstance().getId();
                        } else if ("COUNCIL".equals(typeStr)) {
                            // Se for conselho, usa Council + ID
                            instanceName = "Council " + dv.getInstance().getId();
                        } else {
                            // Para outros tipos
                            instanceName = "Instância #" + dv.getInstance().getId();
                        }
                    } else {
                        // Se não tiver tipo
                        instanceInfo.put("type", "UNKNOWN");
                        instanceName = "Instância #" + dv.getInstance().getId();
                    }
                    
                    // Define explicitamente o nome da instância
                    instanceInfo.put("name", instanceName);
                    item.put("instance", instanceInfo);
                }
                
                item.put("demand", dv.getDemand()); // Alterado: getQuantity() → getDemand()
                item.put("createdAt", dv.getCreatedAt() != null ? dv.getCreatedAt().toString() : null);
                
                result.add(item);
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Erro ao buscar vetores de demanda: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    @PostMapping
    public ResponseEntity<?> createDemandVector(@RequestBody Map<String, Object> payload) {
        try {
            // Extrair valores do payload
            Integer instanceId = payload.get("instanceId") instanceof Number ?
                ((Number) payload.get("instanceId")).intValue() : null;
            
            Integer materializationId = payload.get("materializationId") instanceof Number ?
                ((Number) payload.get("materializationId")).intValue() : null;
            
            BigDecimal demand = null;
            if (payload.get("demand") instanceof Number) {
                demand = new BigDecimal(payload.get("demand").toString());
            }
            
            // Validar campos obrigatórios
            if (instanceId == null || materializationId == null || demand == null) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("message", "Todos os campos são obrigatórios: instanceId, materializationId, demand");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // Verificar se a instância existe
            Optional<Instance> instanceOpt = instanceRepository.findById(instanceId);
            if (!instanceOpt.isPresent()) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("message", "Instância não encontrada com ID: " + instanceId);
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // Verificar se a materialização social existe
            Optional<SocialMaterialization> materializationOpt = socialMaterializationRepository.findById(materializationId);
            if (!materializationOpt.isPresent()) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("message", "Materialização social não encontrada com ID: " + materializationId);
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // Verificar valores numéricos (não podem ser negativos)
            if (demand.compareTo(BigDecimal.ZERO) < 0) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("message", "Valores inválidos: demanda não pode ser negativa");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // Criar ou atualizar a entidade
            DemandVectorId id = new DemandVectorId(materializationId, instanceId);
            Optional<DemandVector> existingVector = demandVectorRepository.findById(id);
            
            DemandVector demandVector;
            if (existingVector.isPresent()) {
                // Atualizar existente
                demandVector = existingVector.get();
                demandVector.setDemand(demand); // Alterado: setQuantity() → setDemand()
            } else {
                // Criar novo
                demandVector = new DemandVector();
                demandVector.setSocialMaterialization(materializationOpt.get());
                demandVector.setInstance(instanceOpt.get());
                demandVector.setDemand(demand); // Alterado: setQuantity() → setDemand()
                demandVector.setCreatedAt(LocalDateTime.now());
            }
            
            DemandVector saved = demandVectorRepository.save(demandVector);
            
            // Preparar resposta
            Map<String, Object> result = new HashMap<>();
            result.put("materializationId", saved.getSocialMaterialization().getId());
            result.put("instanceId", saved.getInstance().getId());
            result.put("demand", saved.getDemand()); // Alterado: getQuantity() → getDemand()
            result.put("createdAt", saved.getCreatedAt() != null ? saved.getCreatedAt().toString() : null);
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Erro ao criar vetor de demanda: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}