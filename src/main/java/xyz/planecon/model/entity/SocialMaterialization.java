package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;
import xyz.planecon.model.enums.SocialMaterializationType;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;
import com.fasterxml.jackson.annotation.JsonIdentityInfo;
import com.fasterxml.jackson.annotation.ObjectIdGenerators;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Data
@Entity
@Cacheable
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator.class, property = "id")
@Table(name = "social_materialization")
public class SocialMaterialization {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    @Column(name = "name", length = 100, nullable = false)
    private String name;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private SocialMaterializationType type;
    
    @ManyToOne
    @JoinColumn(name = "id_sector", nullable = false)
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private Sector sector;

    @Column(name = "standard_quantity_per_unit", precision = 16, scale = 6)
    private BigDecimal standardQuantityPerUnit;

    // Validade (para Serviços) / Prazo (para Projetos)
    @Column(name = "validity_deadline", precision = 16, scale = 6)
    private BigDecimal validityDeadline;

    @ManyToOne
    @JoinColumn(name = "id_measurement_unit")
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private MeasurementUnit measurementUnit;
    
    @OneToMany(mappedBy = "socialMaterialization")
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private Set<DemandStock> demandStocks = new HashSet<>();
}
