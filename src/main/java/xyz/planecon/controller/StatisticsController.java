package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.repository.InstanceRepository;
import xyz.planecon.repository.SocialMaterializationRepository;
import xyz.planecon.repository.SectorRepository;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@RestController
@RequestMapping("/api/statistics")
public class StatisticsController {

    @Autowired
    private InstanceRepository instanceRepository;
    
    @Autowired
    private SocialMaterializationRepository socialMaterializationRepository;
    
    @Autowired
    private SectorRepository sectorRepository;

    /**
     * Retorna um resumo de produção dos comitês, incluindo quantidade produzida vs. meta
     */
    @GetMapping("/production-summary")
    public ResponseEntity<?> getProductionSummary() {
        try {
            // Obter todos os comitês
            List<Instance> committees = StreamSupport
                .stream(instanceRepository.findByType(InstanceType.COMMITTEE).spliterator(), false)
                .collect(Collectors.toList());
                
            List<Map<String, Object>> result = new ArrayList<>();
            
            // Para cada comitê, criar um objeto com os dados de produção
            for (Instance committee : committees) {
                if (committee.getProducedQuantity() != null && committee.getTargetQuantity() != null) {
                    Map<String, Object> committeeData = new HashMap<>();
                    committeeData.put("name", committee.getCommitteeName());
                    committeeData.put("id", committee.getId());
                    committeeData.put("producedQuantity", committee.getProducedQuantity());
                    committeeData.put("targetQuantity", committee.getTargetQuantity());
                    
                    // Calcular a porcentagem de conclusão
                    double completionPercentage = committee.getProducedQuantity().doubleValue() / 
                                                committee.getTargetQuantity().doubleValue() * 100;
                    committeeData.put("completionPercentage", Math.round(completionPercentage * 100.0) / 100.0);
                    
                    // Adicionar materialização social se existir
                    if (committee.getSocialMaterialization() != null) {
                        committeeData.put("materializationName", 
                            committee.getSocialMaterialization().getName());
                        committeeData.put("materializationId", 
                            committee.getSocialMaterialization().getId());
                        
                        // Adicionar o setor se existir
                        if (committee.getSocialMaterialization().getSector() != null) {
                            committeeData.put("sectorName", 
                                committee.getSocialMaterialization().getSector().getName());
                            committeeData.put("sectorId", 
                                committee.getSocialMaterialization().getSector().getId());
                        }
                    }
                    
                    result.add(committeeData);
                }
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                "message", "Erro ao obter resumo de produção: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Retorna dados de crescimento para gerar gráficos de tendências
     */
    @GetMapping("/growth-trends")
    public ResponseEntity<?> getGrowthTrends() {
        try {
            // Obter todas as instâncias
            Iterable<Instance> instances = instanceRepository.findAll();
            
            // Obter todas as materializações
            Iterable<SocialMaterialization> materializations = socialMaterializationRepository.findAll();
            
            // Agrupar por mês de criação
            Map<String, Long> instancesByMonth = new LinkedHashMap<>();
            Map<String, Long> materializationsByMonth = new LinkedHashMap<>();
            
            // Formatar para mês/ano
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM/yyyy");
            
            // Processar instâncias
            for (Instance instance : instances) {
                if (instance.getCreatedAt() != null) {
                    String monthYear = instance.getCreatedAt().format(formatter);
                    instancesByMonth.put(monthYear, instancesByMonth.getOrDefault(monthYear, 0L) + 1);
                }
            }
            
            // Processar materializações
            for (SocialMaterialization mat : materializations) {
                if (mat.getCreatedAt() != null) {
                    String monthYear = mat.getCreatedAt().format(formatter);
                    materializationsByMonth.put(monthYear, 
                        materializationsByMonth.getOrDefault(monthYear, 0L) + 1);
                }
            }
            
            // Ordenar os meses cronologicamente
            List<String> allMonths = new ArrayList<>(
                new HashSet<>(instancesByMonth.keySet()));
            allMonths.addAll(materializationsByMonth.keySet());
            allMonths = allMonths.stream().distinct()
                .sorted((a, b) -> {
                    // Converter para LocalDate para comparação
                    String[] partsA = a.split("/");
                    String[] partsB = b.split("/");
                    int yearA = Integer.parseInt(partsA[1]);
                    int monthA = Integer.parseInt(partsA[0]);
                    int yearB = Integer.parseInt(partsB[1]);
                    int monthB = Integer.parseInt(partsB[0]);
                    
                    if (yearA != yearB) {
                        return yearA - yearB;
                    }
                    return monthA - monthB;
                })
                .collect(Collectors.toList());
            
            // Preparar resultado com dados ordenados
            Map<String, Object> result = new HashMap<>();
            
            List<Long> instancesCounts = new ArrayList<>();
            List<Long> materializationsCounts = new ArrayList<>();
            
            for (String month : allMonths) {
                instancesCounts.add(instancesByMonth.getOrDefault(month, 0L));
                materializationsCounts.add(materializationsByMonth.getOrDefault(month, 0L));
            }
            
            result.put("labels", allMonths);
            result.put("instancesCounts", instancesCounts);
            result.put("materializationsCounts", materializationsCounts);
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                "message", "Erro ao obter dados de tendências: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Retorna dados para o gráfico de distribuição de instâncias por tipo
     */
    @GetMapping("/instance-distribution")
    public ResponseEntity<?> getInstanceDistribution() {
        try {
            // Contar instâncias por tipo
            Map<String, Long> countsByType = StreamSupport
                .stream(instanceRepository.findAll().spliterator(), false)
                .filter(instance -> instance.getType() != null)
                .collect(Collectors.groupingBy(
                    instance -> instance.getType().toString(),
                    Collectors.counting()
                ));
            
            Map<String, Object> result = new HashMap<>();
            result.put("labels", new String[]{"Conselhos", "Comitês", "Associações"});
            result.put("data", new Long[]{
                countsByType.getOrDefault("COUNCIL", 0L),
                countsByType.getOrDefault("COMMITTEE", 0L),
                countsByType.getOrDefault("RESIDENTS_ASSOCIATION", 0L)
            });
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                "message", "Erro ao obter distribuição de instâncias: " + e.getMessage()
            ));
        }
    }
}