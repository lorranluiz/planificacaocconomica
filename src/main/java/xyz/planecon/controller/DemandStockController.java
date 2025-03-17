package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import xyz.planecon.model.entity.DemandStock;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.repository.DemandStockRepository;
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
@RequestMapping("/api/demand-stocks")
public class DemandStockController {

    @Autowired
    private DemandStockRepository demandStockRepository;
    
    @Autowired
    private InstanceRepository instanceRepository;
    
    @Autowired
    private SocialMaterializationRepository socialMaterializationRepository;

    @GetMapping
    public ResponseEntity<?> getAllDemandStocks() {
        try {
            List<DemandStock> demandStocks = demandStockRepository.findAll();
            
            // Converter para formato simplificado para evitar problemas de serialização
            List<Map<String, Object>> result = new ArrayList<>();
            for (DemandStock ds : demandStocks) {
                Map<String, Object> item = new HashMap<>();
                
                // Para evitar referência nula ao id no front-end
                item.put("materializationId", ds.getSocialMaterialization() != null ? 
                    ds.getSocialMaterialization().getId() : null);
                item.put("instanceId", ds.getInstance() != null ? ds.getInstance().getId() : null);
                
                // Adicionar informações da materialização social
                if (ds.getSocialMaterialization() != null) {
                    Map<String, Object> materialInfo = new HashMap<>();
                    materialInfo.put("id", ds.getSocialMaterialization().getId());
                    materialInfo.put("name", ds.getSocialMaterialization().getName());
                    materialInfo.put("type", ds.getSocialMaterialization().getType());
                    item.put("socialMaterialization", materialInfo);
                }
                
                // Adicionar informações da instância com nome correto
                if (ds.getInstance() != null) {
                    Map<String, Object> instanceInfo = new HashMap<>();
                    instanceInfo.put("id", ds.getInstance().getId());
                    
                    // Processar o tipo e definir o nome apropriado
                    String instanceName;
                    
                    if (ds.getInstance().getType() != null) {
                        String typeStr = ds.getInstance().getType().toString();
                        instanceInfo.put("type", typeStr);
                        
                        // Lógica de nome baseada no tipo
                        if ("COMMITTEE".equals(typeStr)) {
                            // Se for comitê, usa o nome do comitê
                            String committeeName = ds.getInstance().getCommitteeName();
                            instanceName = committeeName != null && !committeeName.isEmpty() ? 
                                committeeName : "Committee #" + ds.getInstance().getId();
                        } else if ("COUNCIL".equals(typeStr)) {
                            // Se for conselho, usa Council + ID
                            instanceName = "Council " + ds.getInstance().getId();
                        } else {
                            // Para outros tipos
                            instanceName = "Instância #" + ds.getInstance().getId();
                        }
                    } else {
                        // Se não tiver tipo
                        instanceInfo.put("type", "UNKNOWN");
                        instanceName = "Instância #" + ds.getInstance().getId();
                    }
                    
                    // Define explicitamente o nome da instância
                    instanceInfo.put("name", instanceName);
                    item.put("instance", instanceInfo);
                }
                
                item.put("demand", ds.getDemand());
                item.put("stock", ds.getStock());
                item.put("createdAt", ds.getCreatedAt() != null ? ds.getCreatedAt().toString() : null);
                
                result.add(item);
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Erro ao buscar demanda e estoque: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    @PostMapping
    public ResponseEntity<?> createDemandStock(@RequestBody Map<String, Object> payload) {
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
            
            BigDecimal stock = null;
            if (payload.get("stock") instanceof Number) {
                stock = new BigDecimal(payload.get("stock").toString());
            }
            
            // Validar campos obrigatórios
            if (instanceId == null || materializationId == null || demand == null || stock == null) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("message", "Todos os campos são obrigatórios: instanceId, materializationId, demand, stock");
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
            if (demand.compareTo(BigDecimal.ZERO) < 0 || stock.compareTo(BigDecimal.ZERO) < 0) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("message", "Valores inválidos: demanda e estoque não podem ser negativos");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // Verificar se já existe um registro com essa chave
            Optional<DemandStock> existingDemandStock = demandStockRepository.findById(
                new DemandStock.DemandStockId(materializationId, instanceId));
                
            DemandStock demandStock;
            if (existingDemandStock.isPresent()) {
                // Atualizar existente
                demandStock = existingDemandStock.get();
            } else {
                // Criar novo
                demandStock = new DemandStock();
                demandStock.setSocialMaterialization(materializationOpt.get());
                demandStock.setInstance(instanceOpt.get());
                demandStock.setCreatedAt(LocalDateTime.now());
            }
            
            demandStock.setDemand(demand);
            demandStock.setStock(stock);
            
            DemandStock saved = demandStockRepository.save(demandStock);
            
            // Preparar resposta
            Map<String, Object> result = new HashMap<>();
            result.put("materializationId", saved.getSocialMaterialization().getId());
            result.put("instanceId", saved.getInstance().getId());
            result.put("demand", saved.getDemand());
            result.put("stock", saved.getStock());
            result.put("createdAt", saved.getCreatedAt() != null ? saved.getCreatedAt().toString() : null);
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Erro ao criar registro de demanda e estoque: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}