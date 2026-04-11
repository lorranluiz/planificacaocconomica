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

    /**
     * DTO para a proposta de trabalhadores.
     */
    public static class WorkerProposalDTO {
        private Integer workerLimit;
        private BigDecimal workerHours;
        private BigDecimal productionTime;
        private Boolean nightShift;
        private Integer weeklyScale;

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
