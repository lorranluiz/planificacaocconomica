package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.dto.SocialMaterializationDto;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.entity.Sector;
import xyz.planecon.service.SocialMaterializationService;
import xyz.planecon.model.enums.SocialMaterializationType;
import xyz.planecon.repository.SocialMaterializationRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class SocialMaterializationController {
    
    private static final Logger logger = LoggerFactory.getLogger(SocialMaterializationController.class);

    private final SocialMaterializationService materializationService;
    
    @Autowired
    private SocialMaterializationRepository socialMaterializationRepository;

    @Autowired
    public SocialMaterializationController(SocialMaterializationService materializationService) {
        this.materializationService = materializationService;
    }

    /**
     * Endpoint para listar todas as materializações sociais disponíveis
     * Endpoint principal usado pelo frontend de instâncias
     */
    @GetMapping("/social-materializations")
    @ResponseStatus(HttpStatus.OK)
    @ResponseBody
    public List<SocialMaterializationDto> getAllSocialMaterializations() {
        logger.info("Obtendo lista de materializações sociais para formulário de instâncias");
        List<SocialMaterialization> materializations = socialMaterializationRepository.findAll();
        logger.info("Encontradas {} materializações sociais", materializations.size());
        return materializations.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Endpoint alias para compatibilidade (deprecated)
     */
    @GetMapping("/planification/available-materializations")
    @ResponseStatus(HttpStatus.OK)
    @ResponseBody
    @Deprecated
    public List<SocialMaterializationDto> getAvailableMaterializations() {
        logger.debug("Obtendo lista de materializações disponíveis (endpoint deprecated)");
        return getAllSocialMaterializations();
    }

    /**
     * Endpoint para criar uma nova materialização social
     */
    @PostMapping("/planification/social-materializations")
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
            
            // Setor padrão, se necessário - ajuste conforme sua lógica de negócios
            Sector defaultSector = new Sector();
            defaultSector.setId(1); // ID do setor padrão, ajuste conforme necessário
            newMaterialization.setSector(defaultSector);
            
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
            logger.error("Erro ao criar materialização social", e);
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
        
        if (materialization.getSector() != null) {
            Map<String, Object> sector = new HashMap<>();
            sector.put("id", materialization.getSector().getId());
            sector.put("name", materialization.getSector().getName());
            map.put("sector", sector);
        }
        
        return map;
    }
    
    /**
     * Converte uma entidade SocialMaterialization para DTO
     */
    private SocialMaterializationDto convertToDto(SocialMaterialization materialization) {
        // Usar o construtor que aceita uma SocialMaterialization
        return new SocialMaterializationDto(materialization);
    }
}