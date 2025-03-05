package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.model.entity.*;
import xyz.planecon.repository.*;

import java.util.*;

@RestController
@RequestMapping("/api/user-instance")
public class UserDetailsController {

    @Autowired
    private InstanceRepository instanceRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @GetMapping("/report/{userId}")
    public ResponseEntity<?> getUserInstanceReport(@PathVariable Integer userId) {
        try {
            Optional<User> userOpt = userRepository.findById(userId);
            if (!userOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            User user = userOpt.get();
            Instance instance = user.getInstance();
            if (instance == null) {
                return ResponseEntity.ok(Map.of(
                    "user", Map.of(
                        "id", user.getId(),
                        "name", user.getName(),
                        "type", user.getType().name()
                    ),
                    "message", "Este usuário não possui instância associada."
                ));
            }
            
            Map<String, Object> report = new HashMap<>();
            
            // Dados básicos do usuário
            report.put("user", Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "username", user.getUsername(),
                "type", user.getType().name(),
                "pronoun", user.getPronoun().name()
            ));
            
            // Dados da instância
            Map<String, Object> instanceData = new HashMap<>();
            instanceData.put("id", instance.getId());
            instanceData.put("type", instance.getType().name());
            instanceData.put("committeeName", instance.getCommitteeName());
            
			// Adicionar detalhes específicos por tipo
            switch (instance.getType()) {
                case WORKER:
                    instanceData.put("estimatedParticipation", instance.getEstimatedIndividualParticipationInSocialWork());
                    instanceData.put("hoursAtElectronicPoint", instance.getHoursAtElectronicPoint());
                    
                    // Comitê associado
                    if (instance.getAssociatedWorkerCommittee() != null) {
                        instanceData.put("associatedCommittee", Map.of(
                            "id", instance.getAssociatedWorkerCommittee().getId(),
                            "name", instance.getAssociatedWorkerCommittee().getCommitteeName()
                        ));
                    }
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
            addRelatedEntities(instance, report);
            
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Erro ao gerar relatório: " + e.getMessage());
        }
    }
    
    private void addRelatedEntities(Instance instance, Map<String, Object> report) {
        // Simplificando para incluir apenas as contagens de entidades relacionadas
        Map<String, Object> related = new HashMap<>();
        
        // WorkersProposal
        List<WorkersProposal> proposals = instanceRepository.findWorkerProposalsByInstance(instance.getId());
        if (!proposals.isEmpty()) {
            related.put("workersProposals", proposals.stream().map(wp -> Map.of(
                "id", wp.getId(),
                "workerLimit", wp.getWorkerLimit(),
                "workerHours", wp.getWorkerHours(),
                "productionTime", wp.getProductionTime(),
                "weeklyScale", wp.getWeeklyScale(),
                "nightShift", wp.getNightShift()
            )).toList());
        }
        
        // DemandStock
        List<DemandStock> stocks = instanceRepository.findDemandStocksByInstance(instance.getId());
        if (!stocks.isEmpty()) {
            related.put("demandStocks", stocks.stream().map(ds -> Map.of(
                "id", ds.getId(),
                "demand", ds.getDemand(),
                "stock", ds.getStock(),
                "socialMaterialization", ds.getSocialMaterialization() != null ? 
                    ds.getSocialMaterialization().getName() : "N/A"
            )).toList());
        }

        report.put("relatedEntities", related);
    }
}