package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.entity.Sector;
import xyz.planecon.model.enums.SocialMaterializationType;
import xyz.planecon.repository.SocialMaterializationRepository;
import xyz.planecon.repository.SectorRepository;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.ArrayList;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/social-materializations")
public class SocialMaterializationController {

    @Autowired
    private SocialMaterializationRepository socialMaterializationRepository;
    
    @Autowired
    private SectorRepository sectorRepository;

    @GetMapping
    public ResponseEntity<?> getAllSocialMaterializations() {
        try {
            List<SocialMaterialization> materializations = socialMaterializationRepository.findAll();
            
            // Usar uma estrutura de dados simples para evitar problemas de serialização
            List<Map<String, Object>> result = new ArrayList<>();
            
            for (SocialMaterialization mat : materializations) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", mat.getId());
                item.put("name", mat.getName());
                item.put("type", mat.getType() != null ? mat.getType().toString() : null);
                item.put("createdAt", mat.getCreatedAt());
                
                // Adicionar informações do setor de forma segura
                if (mat.getSector() != null) {
                    Map<String, Object> sectorInfo = new HashMap<>();
                    sectorInfo.put("id", mat.getSector().getId());
                    sectorInfo.put("name", mat.getSector().getName());
                    item.put("sector", sectorInfo);
                } else {
                    item.put("sector", null);
                }
                
                result.add(item);
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Erro ao buscar materializações sociais: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    @PostMapping
    public ResponseEntity<?> createSocialMaterialization(@RequestBody Map<String, Object> payload) {
        try {
            // Extrair e validar dados
            String name = (String) payload.get("name");
            String typeStr = (String) payload.get("type");
            Integer sectorId = (Integer) payload.get("sectorId");
            
            if (name == null || typeStr == null || sectorId == null) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("message", "Nome, tipo e setor são obrigatórios");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // Validar tipo
            SocialMaterializationType type;
            try {
                type = SocialMaterializationType.valueOf(typeStr);
            } catch (IllegalArgumentException e) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("message", "Tipo inválido: " + typeStr);
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // Buscar setor
            Optional<Sector> sectorOpt = sectorRepository.findById(sectorId);
            if (!sectorOpt.isPresent()) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("message", "Setor não encontrado com ID: " + sectorId);
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // Criar e salvar materialização
            SocialMaterialization materialization = new SocialMaterialization();
            materialization.setName(name);
            materialization.setType(type);
            materialization.setSector(sectorOpt.get());
            materialization.setCreatedAt(LocalDateTime.now());
            
            SocialMaterialization saved = socialMaterializationRepository.save(materialization);
            
            // Retornar DTO
            Map<String, Object> result = new HashMap<>();
            result.put("id", saved.getId());
            result.put("name", saved.getName());
            result.put("type", saved.getType().toString());
            result.put("createdAt", saved.getCreatedAt());
            
            Map<String, Object> sectorInfo = new HashMap<>();
            sectorInfo.put("id", saved.getSector().getId());
            sectorInfo.put("name", saved.getSector().getName());
            result.put("sector", sectorInfo);
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Erro ao cadastrar materialização social: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}