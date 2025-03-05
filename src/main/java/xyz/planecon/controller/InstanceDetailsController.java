package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.model.entity.*;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.repository.*;

import java.util.*;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/instance")
public class InstanceDetailsController {

    @Autowired
    private InstanceRepository instanceRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private SocialMaterializationRepository socialMaterializationRepository;
    
    @Autowired
    private WorkersProposalRepository workersProposalRepository;
    
    @Autowired
    private DemandStockRepository demandStockRepository;
    
    @Autowired
    private DemandVectorRepository demandVectorRepository;
    
    @Autowired
    private OptimizationInputsResultsRepository optimizationInputsResultsRepository;
    
    @Autowired
    private TechnologicalTensorRepository technologicalTensorRepository;

    @GetMapping("/details/{instanceId}")
    public ResponseEntity<?> getInstanceDetails(@PathVariable Integer instanceId) {
        try {
            Optional<Instance> optInstance = instanceRepository.findById(instanceId);
            if (!optInstance.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            Instance instance = optInstance.get();
            Map<String, Object> response = new HashMap<>();
            
            // Adicionar informações básicas da instância
            response.put("id", instance.getId());
            response.put("type", instance.getType().toString());
            response.put("createdAt", formatDateTime(instance.getCreatedAt()));
            
            // Nome da instância (committeeName)
            if (instance.getCommitteeName() != null) {
                response.put("name", instance.getCommitteeName());
            }
            
            // Adicionar detalhes específicos com base no tipo de instância
            switch (instance.getType()) {
                case COUNCIL:
                    addCouncilDetails(instance, response);
                    break;
                case COMMITTEE:
                    addCommitteeDetails(instance, response);
                    break;
                case WORKER:
                    addWorkerDetails(instance, response);
                    break;
            }
            
            // Adicionar usuários associados
            addAssociatedUsers(instance, response);
            
            // Adicionar materialização social, se disponível
            if (instance.getSocialMaterialization() != null) {
                addSocialMaterializationDetails(instance.getSocialMaterialization(), response);
            }
            
            // Adicionar entidades relacionadas
            Map<String, Object> relatedEntities = new HashMap<>();
            
            // WorkersProposal
            addWorkerProposals(instance, relatedEntities);
            
            // DemandStock
            addDemandStocks(instance, relatedEntities);
            
            // DemandVector
            addDemandVectors(instance, relatedEntities);
            
            // OptimizationInputsResults
            addOptimizationInputsResults(instance, relatedEntities);
            
            // TechnologicalTensor
            addTechnologicalTensors(instance, relatedEntities);
            
            // Adicionar entidades relacionadas somente se houver pelo menos uma
            if (!relatedEntities.isEmpty()) {
                response.put("relatedEntities", relatedEntities);
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Erro ao buscar detalhes da instância: " + e.getMessage());
        }
    }
    
    private void addCommitteeDetails(Instance instance, Map<String, Object> response) {
        response.put("workerEffectiveLimit", instance.getWorkerEffectiveLimit());
        response.put("totalSocialWork", formatBigDecimal(instance.getTotalSocialWorkOfThisJurisdiction()));
        response.put("producedQuantity", formatBigDecimal(instance.getProducedQuantity()));
        response.put("targetQuantity", formatBigDecimal(instance.getTargetQuantity()));
        
        // Adicionar conselho popular associado, se disponível
        if (instance.getPopularCouncilAssociatedWithCommitteeOrWorker() != null) {
            Map<String, Object> associatedCouncil = new HashMap<>();
            associatedCouncil.put("id", instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getId());
            associatedCouncil.put("type", instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getType().toString());
            response.put("associatedCouncil", associatedCouncil);
        }
    }
    
    private void addCouncilDetails(Instance instance, Map<String, Object> response) {
        response.put("totalSocialWork", formatBigDecimal(instance.getTotalSocialWorkOfThisJurisdiction()));
        
        // Adicionar conselho popular associado, se disponível e se for diferente do próprio
        if (instance.getPopularCouncilAssociatedWithPopularCouncil() != null && 
            !instance.getPopularCouncilAssociatedWithPopularCouncil().getId().equals(instance.getId())) {
            Map<String, Object> associatedCouncil = new HashMap<>();
            associatedCouncil.put("id", instance.getPopularCouncilAssociatedWithPopularCouncil().getId());
            response.put("associatedCouncil", associatedCouncil);
        }
    }
    
    private void addWorkerDetails(Instance instance, Map<String, Object> response) {
        response.put("estimatedIndividualParticipation", formatBigDecimal(instance.getEstimatedIndividualParticipationInSocialWork()));
        response.put("hoursAtElectronicPoint", formatBigDecimal(instance.getHoursAtElectronicPoint()));
        
        // Adicionar conselho popular associado, se disponível
        if (instance.getPopularCouncilAssociatedWithCommitteeOrWorker() != null) {
            Map<String, Object> associatedCouncil = new HashMap<>();
            associatedCouncil.put("id", instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getId());
            associatedCouncil.put("type", instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getType().toString());
            response.put("associatedCouncil", associatedCouncil);
        }
        
        // Adicionar comitê de trabalhador associado, se disponível
        if (instance.getAssociatedWorkerCommittee() != null) {
            Map<String, Object> associatedCommittee = new HashMap<>();
            associatedCommittee.put("id", instance.getAssociatedWorkerCommittee().getId());
            associatedCommittee.put("name", instance.getAssociatedWorkerCommittee().getCommitteeName());
            response.put("associatedWorkerCommittee", associatedCommittee);
        }
    }
    
    private void addAssociatedUsers(Instance instance, Map<String, Object> response) {
        List<User> users = userRepository.findByInstanceId(instance.getId());
        if (!users.isEmpty()) {
            List<Map<String, Object>> userList = new ArrayList<>();
            for (User user : users) {
                Map<String, Object> userInfo = new HashMap<>();
                userInfo.put("id", user.getId());
                userInfo.put("name", user.getName());
                userInfo.put("username", user.getUsername());
                userInfo.put("type", user.getType().toString());
                userInfo.put("pronoun", user.getPronoun().toString());
                userList.add(userInfo);
            }
            response.put("users", userList);
        }
    }
    
    private void addSocialMaterializationDetails(SocialMaterialization sm, Map<String, Object> response) {
        Map<String, Object> smInfo = new HashMap<>();
        smInfo.put("id", sm.getId());
        smInfo.put("name", sm.getName());
        smInfo.put("type", sm.getType().toString());
        
        // Adicionar setor, se disponível
        if (sm.getSector() != null) {
            smInfo.put("sectorId", sm.getSector().getId());
            smInfo.put("sectorName", sm.getSector().getName());
        }
        
        response.put("socialMaterialization", smInfo);
    }
    
    private void addSectorDetails(Sector sector, Map<String, Object> response) {
        Map<String, Object> sectorInfo = new HashMap<>();
        sectorInfo.put("id", sector.getId());
        sectorInfo.put("name", sector.getName());
        sectorInfo.put("createdAt", formatDateTime(sector.getCreatedAt()));
        response.put("sector", sectorInfo);
    }
    
    private void addWorkerProposals(Instance instance, Map<String, Object> response) {
        List<WorkersProposal> proposals = workersProposalRepository.findByInstance(instance);
        if (!proposals.isEmpty()) {
            List<Map<String, Object>> proposalsList = new ArrayList<>();
            for (WorkersProposal proposal : proposals) {
                Map<String, Object> proposalInfo = new HashMap<>();
                proposalInfo.put("id", proposal.getId());
                proposalInfo.put("workerLimit", proposal.getWorkerLimit());
                proposalInfo.put("workerHours", formatBigDecimal(proposal.getWorkerHours()));
                proposalInfo.put("productionTime", formatBigDecimal(proposal.getProductionTime()));
                proposalInfo.put("nightShift", proposal.getNightShift());
                proposalInfo.put("weeklyScale", proposal.getWeeklyScale());
                proposalInfo.put("createdAt", formatDateTime(proposal.getCreatedAt()));
                proposalsList.add(proposalInfo);
            }
            response.put("workersProposals", proposalsList);
        }
    }
    
    private void addDemandStocks(Instance instance, Map<String, Object> response) {
        List<DemandStock> stocks = demandStockRepository.findByInstance(instance);
        if (!stocks.isEmpty()) {
            List<Map<String, Object>> stocksList = new ArrayList<>();
            for (DemandStock stock : stocks) {
                Map<String, Object> stockInfo = new HashMap<>();
                stockInfo.put("id", stock.getId());
                stockInfo.put("demand", formatBigDecimal(stock.getDemand()));
                stockInfo.put("stock", formatBigDecimal(stock.getStock()));
                
                // Adicionar materialização social, se disponível
                if (stock.getSocialMaterialization() != null) {
                    stockInfo.put("socialMaterializationId", stock.getSocialMaterialization().getId());
                    stockInfo.put("socialMaterializationName", stock.getSocialMaterialization().getName());
                }
                
                stockInfo.put("createdAt", formatDateTime(stock.getCreatedAt()));
                stocksList.add(stockInfo);
            }
            response.put("demandStocks", stocksList);
        }
    }
    
    private void addDemandVectors(Instance instance, Map<String, Object> response) {
        List<DemandVector> vectors = demandVectorRepository.findByInstance(instance);
        if (!vectors.isEmpty()) {
            List<Map<String, Object>> vectorsList = new ArrayList<>();
            int index = 0;
            for (DemandVector vector : vectors) {
                Map<String, Object> vectorInfo = new HashMap<>();
                // Usar índice já que não conseguimos acessar um método getId()
                vectorInfo.put("index", index++);
                vectorInfo.put("demand", formatBigDecimal(vector.getDemand()));
                
                // Adicionar materialização social, se disponível
                if (vector.getSocialMaterialization() != null) {
                    vectorInfo.put("socialMaterializationId", vector.getSocialMaterialization().getId());
                    vectorInfo.put("socialMaterializationName", vector.getSocialMaterialization().getName());
                }
                
                vectorInfo.put("createdAt", formatDateTime(vector.getCreatedAt()));
                vectorsList.add(vectorInfo);
            }
            response.put("demandVectors", vectorsList);
        }
    }
    
    private void addOptimizationInputsResults(Instance instance, Map<String, Object> response) {
        List<OptimizationInputsResults> optimizationResults = optimizationInputsResultsRepository.findByInstance(instance);
        if (!optimizationResults.isEmpty()) {
            List<Map<String, Object>> resultsList = new ArrayList<>();
            for (OptimizationInputsResults result : optimizationResults) {
                Map<String, Object> resultInfo = new HashMap<>();
                resultInfo.put("id", result.getId());
                resultInfo.put("workerLimit", result.getWorkerLimit());
                resultInfo.put("workerHours", formatBigDecimal(result.getWorkerHours()));
                resultInfo.put("productionTime", formatBigDecimal(result.getProductionTime()));
                resultInfo.put("nightShift", result.getNightShift());
                resultInfo.put("weeklyScale", result.getWeeklyScale());
                resultInfo.put("plannedWeeklyScale", result.getPlannedWeeklyScale());
                resultInfo.put("productionGoal", formatBigDecimal(result.getProductionGoal()));
                resultInfo.put("totalHours", formatBigDecimal(result.getTotalHours()));
                resultInfo.put("workersNeeded", result.getWorkersNeeded());
                resultInfo.put("factoriesNeeded", result.getFactoriesNeeded());
                resultInfo.put("totalShifts", result.getTotalShifts());
                resultInfo.put("minimumProductionTime", formatBigDecimal(result.getMinimumProductionTime()));
                
                // Remover referências ao método ausente
                // resultInfo.put("totalEmploymentPeriod", result.getEmploymentPeriod());
                
                resultInfo.put("plannedFinalDemand", formatBigDecimal(result.getPlannedFinalDemand()));
                
                // Adicionar materialização social, se disponível
                if (result.getSocialMaterialization() != null) {
                    resultInfo.put("socialMaterializationId", result.getSocialMaterialization().getId());
                    resultInfo.put("socialMaterializationName", result.getSocialMaterialization().getName());
                }
                
                resultInfo.put("createdAt", formatDateTime(result.getCreatedAt()));
                resultsList.add(resultInfo);
            }
            response.put("optimizationInputsResults", resultsList);
        }
    }
    
    private void addTechnologicalTensors(Instance instance, Map<String, Object> response) {
        List<TechnologicalTensor> tensors = technologicalTensorRepository.findByInstance(instance);
        if (!tensors.isEmpty()) {
            List<Map<String, Object>> tensorsList = new ArrayList<>();
            for (TechnologicalTensor tensor : tensors) {
                Map<String, Object> tensorInfo = new HashMap<>();
                tensorInfo.put("id", tensor.getId());
                
                // Remover referência ao método ausente
                // tensorInfo.put("coefficient", formatBigDecimal(tensor.getCoefficient()));
                
                // Adicionar materialização social de entrada, se disponível
                if (tensor.getInputSocialMaterialization() != null) {
                    tensorInfo.put("inputSocialMaterializationId", tensor.getInputSocialMaterialization().getId());
                    tensorInfo.put("inputSocialMaterializationName", tensor.getInputSocialMaterialization().getName());
                }
                
                // Adicionar materialização social de saída, se disponível
                if (tensor.getOutputSocialMaterialization() != null) {
                    tensorInfo.put("outputSocialMaterializationId", tensor.getOutputSocialMaterialization().getId());
                    tensorInfo.put("outputSocialMaterializationName", tensor.getOutputSocialMaterialization().getName());
                }
                
                tensorInfo.put("createdAt", formatDateTime(tensor.getCreatedAt()));
                tensorsList.add(tensorInfo);
            }
            response.put("technologicalTensors", tensorsList);
        }
    }
    
    private String formatDateTime(java.time.LocalDateTime dateTime) {
        if (dateTime == null) return null;
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        return dateTime.format(formatter);
    }
    
    private String formatBigDecimal(BigDecimal value) {
        if (value == null) return null;
        return value.toString();
    }
    
    // Sobrecarga para aceitar Integer
    private String formatBigDecimal(Integer value) {
        if (value == null) return null;
        return value.toString();
    }
}