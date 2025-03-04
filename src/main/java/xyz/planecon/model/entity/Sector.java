package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.util.HashSet;
import java.util.Set;

@Data
@Entity
@Table(name = "sector")
public class Sector {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    @Column(name = "name", length = 100, nullable = false)
    private String name;
    
    @OneToMany(mappedBy = "sector")
    private Set<SocialMaterialization> socialMaterializations = new HashSet<>();
}
