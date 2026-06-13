package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.dto.SocialMaterializationDto;
import xyz.planecon.model.entity.MeasurementUnit;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.entity.Sector;
import xyz.planecon.repository.MeasurementUnitRepository;
import xyz.planecon.repository.SectorRepository;
import xyz.planecon.service.SocialMaterializationService;
import xyz.planecon.model.enums.SocialMaterializationType;
import xyz.planecon.repository.SocialMaterializationRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class SocialMaterializationController {
    
    private static final Logger logger = LoggerFactory.getLogger(SocialMaterializationController.class);

    private final SocialMaterializationService materializationService;

    private final SectorRepository sectorRepository;

    private final MeasurementUnitRepository measurementUnitRepository;
    
    @Autowired
    private SocialMaterializationRepository socialMaterializationRepository;

    @Autowired
    public SocialMaterializationController(
            SocialMaterializationService materializationService,
            SectorRepository sectorRepository,
            MeasurementUnitRepository measurementUnitRepository) {
        this.materializationService = materializationService;
        this.sectorRepository = sectorRepository;
        this.measurementUnitRepository = measurementUnitRepository;
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
     * Endpoint estendido com campos de grandeza padrão/unidade para a tela de
     * gestão de materializações, sem alterar o contrato legado das demais telas.
     */
    @GetMapping("/social-materializations/full")
    @ResponseStatus(HttpStatus.OK)
    @ResponseBody
    public List<SocialMaterializationDto> getAllSocialMaterializationsFull() {
        logger.info("Obtendo lista estendida de materializações sociais");
        List<SocialMaterialization> materializations = socialMaterializationRepository.findAll();
        return materializations.stream()
                .map(this::convertToDtoWithExtendedFields)
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
    @PostMapping({"/social-materializations", "/planification/social-materializations"})
    public ResponseEntity<?> createMaterialization(@RequestBody Map<String, Object> payload) {
        try {
            // Extrair dados da requisição
            String name = toStringValue(payload.get("name"));
            String typeStr = toStringValue(payload.get("type"));
            String description = toStringValue(payload.get("description"));
            
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
            newMaterialization.setCreatedAt(LocalDateTime.now());
            
            Integer sectorId = toInteger(payload.get("sectorId"));
            if (sectorId == null) {
                sectorId = 1;
            }

            Sector sector = sectorRepository.findById(sectorId).orElse(null);
            if (sector == null) {
                return ResponseEntity.badRequest()
                    .body(Map.of("message", "Setor não encontrado: " + sectorId));
            }
            newMaterialization.setSector(sector);

            Integer measurementUnitId = toInteger(payload.get("measurementUnitId"));
            BigDecimal standardQuantityPerUnit = parseDecimal(payload.get("standardQuantityPerUnit"));

            // Compatibilidade com fluxos antigos: se não vier unidade/quantidade,
            // assume "unidade" e 1 para não quebrar telas legadas.
            if (measurementUnitId == null) {
                measurementUnitId = measurementUnitRepository.findByNameIgnoreCase("unidade")
                        .map(MeasurementUnit::getId)
                        .orElse(null);
            }
            if (standardQuantityPerUnit == null) {
                standardQuantityPerUnit = BigDecimal.ONE;
            }

            if (measurementUnitId == null) {
                return ResponseEntity.badRequest()
                    .body(Map.of("message", "Unidade de medida é obrigatória"));
            }

            MeasurementUnit measurementUnit = measurementUnitRepository.findById(measurementUnitId).orElse(null);
            if (measurementUnit == null) {
                return ResponseEntity.badRequest()
                    .body(Map.of("message", "Unidade de medida não encontrada: " + measurementUnitId));
            }

            newMaterialization.setMeasurementUnit(measurementUnit);
            newMaterialization.setStandardQuantityPerUnit(standardQuantityPerUnit);
            
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

    /**
     * Endpoint para editar uma materialização social existente
     */
    @PutMapping("/social-materializations/{id}")
    public ResponseEntity<?> updateMaterialization(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> payload) {
        try {
            if (id == null) {
                return ResponseEntity.badRequest()
                    .body(Map.of("message", "ID da materialização é obrigatório"));
            }

            if (!socialMaterializationRepository.existsById(id)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Materialização social não encontrada: " + id));
            }

            String name = toStringValue(payload.get("name"));
            String typeStr = toStringValue(payload.get("type"));
            Integer sectorId = toInteger(payload.get("sectorId"));
            Integer measurementUnitId = toInteger(payload.get("measurementUnitId"));
            BigDecimal standardQuantityPerUnit = parseDecimal(payload.get("standardQuantityPerUnit"));

            if (name == null || typeStr == null || sectorId == null || measurementUnitId == null || standardQuantityPerUnit == null) {
                return ResponseEntity.badRequest()
                    .body(Map.of("message", "Nome, tipo, setor, unidade de medida e quantidade padrão são obrigatórios"));
            }

            if (standardQuantityPerUnit.compareTo(BigDecimal.ZERO) < 0) {
                return ResponseEntity.badRequest()
                    .body(Map.of("message", "Quantidade padrão não pode ser negativa"));
            }

            SocialMaterializationType type;
            try {
                type = SocialMaterializationType.valueOf(typeStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                    .body(Map.of("message", "Tipo de materialização inválido: " + typeStr));
            }

            Sector sector = sectorRepository.findById(sectorId).orElse(null);
            if (sector == null) {
                return ResponseEntity.badRequest()
                    .body(Map.of("message", "Setor não encontrado: " + sectorId));
            }

            MeasurementUnit measurementUnit = measurementUnitRepository.findById(measurementUnitId).orElse(null);
            if (measurementUnit == null) {
                return ResponseEntity.badRequest()
                    .body(Map.of("message", "Unidade de medida não encontrada: " + measurementUnitId));
            }

            int updatedRows = socialMaterializationRepository.updateFieldsById(
                    id,
                    name,
                    type,
                    sector,
                    measurementUnit,
                    standardQuantityPerUnit);

            if (updatedRows == 0) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Materialização social não encontrada: " + id));
            }

            // Atualizar validity_deadline se presente no payload
            if (payload.containsKey("validityDeadline")) {
                SocialMaterialization mat = socialMaterializationRepository.findById(id).orElse(null);
                if (mat != null) {
                    mat.setValidityDeadline(parseDecimal(payload.get("validityDeadline")));
                    socialMaterializationRepository.save(mat);
                }
            }

            Map<String, Object> result = new HashMap<>();
            result.put("id", id);
            result.put("name", name);
            result.put("type", type.toString());
            result.put("standardQuantityPerUnit", standardQuantityPerUnit);

            Map<String, Object> sectorMap = new HashMap<>();
            sectorMap.put("id", sector.getId());
            sectorMap.put("name", sector.getName());
            result.put("sector", sectorMap);

            Map<String, Object> unitMap = new HashMap<>();
            unitMap.put("id", measurementUnit.getId());
            unitMap.put("name", measurementUnit.getName());
            result.put("measurementUnit", unitMap);
            result.put("measurementUnitId", measurementUnit.getId());
            result.put("measurementUnitName", measurementUnit.getName());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Erro ao atualizar materialização social", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Erro ao atualizar materialização social: " + e.getMessage()));
        }
    }
    
    // Método auxiliar para converter a entidade para um mapa simples
    private Map<String, Object> convertToSimpleMap(SocialMaterialization materialization) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", materialization.getId());
        map.put("name", materialization.getName());
        map.put("type", materialization.getType().toString());
        map.put("createdAt", materialization.getCreatedAt());
        map.put("standardQuantityPerUnit", materialization.getStandardQuantityPerUnit());
        
        if (materialization.getSector() != null) {
            Map<String, Object> sector = new HashMap<>();
            sector.put("id", materialization.getSector().getId());
            sector.put("name", materialization.getSector().getName());
            map.put("sector", sector);
        }

        if (materialization.getMeasurementUnit() != null) {
            Map<String, Object> unit = new HashMap<>();
            unit.put("id", materialization.getMeasurementUnit().getId());
            unit.put("name", materialization.getMeasurementUnit().getName());
            map.put("measurementUnit", unit);
            map.put("measurementUnitId", materialization.getMeasurementUnit().getId());
            map.put("measurementUnitName", materialization.getMeasurementUnit().getName());
        }
        
        return map;
    }

    private String toStringValue(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private Integer toInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) {
            return null;
        }
        try {
            return Integer.valueOf(text);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private BigDecimal parseDecimal(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) {
            return null;
        }
        try {
            return new BigDecimal(text.replace(',', '.'));
        } catch (NumberFormatException e) {
            return null;
        }
    }
    
    /**
     * Converte uma entidade SocialMaterialization para DTO
     */
    private SocialMaterializationDto convertToDto(SocialMaterialization materialization) {
        return new SocialMaterializationDto(materialization);
    }

    private SocialMaterializationDto convertToDtoWithExtendedFields(SocialMaterialization materialization) {
        return new SocialMaterializationDto(materialization, true);
    }
}