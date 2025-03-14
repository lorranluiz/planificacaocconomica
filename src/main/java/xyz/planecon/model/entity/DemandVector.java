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
@Table(name = "demand_vector")
@NoArgsConstructor
@AllArgsConstructor
@IdClass(DemandVector.DemandVectorId.class)
public class DemandVector {
    
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

    // Adicionar o campo createdAt
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DemandVectorId implements Serializable {
        private static final long serialVersionUID = 1L;
        
        private Integer socialMaterialization;
        private Integer instance;
    }
}
