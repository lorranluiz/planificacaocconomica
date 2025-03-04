package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "workers_proposal")
public class WorkersProposal {
    
    @EmbeddedId
    private WorkersProposalId id;
    
    @ManyToOne
    @JoinColumn(name = "id_instance", insertable = false, updatable = false)
    private Instance instance;
    
    @ManyToOne
    @JoinColumn(name = "id_social_materialization", insertable = false, updatable = false)
    private SocialMaterialization socialMaterialization;
    
    @Column(name = "quantity", precision = 16, scale = 2)
    private BigDecimal quantity;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Data
    @Embeddable
    @EqualsAndHashCode
    public static class WorkersProposalId implements Serializable {
        private static final long serialVersionUID = 1L;
        
        @Column(name = "id_instance")
        private Integer instanceId;
        
        @Column(name = "id_social_materialization")
        private Integer socialMaterializationId;
    }
}
