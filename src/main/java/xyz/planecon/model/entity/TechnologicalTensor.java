package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "technological_tensor")
@NoArgsConstructor
@AllArgsConstructor
public class TechnologicalTensor {
    
    @EmbeddedId
    private TechnologicalTensorId id;
    
    @ManyToOne
    @MapsId("inputSocialMaterializationId")
    @JoinColumn(name = "id_production_input", nullable = false)
    private SocialMaterialization inputSocialMaterialization;
    
    @ManyToOne
    @MapsId("outputSocialMaterializationId")
    @JoinColumn(name = "id_social_materialization", nullable = false)
    private SocialMaterialization outputSocialMaterialization;
    
    @Column(name = "technical_coefficient_element_value", nullable = false)
    private BigDecimal technicalCoefficientElementValue;

    @ManyToOne
    @JoinColumn(name = "id_instance", nullable = false)
    private Instance instance;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Data
    @Embeddable
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TechnologicalTensorId implements Serializable {
        private static final long serialVersionUID = 1L;
        
        @Column(name = "id_production_input")
        private Integer inputSocialMaterializationId;
        
        @Column(name = "id_social_materialization")
        private Integer outputSocialMaterializationId;
    }
}
