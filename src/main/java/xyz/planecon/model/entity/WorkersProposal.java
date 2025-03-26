package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

@Data
@Entity
@Table(name = "workers_proposal")
public class WorkersProposal {
    
    @EmbeddedId
    private WorkersProposalId id;
    
    @ManyToOne
    @MapsId("instanceId")
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
        
        // Construtor padrão sem argumentos - NECESSÁRIO para JPA
        public WorkersProposalId() {
        }
        
        // Construtor com instanceId
        public WorkersProposalId(Integer instanceId) {
            this.instanceId = instanceId;
        }
        
        // Métodos equals e hashCode
        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            WorkersProposalId that = (WorkersProposalId) o;
            return Objects.equals(instanceId, that.instanceId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(instanceId);
        }
    }
}
