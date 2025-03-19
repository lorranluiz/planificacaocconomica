package xyz.planecon.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import xyz.planecon.model.entity.Instance; // Adicionar este import

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InstanceDto {
    private Integer id;
    private String name;
    private String description;
    
    // Apenas para mostrar a hierarquia, sem incluir objetos completos
    private Integer parentInstanceId;
    private String parentInstanceName;
    
    // Construtor que recebe uma entidade Instance
    public InstanceDto(Instance instance) {
        this.id = instance.getId();
        
        // Determinar o nome baseado no tipo
        if (instance.getType() != null) {
            switch (instance.getType()) {
                case COMMITTEE:
                    this.name = instance.getCommitteeName() != null ? 
                               instance.getCommitteeName() : "Comitê #" + instance.getId();
                    break;
                case COUNCIL:
                    this.name = "Conselho #" + instance.getId();
                    break;
                case WORKER:
                    this.name = "Worker #" + instance.getId();
                    break;
                default:
                    this.name = "Instância #" + instance.getId();
                    break;
            }
        } else {
            this.name = "Instância #" + instance.getId();
        }
        
        // Gerar descrição
        StringBuilder desc = new StringBuilder();
        if (instance.getType() != null) {
            desc.append("Tipo: ").append(instance.getType());
        }
        if (instance.getCreatedAt() != null) {
            desc.append(desc.length() > 0 ? ", " : "");
            desc.append("Criado em: ").append(instance.getCreatedAt());
        }
        this.description = desc.toString();
        
        // Informações do pai, se existir
        if (instance.getPopularCouncilAssociatedWithPopularCouncil() != null) {
            Instance parent = instance.getPopularCouncilAssociatedWithPopularCouncil();
            this.parentInstanceId = parent.getId();
            
            // Nome do pai
            if (parent.getType() == null) {
                this.parentInstanceName = "Instância #" + parent.getId();
            } else {
                switch (parent.getType()) {
                    case COMMITTEE:
                        this.parentInstanceName = parent.getCommitteeName() != null ? 
                                               parent.getCommitteeName() : "Comitê #" + parent.getId();
                        break;
                    case COUNCIL:
                        this.parentInstanceName = "Conselho #" + parent.getId();
                        break;
                    case WORKER:
                        this.parentInstanceName = "Worker #" + parent.getId();
                        break;
                    default:
                        this.parentInstanceName = "Instância #" + parent.getId();
                        break;
                }
            }
        }
    }
}