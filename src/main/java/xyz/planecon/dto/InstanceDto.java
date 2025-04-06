package xyz.planecon.dto;

import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.enums.InstanceType;
import java.time.LocalDateTime;

public class InstanceDto {
    private Integer id;
    private String name;
    private InstanceType type;
    private LocalDateTime createdAt;
    private String committeeName;
    private Integer workerEffectiveLimit;
    private Double estimatedIndividualParticipationInSocialWork;
    private Double hoursAtElectronicPoint;
    private Integer popularCouncilAssociatedWithCommitteeOrWorker;
    private Integer idAssociatedWorkerResidentsAssociation;
    private String description;
    private Integer parentInstanceId;
    private String parentInstanceName;

    // Construtor padrão
    public InstanceDto() {
    }

    // Construtor básico
    public InstanceDto(Integer id, String name, InstanceType type) {
        this.id = id;
        this.name = name;
        this.type = type;
    }

    // Construtor que aceita uma instância diretamente
    public InstanceDto(Instance instance) {
        if (instance != null) {
            this.id = instance.getId();
            this.name = instance.getCommitteeName(); // Usando committeeName como name
            this.type = instance.getType();
            this.createdAt = instance.getCreatedAt();
            this.committeeName = instance.getCommitteeName();
            this.workerEffectiveLimit = instance.getWorkerEffectiveLimit();

            if (instance.getEstimatedIndividualParticipationInSocialWork() != null) {
                this.estimatedIndividualParticipationInSocialWork =
                    instance.getEstimatedIndividualParticipationInSocialWork().doubleValue();
            }

            if (instance.getHoursAtElectronicPoint() != null) {
                this.hoursAtElectronicPoint =
                    instance.getHoursAtElectronicPoint().doubleValue();
            }

            if (instance.getPopularCouncilAssociatedWithCommitteeOrWorker() != null) {
                this.popularCouncilAssociatedWithCommitteeOrWorker =
                    instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getId();

                // Também definir como parentInstanceId para compatibilidade
                this.parentInstanceId = instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getId();
                this.parentInstanceName = instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getCommitteeName();
            }

            // Correção para o campo idAssociatedWorkerResidentsAssociation que é um objeto Instance
            Instance residentAssociation = instance.getIdAssociatedWorkerResidentsAssociation();
            if (residentAssociation != null) {
                this.idAssociatedWorkerResidentsAssociation = residentAssociation.getId();
            }
        }
    }

    // Construtor completo
    public InstanceDto(Integer id, String name, InstanceType type, LocalDateTime createdAt,
                      String committeeName, Integer workerEffectiveLimit,
                      Double estimatedIndividualParticipationInSocialWork, Double hoursAtElectronicPoint,
                      Integer popularCouncilAssociatedWithCommitteeOrWorker,
                      Integer idAssociatedWorkerResidentsAssociation) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.createdAt = createdAt;
        this.committeeName = committeeName;
        this.workerEffectiveLimit = workerEffectiveLimit;
        this.estimatedIndividualParticipationInSocialWork = estimatedIndividualParticipationInSocialWork;
        this.hoursAtElectronicPoint = hoursAtElectronicPoint;
        this.popularCouncilAssociatedWithCommitteeOrWorker = popularCouncilAssociatedWithCommitteeOrWorker;
        this.idAssociatedWorkerResidentsAssociation = idAssociatedWorkerResidentsAssociation;
    }

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

    public InstanceType getType() {
        return type;
    }

    public void setType(InstanceType type) {
        this.type = type;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getCommitteeName() {
        return committeeName;
    }

    public void setCommitteeName(String committeeName) {
        this.committeeName = committeeName;
    }

    public Integer getWorkerEffectiveLimit() {
        return workerEffectiveLimit;
    }

    public void setWorkerEffectiveLimit(Integer workerEffectiveLimit) {
        this.workerEffectiveLimit = workerEffectiveLimit;
    }

    public Double getEstimatedIndividualParticipationInSocialWork() {
        return estimatedIndividualParticipationInSocialWork;
    }

    public void setEstimatedIndividualParticipationInSocialWork(Double estimatedIndividualParticipationInSocialWork) {
        this.estimatedIndividualParticipationInSocialWork = estimatedIndividualParticipationInSocialWork;
    }

    public Double getHoursAtElectronicPoint() {
        return hoursAtElectronicPoint;
    }

    public void setHoursAtElectronicPoint(Double hoursAtElectronicPoint) {
        this.hoursAtElectronicPoint = hoursAtElectronicPoint;
    }

    public Integer getPopularCouncilAssociatedWithCommitteeOrWorker() {
        return popularCouncilAssociatedWithCommitteeOrWorker;
    }

    public void setPopularCouncilAssociatedWithCommitteeOrWorker(Integer popularCouncilAssociatedWithCommitteeOrWorker) {
        this.popularCouncilAssociatedWithCommitteeOrWorker = popularCouncilAssociatedWithCommitteeOrWorker;
    }

    public Integer getIdAssociatedWorkerResidentsAssociation() {
        return idAssociatedWorkerResidentsAssociation;
    }

    public void setIdAssociatedWorkerResidentsAssociation(Integer idAssociatedWorkerResidentsAssociation) {
        this.idAssociatedWorkerResidentsAssociation = idAssociatedWorkerResidentsAssociation;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getParentInstanceId() {
        return parentInstanceId;
    }

    public void setParentInstanceId(Integer parentInstanceId) {
        this.parentInstanceId = parentInstanceId;
    }

    public String getParentInstanceName() {
        return parentInstanceName;
    }

    public void setParentInstanceName(String parentInstanceName) {
        this.parentInstanceName = parentInstanceName;
    }
}