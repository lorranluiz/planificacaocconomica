package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import xyz.planecon.model.entity.Sector;
import xyz.planecon.repository.SectorRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sectors")
public class SectorController {

    @Autowired
    private SectorRepository sectorRepository;

    @GetMapping
    public ResponseEntity<?> getAllSectors() {
        try {
            List<Sector> sectors = sectorRepository.findAll();
            
            // Usar estrutura simples para evitar problemas de serialização
            List<Map<String, Object>> result = new ArrayList<>();
            
            for (Sector sector : sectors) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", sector.getId());
                item.put("name", sector.getName());
                item.put("createdAt", sector.getCreatedAt());
                result.add(item);
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Erro ao buscar setores: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    @PostMapping
    public ResponseEntity<?> createSector(@RequestBody Map<String, String> payload) {
        try {
            // Extrair e validar dados
            String name = payload.get("name");
            
            if (name == null || name.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "message", "O nome do setor é obrigatório."
                ));
            }
            
            // Verificar se já existe um setor com esse nome
            boolean nameExists = sectorRepository.findAll().stream()
                .anyMatch(s -> s.getName().equalsIgnoreCase(name.trim()));
                
            if (nameExists) {
                return ResponseEntity.badRequest().body(Map.of(
                    "message", "Já existe um setor com este nome."
                ));
            }
            
            // Criar e salvar o setor
            Sector sector = new Sector();
            sector.setName(name.trim());
            sector.setCreatedAt(LocalDateTime.now());
            
            Sector savedSector = sectorRepository.save(sector);
            
            // Retornar DTO
            Map<String, Object> result = new HashMap<>();
            result.put("id", savedSector.getId());
            result.put("name", savedSector.getName());
            result.put("createdAt", savedSector.getCreatedAt());
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                "message", "Erro ao cadastrar setor: " + e.getMessage()
            ));
        }
    }
}