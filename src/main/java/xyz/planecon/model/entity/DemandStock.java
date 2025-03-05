package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "demand_stock")
public class DemandStock {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    @ManyToOne
    @JoinColumn(name = "id_social_materialization", nullable = false)
    private SocialMaterialization socialMaterialization;
    
    @ManyToOne
    @JoinColumn(name = "id_instance", nullable = false)
    private Instance instance;
    
    @Column(name = "demand", nullable = false)
    private BigDecimal demand;
    
    @Column(name = "stock", nullable = false)
    private BigDecimal stock;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
