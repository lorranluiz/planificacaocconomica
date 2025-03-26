package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "demand_vector")
@Getter
@Setter
@NoArgsConstructor
public class DemandVector {
    
    @EmbeddedId
    private DemandVectorId id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("instanceId")
    @JoinColumn(name = "id_instance", nullable = false)
    private Instance instance;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("socialMaterializationId")
    @JoinColumn(name = "id_social_materialization", nullable = false)
    private SocialMaterialization socialMaterialization;
    
    @Column(name = "demand", nullable = false)
    private BigDecimal demand;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    // Construtor com todos os campos necessários
    public DemandVector(DemandVectorId id, 
                       SocialMaterialization socialMaterialization,
                       Instance instance,
                       BigDecimal demand) {
        this.id = id;
        this.socialMaterialization = socialMaterialization;
        this.instance = instance;
        this.demand = demand;
        this.createdAt = LocalDateTime.now();
    }
    
    // Método de conveniência para criar um objeto DemandVector com ID já definido
    public static DemandVector create(
            SocialMaterialization socialization,
            Instance instance,
            BigDecimal demand) {
        
        DemandVectorId id = new DemandVectorId(
            instance.getId(), 
            socialization.getId()
        );
        
        return new DemandVector(id, socialization, instance, demand);
    }
    
    @Getter
    @Setter
    @Embeddable
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class DemandVectorId implements Serializable {
        private static final long serialVersionUID = 1L;
        
        @Column(name = "id_instance")
        private Integer instanceId;
        
        @Column(name = "id_social_materialization")
        private Integer socialMaterializationId;
        
        @Override
        public String toString() {
            return "DemandVectorId{" +
                   "socialMaterializationId=" + socialMaterializationId +
                   ", instanceId=" + instanceId +
                   '}';
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            DemandVectorId that = (DemandVectorId) o;
            return Objects.equals(instanceId, that.instanceId) &&
                   Objects.equals(socialMaterializationId, that.socialMaterializationId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(instanceId, socialMaterializationId);
        }
    }
}
