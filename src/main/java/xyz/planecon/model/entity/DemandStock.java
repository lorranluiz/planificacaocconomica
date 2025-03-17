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
@IdClass(DemandStock.DemandStockId.class)
public class DemandStock {
    
    @Id
    @ManyToOne
    @JoinColumn(name = "id_social_materialization", nullable = false)
    private SocialMaterialization socialMaterialization;
    
    @Id
    @ManyToOne
    @JoinColumn(name = "id_instance", nullable = false)
    private Instance instance;
    
    @Column(name = "demand", nullable = false)
    private BigDecimal demand;
    
    @Column(name = "stock", nullable = false)
    private BigDecimal stock;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Data
    @EqualsAndHashCode
    public static class DemandStockId implements Serializable {
        private static final long serialVersionUID = 1L;
        
        private Integer socialMaterialization; // Deve corresponder ao nome do campo da entidade
        private Integer instance; // Deve corresponder ao nome do campo da entidade
        
        public DemandStockId() {}
        
        public DemandStockId(Integer socialMaterializationId, Integer instanceId) {
            this.socialMaterialization = socialMaterializationId;
            this.instance = instanceId;
        }
    }
}
