package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.dto.SocialMaterializationDto;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.service.SocialMaterializationService;
import xyz.planecon.model.enums.SocialMaterializationType;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/planification")
public class SocialMaterializationController {

    private final SocialMaterializationService materializationService;

    @Autowired
    public SocialMaterializationController(SocialMaterializationService materializationService) {
        this.materializationService = materializationService;
    }

    /**
     * Endpoint para listar todas as materializações sociais disponíveis
     */
    @GetMapping("/available-materializations")
    public ResponseEntity<?> getAllMaterializations() {
        try {
            List<SocialMaterialization> materializations = materializationService.findAll();
            
            // Converter para DTOs para evitar problemas de serialização
            List<Map<String, Object>> result = materializations.stream()
                .map(this::convertToSimpleMap)
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Erro ao listar materializações sociais: " + e.getMessage());
        }
    }
    
    /**
     * Endpoint para criar uma nova materialização social
     */
    @PostMapping("/social-materializations")
    public ResponseEntity<?> createMaterialization(@RequestBody Map<String, Object> payload) {
        try {
            // Extrair dados da requisição
            String name = (String) payload.get("name");
            String typeStr = (String) payload.get("type");
            String description = (String) payload.get("description");
            
            if (name == null || typeStr == null) {
                return ResponseEntity.badRequest()
                    .body("Nome e tipo são campos obrigatórios");
            }
            
            // Validar o tipo
            SocialMaterializationType type;
            try {
                type = SocialMaterializationType.valueOf(typeStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                    .body("Tipo de materialização inválido: " + typeStr);
            }
            
            // Criar nova materialização social
            SocialMaterialization newMaterialization = new SocialMaterialization();
            newMaterialization.setName(name);
            newMaterialization.setType(type);
            
            // Remover a chamada ao método setDescription que não existe
            // O campo description é armazenado apenas no DTO ou no frontend
            
            // Salvar a materialização
            SocialMaterialization saved = materializationService.save(newMaterialization);
            
            // Para manter a consistência com o frontend, adicionamos o description
            // ao mapa de retorno, mesmo que não esteja armazenado na entidade
            Map<String, Object> result = convertToSimpleMap(saved);
            if (description != null) {
                result.put("description", description);
            }
            
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Erro ao criar materialização social: " + e.getMessage());
        }
    }
    
    // Método auxiliar para converter a entidade para um mapa simples
    private Map<String, Object> convertToSimpleMap(SocialMaterialization materialization) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", materialization.getId());
        map.put("name", materialization.getName());
        map.put("type", materialization.getType().toString());
        
        // Remover a verificação do campo description que não existe na entidade
        
        if (materialization.getSector() != null) {
            Map<String, Object> sector = new HashMap<>();
            sector.put("id", materialization.getSector().getId());
            sector.put("name", materialization.getSector().getName());
            map.put("sector", sector);
        }
        
        return map;
    }

    // Outros métodos existentes...
}