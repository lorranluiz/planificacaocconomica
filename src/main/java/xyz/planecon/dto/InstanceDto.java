package xyz.planecon.dto;

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
    
    public static InstanceDto fromEntity(Instance instance) {
        InstanceDto dto = new InstanceDto();
        dto.setId(instance.getId());
        dto.setCommitteeName(instance.getCommitteeName());
        dto.setType(instance.getType());
        dto.setWorkerEffectiveLimit(instance.getWorkerEffectiveLimit());
        
        // Para evitar referência circular, armazenamos apenas o ID
        if (instance.getPopularCouncilAssociatedWithPopularCouncil() != null) {
            dto.setPopularCouncilId(instance.getPopularCouncilAssociatedWithPopularCouncil().getId());
        }
        
        return dto;
    }
}