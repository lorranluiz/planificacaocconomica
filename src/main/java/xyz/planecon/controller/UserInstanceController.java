package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.model.entity.*;
import xyz.planecon.repository.*;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@RestController
@RequestMapping("/api/user-instance")
public class UserInstanceController {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private InstanceRepository instanceRepository;
    
    @Autowired
    private WorkersProposalRepository workersProposalRepository;
    
    @Autowired
    private DemandStockRepository demandStockRepository;
    
    @Autowired
    private DemandVectorRepository demandVectorRepository;

    @GetMapping("/report/{userId}")
    public ResponseEntity<?> getUserInstanceReport(@PathVariable Integer userId) {
        try {
            // Buscar o usuário
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            User user = userOpt.get();
            
            // Preparar o objeto de resposta
            Map<String, Object> report = new HashMap<>();
            
            // Adicionar informações do usuário
            Map<String, Object> userData = new HashMap<>();
            userData.put("id", user.getId());
            userData.put("username", user.getUsername());
            userData.put("name", user.getName());
            userData.put("type", user.getType().toString());
            userData.put("pronoun", user.getPronoun().toString());
            
            report.put("user", userData);
            
            // Verificar se o usuário tem uma instância associada
            Instance instance = user.getInstance();
            if (instance == null) {
                report.put("message", "Este usuário não possui uma instância associada");
                return ResponseEntity.ok(report);
            }
            
            // Adicionar informações básicas da instância
            Map<String, Object> instanceData = new HashMap<>();
            instanceData.put("id", instance.getId());
            instanceData.put("type", instance.getType().toString());
            instanceData.put("committeeName", instance.getCommitteeName());
            
            // Adicionar informações com base no tipo de instância
            switch (instance.getType()) {
                case WORKER:
                    instanceData.put("estimatedParticipation", instance.getEstimatedIndividualParticipationInSocialWork());
                    instanceData.put("hoursAtElectronicPoint", instance.getHoursAtElectronicPoint());
                    break;
                    
                case COMMITTEE:
                    instanceData.put("workerEffectiveLimit", instance.getWorkerEffectiveLimit());
                    instanceData.put("totalSocialWork", instance.getTotalSocialWorkOfThisJurisdiction());
                    instanceData.put("producedQuantity", instance.getProducedQuantity());
                    instanceData.put("targetQuantity", instance.getTargetQuantity());
                    break;
                    
                case COUNCIL:
                    instanceData.put("totalSocialWork", instance.getTotalSocialWorkOfThisJurisdiction());
                    break;
            }
            
            report.put("instance", instanceData);
            
            // Adicionar entidades relacionadas
            Map<String, Object> relatedEntities = new HashMap<>();
            
            // Buscar propostas dos trabalhadores
            List<WorkersProposal> proposals = workersProposalRepository.findByInstance(instance);
            if (!proposals.isEmpty()) {
                relatedEntities.put("workersProposals", proposals.stream().map(wp -> {
                    Map<String, Object> proposalData = new HashMap<>();
                    proposalData.put("id", wp.getId());
                    proposalData.put("workerLimit", wp.getWorkerLimit());
                    proposalData.put("workerHours", wp.getWorkerHours());
                    proposalData.put("productionTime", wp.getProductionTime());
                    proposalData.put("nightShift", wp.getNightShift());
                    proposalData.put("weeklyScale", wp.getWeeklyScale());
                    return proposalData;
                }).collect(Collectors.toList()));
            }
            
            // Buscar estoques de demanda
            List<DemandStock> stocks = demandStockRepository.findByInstance(instance);
            if (!stocks.isEmpty()) {
                relatedEntities.put("demandStocks", stocks.stream().map(ds -> {
                    Map<String, Object> stockData = new HashMap<>();
                    stockData.put("id", ds.getId());
                    stockData.put("demand", ds.getDemand());
                    stockData.put("stock", ds.getStock());
                    
                    // Verificando se há uma materialização social associada
                    if (ds.getSocialMaterialization() != null) {
                        stockData.put("socialMaterialization", ds.getSocialMaterialization().getName());
                    } else {
                        stockData.put("socialMaterialization", "N/A");
                    }
                    
                    return stockData;
                }).collect(Collectors.toList()));
            }
            
            // Buscar vetores de demanda
            List<DemandVector> vectors = demandVectorRepository.findByInstance(instance);
            if (!vectors.isEmpty()) {
                relatedEntities.put("demandVectors", vectors.stream().map(dv -> {
                    Map<String, Object> vectorData = new HashMap<>();
                    // Remove ID or use a composite key if needed since DemandVector is a pivot table
                    vectorData.put("demand", dv.getDemand());
                    
                    // Verificando se há uma materialização social associada
                    if (dv.getSocialMaterialization() != null) {
                        vectorData.put("socialMaterialization", dv.getSocialMaterialization().getName());
                    } else {
                        vectorData.put("socialMaterialization", "N/A");
                    }
                    
                    return vectorData;
                }).collect(Collectors.toList()));
            }
            
            report.put("relatedEntities", relatedEntities);
            
            return ResponseEntity.ok(report);
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Erro ao gerar relatório: " + e.getMessage());
        }
    }
}