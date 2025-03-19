package xyz.planecon.dto;

import java.time.LocalDateTime;

import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.enums.SocialMaterializationType;

public class SocialMaterializationDto {
    private Integer id;
    private String name;
    private SocialMaterializationType type;
    private LocalDateTime createdAt;
    private Integer sectorId;
    private String sectorName;
    
    public SocialMaterializationDto(SocialMaterialization sm) {
        this.id = sm.getId();
        this.name = sm.getName();
        this.type = sm.getType();
        this.createdAt = sm.getCreatedAt();
        
        // Remover a parte que tenta acessar Instance
        
        if (sm.getSector() != null) {
            this.sectorId = sm.getSector().getId();
            this.sectorName = sm.getSector().getName();
        }
    }
    
    // Remover o getter de instanceId
    
    // Outros getters permanecem iguais
    public Integer getId() {
        return id;
    }
    
    public String getName() {
        return name;
    }
    
    public SocialMaterializationType getType() {
        return type;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public Integer getSectorId() {
        return sectorId;
    }
    
    public String getSectorName() {
        return sectorName;
    }
}