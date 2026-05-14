package xyz.planecon.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * DTO para representar o estado completo da página de comitê.
 * Contém todos os dados que podem ser editados na página.
 */
public class CommitteeStateDTO {
    
    private Integer id; // ID do comitê
    private String committeeName;
    private BigDecimal producedQuantity;
    private BigDecimal targetQuantity;
    private Integer workerEffectiveLimit;
    private Integer socialMaterializationId;
    private Integer councilId; // ID do conselho associado
    private String councilName; // Nome do conselho associado

    // Dados da proposta de trabalhadores
    private WorkerProposalDTO workerProposal;
    
    // Lista de membros do comitê
    private List<CommitteeMemberDTO> members;
    
    // Materializações sociais (produtos/serviços) associados
    private List<MaterializationStateDTO> materializations;
    
    private Map<String, Object> optimizationData;

    private Long lastCouncilEstimatesSyncedAt;

    private Long lastPlannerEstimatesSyncedAt;

    // Getters e Setters
    
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getCommitteeName() {
        return committeeName;
    }

    public void setCommitteeName(String committeeName) {
        this.committeeName = committeeName;
    }

    public BigDecimal getProducedQuantity() {
        return producedQuantity;
    }

    public void setProducedQuantity(BigDecimal producedQuantity) {
        this.producedQuantity = producedQuantity;
    }

    public BigDecimal getTargetQuantity() {
        return targetQuantity;
    }

    public void setTargetQuantity(BigDecimal targetQuantity) {
        this.targetQuantity = targetQuantity;
    }

    public Integer getWorkerEffectiveLimit() {
        return workerEffectiveLimit;
    }

    public void setWorkerEffectiveLimit(Integer workerEffectiveLimit) {
        this.workerEffectiveLimit = workerEffectiveLimit;
    }

    public Integer getSocialMaterializationId() {
        return socialMaterializationId;
    }

    public void setSocialMaterializationId(Integer socialMaterializationId) {
        this.socialMaterializationId = socialMaterializationId;
    }

    public Integer getCouncilId() {
        return councilId;
    }

    public void setCouncilId(Integer councilId) {
        this.councilId = councilId;
    }

    public String getCouncilName() {
        return councilName;
    }

    public void setCouncilName(String councilName) {
        this.councilName = councilName;
    }

    public WorkerProposalDTO getWorkerProposal() {
        return workerProposal;
    }

    public void setWorkerProposal(WorkerProposalDTO workerProposal) {
        this.workerProposal = workerProposal;
    }

    public List<CommitteeMemberDTO> getMembers() {
        return members;
    }

    public void setMembers(List<CommitteeMemberDTO> members) {
        this.members = members;
    }

    public List<MaterializationStateDTO> getMaterializations() {
        return materializations;
    }

    public void setMaterializations(List<MaterializationStateDTO> materializations) {
        this.materializations = materializations;
    }

    public Map<String, Object> getOptimizationData() {
        return optimizationData;
    }
    
    public void setOptimizationData(Map<String, Object> optimizationData) {
        this.optimizationData = optimizationData;
    }

    public Long getLastCouncilEstimatesSyncedAt() {
        return lastCouncilEstimatesSyncedAt;
    }

    public void setLastCouncilEstimatesSyncedAt(Long lastCouncilEstimatesSyncedAt) {
        this.lastCouncilEstimatesSyncedAt = lastCouncilEstimatesSyncedAt;
    }

    public Long getLastPlannerEstimatesSyncedAt() {
        return lastPlannerEstimatesSyncedAt;
    }

    public void setLastPlannerEstimatesSyncedAt(Long lastPlannerEstimatesSyncedAt) {
        this.lastPlannerEstimatesSyncedAt = lastPlannerEstimatesSyncedAt;
    }

    /**
     * DTO para a proposta de trabalhadores.
     */
    public static class WorkerProposalDTO {
        private Integer workerLimit;
        private BigDecimal workerHours;
        private BigDecimal productionTime;
        private Boolean nightShift;
        private Integer weeklyScale;

        // Campos de "Capacidade Produtiva em Planejamento"
        private Integer planningWorkerLimit;
        private BigDecimal planningWorkerHours;
        private BigDecimal planningProductionTime;
        private Boolean planningNightShift;
        private Integer planningWeeklyScale;

        // Campos de "Capacidade Produtiva Planificada"
        private Integer planifiedWorkerLimit;
        private BigDecimal planifiedWorkerHours;
        private BigDecimal planifiedProductionTime;
        private Boolean planifiedNightShift;
        private Integer planifiedWeeklyScale;

        // Getters e Setters
        public Integer getWorkerLimit() {
            return workerLimit;
        }

        public void setWorkerLimit(Integer workerLimit) {
            this.workerLimit = workerLimit;
        }

        public BigDecimal getWorkerHours() {
            return workerHours;
        }

        public void setWorkerHours(BigDecimal workerHours) {
            this.workerHours = workerHours;
        }

        public BigDecimal getProductionTime() {
            return productionTime;
        }

