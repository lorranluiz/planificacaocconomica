package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "demand_stock")
public class DemandStock {
    @EmbeddedId
    private DemandStockId id;
    
    @ManyToOne
    @MapsId("instanceId")
    @JoinColumn(name = "id_instance")
    private Instance instance;
    
    @ManyToOne
    @MapsId("socialMaterializationId")
    @JoinColumn(name = "id_social_materialization")
    private SocialMaterialization socialMaterialization;
    
    @Column(name = "stock", nullable = false, precision = 16, scale = 6)
    private BigDecimal stock;
    
    @Column(name = "demand", nullable = false, precision = 16, scale = 6)
    private BigDecimal demand;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Data
    @Embeddable
    @EqualsAndHashCode
    public static class DemandStockId implements Serializable {
        private static final long serialVersionUID = 1L;
        
        @Column(name = "id_instance")
        private Integer instanceId;
        
        @Column(name = "id_social_materialization")
        private Integer socialMaterializationId;
    }
}
