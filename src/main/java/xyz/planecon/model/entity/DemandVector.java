package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serializable;

@Data
@Entity
@Table(name = "demand_vector")
public class DemandVector {
    @EmbeddedId
    private DemandVectorId id;
    
    @ManyToOne
    @MapsId("instanceId")
    @JoinColumn(name = "id_instance")
    private Instance instance;
    
    @ManyToOne
    @MapsId("socialMaterializationId")
    @JoinColumn(name = "id_social_materialization")
    private SocialMaterialization socialMaterialization;
    
    @Column(name = "value")
    private Double value;
    
    @Data
    @Embeddable
    @EqualsAndHashCode
    public static class DemandVectorId implements Serializable {
        private static final long serialVersionUID = 1L;
        
        @Column(name = "id_instance")
        private Integer instanceId;
        
        @Column(name = "id_social_materialization")
        private Integer socialMaterializationId;
    }
}
