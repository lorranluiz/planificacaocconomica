package xyz.planecon.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.enums.InstanceType;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InstanceDto {
    private Integer id;
    private String committeeName;
    private InstanceType type;
    private Integer workerEffectiveLimit;
    private Integer popularCouncilId;
    private LocalDateTime createdAt;
    
    // Campos adicionais para instâncias do tipo WORKER
    private Integer associatedWorkerCommitteeId;
    private Integer associatedWorkerResidentsAssociationId;
    private BigDecimal estimatedIndividualParticipationInSocialWork;
    private BigDecimal hoursAtElectronicPoint;
    
    // Campos adicionais para instâncias do tipo COMMITTEE
    private Integer socialMaterializationId;
    private String socialMaterializationName;
    private BigDecimal producedQuantity;
    private BigDecimal targetQuantity;
    
    public static InstanceDto fromEntity(Instance instance) {
        InstanceDto dto = new InstanceDto();
        dto.setId(instance.getId());
        dto.setCommitteeName(instance.getCommitteeName());
        dto.setType(instance.getType());
        dto.setCreatedAt(instance.getCreatedAt());
        dto.setWorkerEffectiveLimit(instance.getWorkerEffectiveLimit());
        
        // Para evitar referência circular, armazenamos apenas o ID
        if (instance.getPopularCouncilAssociatedWithCommitteeOrWorker() != null) {
            dto.setPopularCouncilId(instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getId());
        } else if (instance.getPopularCouncilAssociatedWithPopularCouncil() != null) {
            dto.setPopularCouncilId(instance.getPopularCouncilAssociatedWithPopularCouncil().getId());
        }
        
        // Campos específicos para WORKER
        if (instance.getType() == InstanceType.WORKER) {
            if (instance.getAssociatedWorkerCommittee() != null) {
                dto.setAssociatedWorkerCommitteeId(instance.getAssociatedWorkerCommittee().getId());
            }
            
            // Não usar métodos get inexistentes
            // Vamos deixar para o controller definir esse valor usando SQL nativo
            
            dto.setEstimatedIndividualParticipationInSocialWork(
                instance.getEstimatedIndividualParticipationInSocialWork());
            dto.setHoursAtElectronicPoint(instance.getHoursAtElectronicPoint());
        }
        
        // Campos específicos para COMMITTEE
        if (instance.getType() == InstanceType.COMMITTEE) {
            if (instance.getSocialMaterialization() != null) {
                dto.setSocialMaterializationId(instance.getSocialMaterialization().getId());
                dto.setSocialMaterializationName(instance.getSocialMaterialization().getName());
            }
            dto.setProducedQuantity(instance.getProducedQuantity());
            dto.setTargetQuantity(instance.getTargetQuantity());
        }
        
        return dto;
    }
}