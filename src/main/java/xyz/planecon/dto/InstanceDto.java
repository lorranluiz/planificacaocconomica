package xyz.planecon.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.model.entity.Instance;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstanceDto {
    private Integer id;
    private String name;
    private InstanceType type;
    private LocalDateTime createdAt;
    private String committeeName;
    private Integer workerEffectiveLimit;
    private Double estimatedIndividualParticipationInSocialWork;
    private Double hoursAtElectronicPoint;
    private Double sociallyConfirmedWorkTime;
    private Integer associatedWorkerCommitteeId;
    private String associatedWorkerCommitteeName;
    private Integer popularCouncilAssociatedWithCommitteeOrWorker;
    private Integer idAssociatedWorkerResidentsAssociation;
    private String description;
    private Integer parentInstanceId;
    private String parentInstanceName;
    
    /**
     * Construtor que converte um objeto Instance em InstanceDto
     * 
     * @param instance A entidade Instance a ser convertida
     */
    public InstanceDto(Instance instance) {
        if (instance == null) return;
        
        this.id = instance.getId();
        this.type = instance.getType();
        this.createdAt = instance.getCreatedAt();
        this.committeeName = instance.getCommitteeName();
        this.workerEffectiveLimit = instance.getWorkerEffectiveLimit();
        
        // Corrigido: converter BigDecimal para Double usando doubleValue()
        if (instance.getEstimatedIndividualParticipationInSocialWork() != null) {
            this.estimatedIndividualParticipationInSocialWork = 
                instance.getEstimatedIndividualParticipationInSocialWork().doubleValue();
        }
        
        if (instance.getHoursAtElectronicPoint() != null) {
            this.hoursAtElectronicPoint = instance.getHoursAtElectronicPoint().doubleValue();
        }

        if (instance.getSociallyConfirmedWorkTime() != null) {
            this.sociallyConfirmedWorkTime = instance.getSociallyConfirmedWorkTime().doubleValue();
        }
        
        // Removido acesso a método inexistente getDescription()
        // Podemos usar outro campo caso necessário, ou deixar como null
        this.description = null; // Remova esta linha se não precisar do campo description
        
        // Definir nome apropriado com base no tipo
        if (instance.getType() == InstanceType.COMMITTEE) {
            this.name = instance.getCommitteeName();
        } else if (instance.getType() == InstanceType.POPULARCOUNCIL) {
            this.name = instance.getCommitteeName() != null ? instance.getCommitteeName() : "Conselho #" + instance.getId();
        } else {
            // Caso seja um trabalhador ou outro tipo, usar nome padrão
            this.name = "Instância #" + instance.getId();
        }
        
        // Mapear relacionamentos para IDs
        if (instance.getPopularCouncilAssociatedWithCommitteeOrWorker() != null) {
            this.popularCouncilAssociatedWithCommitteeOrWorker = instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getId();
            this.parentInstanceId = instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getId();
            this.parentInstanceName = instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getCommitteeName();
        }
        
        // Corrigido: Extrair o ID da instância associada, assumindo que getIdAssociatedWorkerResidentsAssociation retorna uma instância
        if (instance.getIdAssociatedWorkerResidentsAssociation() != null) {
            this.idAssociatedWorkerResidentsAssociation = instance.getIdAssociatedWorkerResidentsAssociation().getId();
        }

        if (instance.getAssociatedWorkerCommittee() != null) {
            this.associatedWorkerCommitteeId = instance.getAssociatedWorkerCommittee().getId();
            this.associatedWorkerCommitteeName = instance.getAssociatedWorkerCommittee().getCommitteeName();
        }
    }
}