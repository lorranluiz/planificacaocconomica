package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.model.entity.DemandStock;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.repository.DemandStockRepository;
import xyz.planecon.repository.InstanceRepository;
import xyz.planecon.repository.SocialMaterializationRepository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/demand-stock")
public class DemandStockController {

    private final DemandStockRepository demandStockRepository;
    private final InstanceRepository instanceRepository;
    private final SocialMaterializationRepository socMatRepository;

    @Autowired
    public DemandStockController(DemandStockRepository demandStockRepository,
                                InstanceRepository instanceRepository,
                                SocialMaterializationRepository socMatRepository) {
        this.demandStockRepository = demandStockRepository;
        this.instanceRepository = instanceRepository;
        this.socMatRepository = socMatRepository;
    }

    @GetMapping("/instance/{instanceId}")
    public ResponseEntity<?> getByInstanceId(@PathVariable Integer instanceId) {
        Optional<Instance> instanceOpt = instanceRepository.findById(instanceId);
        if (instanceOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Instance instance = instanceOpt.get();
        List<DemandStock> stockList = demandStockRepository.findByInstance(instance);

        // Transformar em formato amigável para o frontend
        List<Map<String, Object>> result = new ArrayList<>();
        for (DemandStock stock : stockList) {
            Map<String, Object> item = new HashMap<>();
            item.put("materializationId", stock.getSocialMaterialization().getId());
            item.put("materializationName", stock.getSocialMaterialization().getName());
            item.put("currentStock", stock.getStock()); // Corrigido: getCurrentStock() → getStock()
            item.put("demand", stock.getDemand());
            result.add(item);
        }

        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<?> createOrUpdate(@RequestBody Map<String, Object> request) {
        try {
            // Extrair dados da requisição
            Integer instanceId = (Integer) request.get("instanceId");
            Integer materializationId = (Integer) request.get("materializationId");
            
            // Verificar se os IDs são válidos
            if (instanceId == null || materializationId == null) {
                return ResponseEntity.badRequest()
                    .body("IDs de instância e materialização são obrigatórios");
            }
            
            // Buscar entidades
            Optional<Instance> instanceOpt = instanceRepository.findById(instanceId);
            Optional<SocialMaterialization> matOpt = socMatRepository.findById(materializationId);
            
            if (instanceOpt.isEmpty() || matOpt.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body("Instância ou materialização não encontrada");
            }
            
            // Converter valores numéricos
            BigDecimal currentStock = convertToBigDecimal(request.get("currentStock"));
            BigDecimal demand = convertToBigDecimal(request.get("demand"));
            
            // Criar ou atualizar registro
            DemandStock demandStock;
            DemandStock.DemandStockId id = new DemandStock.DemandStockId(instanceId, materializationId);
            
            // Verificar se já existe
            Optional<DemandStock> existingOpt = demandStockRepository.findById(id);
            if (existingOpt.isPresent()) {
                demandStock = existingOpt.get();
            } else {
                // Criar um novo objeto DemandStock usando o construtor sem argumentos
                demandStock = new DemandStock();
                // Agora configurar manualmente todas as propriedades necessárias
                demandStock.setInstance(instanceOpt.get());
                demandStock.setSocialMaterialization(matOpt.get());
            }
            
            // Atualizar valores usando os setters corretos
            demandStock.setStock(currentStock);
            demandStock.setDemand(demand);
            
            // Salvar
            DemandStock saved = demandStockRepository.save(demandStock);
            
            // Retornar resultado com os getters corretos
            Map<String, Object> result = new HashMap<>();
            result.put("instanceId", saved.getInstance().getId());
            result.put("materializationId", saved.getSocialMaterialization().getId());
            result.put("materializationName", saved.getSocialMaterialization().getName());
            result.put("currentStock", saved.getStock()); // Corrigido: getCurrentStock() → getStock()
            result.put("demand", saved.getDemand());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Erro ao salvar dados: " + e.getMessage());
        }
    }

    // Método auxiliar para converter para BigDecimal
    private BigDecimal convertToBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        
        if (value instanceof BigDecimal) {
            return (BigDecimal) value;
        }
        
        if (value instanceof Number) {
            return new BigDecimal(((Number) value).toString());
        }
        
        if (value instanceof String) {
            try {
                return new BigDecimal((String) value);
            } catch (NumberFormatException e) {
                return BigDecimal.ZERO;
            }
        }
        
        return BigDecimal.ZERO;
    }
}