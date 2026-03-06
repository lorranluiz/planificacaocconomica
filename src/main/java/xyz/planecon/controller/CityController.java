package xyz.planecon.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.model.entity.City;
import xyz.planecon.repository.CityRepository;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller para gerenciamento de cidades
 */
@RestController
@RequestMapping("/api/cities")
@CrossOrigin(origins = "*")
public class CityController {
    
    private static final Logger logger = LoggerFactory.getLogger(CityController.class);
    
    @Autowired
    private CityRepository cityRepository;
    
    /**
     * Importa cidades do arquivo cidade.csv
     * @return Resposta com estatísticas da importação
     */
    @PostMapping("/import-csv")
    public ResponseEntity<?> importCitiesFromCsv() {
        try {
            // Tentar vários caminhos possíveis para o arquivo
            String[] possiblePaths = {
                "factorsMap/data/cidade.csv",
                "../factorsMap/data/cidade.csv",
                "/home/lorranluiz/planecon/factorsMap/data/cidade.csv"
            };
            
            Path csvPath = null;
            for (String pathStr : possiblePaths) {
                Path testPath = Paths.get(pathStr);
                if (Files.exists(testPath)) {
                    csvPath = testPath;
                    logger.info("Arquivo encontrado em: {}", testPath.toAbsolutePath());
                    break;
                }
            }
            
            if (csvPath == null) {
                logger.error("Arquivo cidade.csv não encontrado em nenhum dos caminhos");
                return ResponseEntity.badRequest().body("Arquivo cidade.csv não encontrado");
            }
            
            int imported = 0;
            int skipped = 0;
            int updated = 0;
            List<City> batch = new ArrayList<>();
            int batchSize = 500;
            
            try (BufferedReader reader = new BufferedReader(new FileReader(csvPath.toFile()))) {
                String line;
                boolean firstLine = true;
                
                while ((line = reader.readLine()) != null) {
                    // Pular cabeçalho
                    if (firstLine) {
                        firstLine = false;
                        continue;
                    }
                    
                    String[] parts = line.split(",");
                    if (parts.length >= 2) {
                        String code = parts[0].trim();
                        String name = parts[1].trim();
                        
                        // Verificar se cidade já existe
                        var existingCity = cityRepository.findByCode(code);
                        
                        if (existingCity.isPresent()) {
                            // Atualizar nome se diferente
                            City city = existingCity.get();
                            if (!city.getName().equals(name)) {
                                city.setName(name);
                                batch.add(city);
                                updated++;
                            } else {
                                skipped++;
                            }
                        } else {
                            // Criar nova cidade
                            City newCity = new City();
                            newCity.setCode(code);
                            newCity.setName(name);
                            newCity.setCreatedAt(LocalDateTime.now());
                            batch.add(newCity);
                            imported++;
                        }
                        
                        // Salvar em lotes para melhor performance
                        if (batch.size() >= batchSize) {
                            cityRepository.saveAll(batch);
                            logger.info("Salvando lote de {} cidades... Total: {} importadas, {} atualizadas", 
                                batch.size(), imported, updated);
                            batch.clear();
                        }
                    }
                }
                
                // Salvar o lote final
                if (!batch.isEmpty()) {
                    cityRepository.saveAll(batch);
                    logger.info("Salvando lote final de {} cidades", batch.size());
                    batch.clear();
                }
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("imported", imported);
            result.put("updated", updated);
            result.put("skipped", skipped);
            result.put("total", imported + updated + skipped);
            
            logger.info("Importação concluída: {} importadas, {} atualizadas, {} ignoradas", 
                imported, updated, skipped);
            
            return ResponseEntity.ok(result);
            
        } catch (IOException e) {
            logger.error("Erro ao ler arquivo CSV", e);
            return ResponseEntity.internalServerError().body("Erro ao ler arquivo: " + e.getMessage());
        } catch (Exception e) {
            logger.error("Erro ao importar cidades", e);
            return ResponseEntity.internalServerError().body("Erro: " + e.getMessage());
        }
    }
    
    /**
     * Lista todas as cidades
     * @return Lista de cidades
     */
    @GetMapping
    public ResponseEntity<List<City>> getAllCities() {
        try {
            List<City> cities = cityRepository.findAll();
            return ResponseEntity.ok(cities);
        } catch (Exception e) {
            logger.error("Erro ao buscar cidades", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Busca cidade por código
     * @param code Código da cidade
     * @return Cidade encontrada
     */
    @GetMapping("/by-code/{code}")
    public ResponseEntity<?> getCityByCode(@PathVariable String code) {
        try {
            var city = cityRepository.findByCode(code);
            if (city.isPresent()) {
                return ResponseEntity.ok(city.get());
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            logger.error("Erro ao buscar cidade por código", e);
            return ResponseEntity.internalServerError().body("Erro: " + e.getMessage());
        }
    }
    
    /**
     * Busca cidade por nome (case-insensitive)
     * @param name Nome da cidade
     * @return Cidade encontrada
     */
    @GetMapping("/by-name/{name}")
    public ResponseEntity<?> getCityByName(@PathVariable String name) {
        try {
            var city = cityRepository.findByNameIgnoreCase(name);
            if (city.isPresent()) {
                return ResponseEntity.ok(city.get());
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            logger.error("Erro ao buscar cidade por nome", e);
            return ResponseEntity.internalServerError().body("Erro: " + e.getMessage());
        }
    }
}
