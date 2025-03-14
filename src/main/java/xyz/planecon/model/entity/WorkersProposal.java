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
    
    @Column(name = "worker_limit", nullable = false)
    private Integer workerLimit;
    
    @Column(name = "worker_hours", nullable = false)
    private BigDecimal workerHours;
    
    @Column(name = "production_time", nullable = false)
    private BigDecimal productionTime;
    
    @Column(name = "night_shift", nullable = false)
    private Boolean nightShift;
    
    @Column(name = "weekly_scale", nullable = false)
    private Integer weeklyScale;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Data
    @Embeddable
    @EqualsAndHashCode
    public static class WorkersProposalId implements Serializable {
        private static final long serialVersionUID = 1L;
        
        @Column(name = "id_instance")
        private Integer instanceId;
    }
}
