package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.model.entity.*;
import xyz.planecon.repository.*;

import java.util.*;

@RestController
@RequestMapping("/api/user-report") // Mudando o caminho base para evitar conflitos
public class UserInstanceController {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private WorkersProposalRepository workersProposalRepository;
    
    @Autowired
    private DemandStockRepository demandStockRepository;

    @GetMapping("/{userId}") // Caminho mais simples agora que mudamos o base path
    public ResponseEntity<?> getUserReport(@PathVariable Integer userId) {
        try {
            // Buscar o usuário
            Optional<User> userOpt = userRepository.findById(userId);
            if (!userOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            User user = userOpt.get();
            Map<String, Object> report = new HashMap<>();
            
            // Dados básicos do usuário
            report.put("user", Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "username", user.getUsername(),
                "type", user.getType().toString(),
                "pronoun", user.getPronoun().toString()
            ));
            
            // Verificar se o usuário tem instância
            Instance instance = user.getInstance();
            if (instance == null) {
                return ResponseEntity.ok(report);
            }
            
            // Dados da instância
            Map<String, Object> instanceInfo = new HashMap<>();
            instanceInfo.put("id", instance.getId());
            instanceInfo.put("type", instance.getType().toString());
            instanceInfo.put("committeeName", instance.getCommitteeName());
            
            // Detalhes específicos por tipo
            switch (instance.getType()) {
                case WORKER:
                    instanceInfo.put("estimatedParticipation", 
                        safeToString(instance.getEstimatedIndividualParticipationInSocialWork()));
                    instanceInfo.put("hoursAtElectronicPoint", 
                        safeToString(instance.getHoursAtElectronicPoint()));
                    
                    // Adicionar comitê associado, se houver
                    if (instance.getAssociatedWorkerCommittee() != null) {
                        instanceInfo.put("associatedCommittee", Map.of(
                            "id", instance.getAssociatedWorkerCommittee().getId(),
                            "name", instance.getAssociatedWorkerCommittee().getCommitteeName()
                        ));
                    }
                    break;
                    
                case COMMITTEE:
                    instanceInfo.put("workerEffectiveLimit", instance.getWorkerEffectiveLimit());
                    instanceInfo.put("totalSocialWork", 
                        safeToString(instance.getTotalSocialWorkOfThisJurisdiction()));
                    instanceInfo.put("producedQuantity", 
                        safeToString(instance.getProducedQuantity()));
                    instanceInfo.put("targetQuantity", 
                        safeToString(instance.getTargetQuantity()));
                    break;
                    
                case COUNCIL:
                    instanceInfo.put("totalSocialWork", 
                        safeToString(instance.getTotalSocialWorkOfThisJurisdiction()));
                    break;
            }
                        
            report.put("instance", instanceInfo);
            
            // Adicionar entidades relacionadas
            Map<String, Object> relatedEntities = new HashMap<>();
            
            // Adicionar propostas de trabalhadores
            List<WorkersProposal> proposals = workersProposalRepository.findByInstance(instance);
            if (!proposals.isEmpty()) {
                List<Map<String, Object>> proposalsList = new ArrayList<>();
                
                for (WorkersProposal proposal : proposals) {
                    proposalsList.add(Map.of(
                        "id", proposal.getId(),
                        "workerLimit", proposal.getWorkerLimit(),
                        "workerHours", safeToString(proposal.getWorkerHours()),
                        "productionTime", safeToString(proposal.getProductionTime()),
                        "weeklyScale", proposal.getWeeklyScale(),
                        "nightShift", proposal.getNightShift()
                    ));
                }
                
                relatedEntities.put("workersProposals", proposalsList);
            }
            
            // Adicionar estoques de demanda
            List<DemandStock> stocks = demandStockRepository.findByInstance(instance);
            if (!stocks.isEmpty()) {
                List<Map<String, Object>> stocksList = new ArrayList<>();
                
                for (DemandStock stock : stocks) {
                    Map<String, Object> stockInfo = new HashMap<>();
                    stockInfo.put("id", stock.getId());
                    stockInfo.put("demand", safeToString(stock.getDemand()));
                    stockInfo.put("stock", safeToString(stock.getStock()));
                    
                    if (stock.getSocialMaterialization() != null) {
                        stockInfo.put("socialMaterialization", stock.getSocialMaterialization().getName());
                    }
                    
                    stocksList.add(stockInfo);
                }
                
                relatedEntities.put("demandStocks", stocksList);
            }
            
            // Adicionar entidades relacionadas se não estiver vazio
            if (!relatedEntities.isEmpty()) {
                report.put("relatedEntities", relatedEntities);
            }
            
            return ResponseEntity.ok(report);
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Erro ao gerar relatório: " + e.getMessage());
        }
    }
    
    private String safeToString(Object obj) {
        return obj != null ? obj.toString() : null;
    }
}