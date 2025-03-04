package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serializable;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "technological_tensor")
public class TechnologicalTensor {
    @EmbeddedId
    private TechnologicalTensorId id;
    
    @ManyToOne
    @JoinColumn(name = "id_instance", insertable = false, updatable = false)
    private Instance instance;
    
    @ManyToOne
    @JoinColumn(name = "id_production_input", insertable = false, updatable = false)
    private SocialMaterialization productionInput;
    
    @ManyToOne
    @JoinColumn(name = "id_production_output", insertable = false, updatable = false)
    private SocialMaterialization productionOutput;
    
    @Column(name = "value", precision = 16, scale = 6)
    private BigDecimal value;
    
    @Data
    @Embeddable
    @EqualsAndHashCode
    public static class TechnologicalTensorId implements Serializable {
        private static final long serialVersionUID = 1L;
        
        @Column(name = "id_instance")
        private Integer instanceId;
        
        @Column(name = "id_production_input")
        private Integer productionInputId;
        
        @Column(name = "id_production_output")
        private Integer productionOutputId;
    }
}
