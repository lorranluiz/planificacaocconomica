package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import xyz.planecon.model.enums.SocialMaterializationType;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Data
@Entity
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
    private Sector sector;
    
    @OneToMany(mappedBy = "socialMaterialization")
    private Set<DemandStock> demandStocks = new HashSet<>();
}