        public void setProductionTime(BigDecimal productionTime) {
            this.productionTime = productionTime;
        }

        public Boolean getNightShift() {
            return nightShift;
        }

        public void setNightShift(Boolean nightShift) {
            this.nightShift = nightShift;
        }

        public Integer getWeeklyScale() {
            return weeklyScale;
        }

        public void setWeeklyScale(Integer weeklyScale) {
            this.weeklyScale = weeklyScale;
        }

        // Getters/Setters - Planning
        public Integer getPlanningWorkerLimit() { return planningWorkerLimit; }
        public void setPlanningWorkerLimit(Integer planningWorkerLimit) { this.planningWorkerLimit = planningWorkerLimit; }
        public BigDecimal getPlanningWorkerHours() { return planningWorkerHours; }
        public void setPlanningWorkerHours(BigDecimal planningWorkerHours) { this.planningWorkerHours = planningWorkerHours; }
        public BigDecimal getPlanningProductionTime() { return planningProductionTime; }
        public void setPlanningProductionTime(BigDecimal planningProductionTime) { this.planningProductionTime = planningProductionTime; }
        public Boolean getPlanningNightShift() { return planningNightShift; }
        public void setPlanningNightShift(Boolean planningNightShift) { this.planningNightShift = planningNightShift; }
        public Integer getPlanningWeeklyScale() { return planningWeeklyScale; }
        public void setPlanningWeeklyScale(Integer planningWeeklyScale) { this.planningWeeklyScale = planningWeeklyScale; }

        // Getters/Setters - Planified
        public Integer getPlanifiedWorkerLimit() { return planifiedWorkerLimit; }
        public void setPlanifiedWorkerLimit(Integer planifiedWorkerLimit) { this.planifiedWorkerLimit = planifiedWorkerLimit; }
        public BigDecimal getPlanifiedWorkerHours() { return planifiedWorkerHours; }
        public void setPlanifiedWorkerHours(BigDecimal planifiedWorkerHours) { this.planifiedWorkerHours = planifiedWorkerHours; }
        public BigDecimal getPlanifiedProductionTime() { return planifiedProductionTime; }
        public void setPlanifiedProductionTime(BigDecimal planifiedProductionTime) { this.planifiedProductionTime = planifiedProductionTime; }
        public Boolean getPlanifiedNightShift() { return planifiedNightShift; }
        public void setPlanifiedNightShift(Boolean planifiedNightShift) { this.planifiedNightShift = planifiedNightShift; }
        public Integer getPlanifiedWeeklyScale() { return planifiedWeeklyScale; }
        public void setPlanifiedWeeklyScale(Integer planifiedWeeklyScale) { this.planifiedWeeklyScale = planifiedWeeklyScale; }
    }

    /**
     * DTO para membros do comitê.
     */
    public static class CommitteeMemberDTO {
        private Integer id;
        private String name;
        private String username;
        private String type;
        private String pronoun;
        private Boolean isNew;
        private Boolean isDeleted;

        // Getters e Setters
        public Integer getId() {
            return id;
        }

        public void setId(Integer id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public String getPronoun() {
            return pronoun;
        }

        public void setPronoun(String pronoun) {
            this.pronoun = pronoun;
        }

        public Boolean getIsNew() {
            return isNew;
        }

        public void setIsNew(Boolean isNew) {
            this.isNew = isNew;
        }

        public Boolean getIsDeleted() {
            return isDeleted;
        }

        public void setIsDeleted(Boolean isDeleted) {
            this.isDeleted = isDeleted;
        }
    }
    
    /**
     * DTO para o estado das materializações sociais.
     */
    public static class MaterializationStateDTO {
        private Integer id;
        private String name;
        private String type;
        private BigDecimal quantity;
        private BigDecimal demand;
        private BigDecimal stock;
        private Boolean isNew;
        private Boolean isDeleted;
        private Map<String, BigDecimal> technologicalTensors; // ID da materialização de saída -> coeficiente

        // Getters e Setters
        public Integer getId() {
            return id;
        }

        public void setId(Integer id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public BigDecimal getQuantity() {
            return quantity;
        }

        public void setQuantity(BigDecimal quantity) {
            this.quantity = quantity;
        }

        public BigDecimal getDemand() {
            return demand;
        }

        public void setDemand(BigDecimal demand) {
            this.demand = demand;
        }

        public BigDecimal getStock() {
            return stock;
        }

        public void setStock(BigDecimal stock) {
            this.stock = stock;
        }

        public Boolean getIsNew() {
            return isNew;
        }

        public void setIsNew(Boolean isNew) {
            this.isNew = isNew;
        }

        public Boolean getIsDeleted() {
            return isDeleted;
        }

        public void setIsDeleted(Boolean isDeleted) {
            this.isDeleted = isDeleted;
        }

        public Map<String, BigDecimal> getTechnologicalTensors() {
            return technologicalTensors;
        }

        public void setTechnologicalTensors(Map<String, BigDecimal> technologicalTensors) {
            this.technologicalTensors = technologicalTensors;
        }
    }
}
