package xyz.planecon.dto;

import java.time.LocalDateTime;

import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.enums.SocialMaterializationType;

public class SocialMaterializationDto {
    private Integer id;
    private String name;
    private SocialMaterializationType type;
    private LocalDateTime createdAt;
    
    public SocialMaterializationDto(SocialMaterialization sm) {
        this.id = sm.getId();
        this.name = sm.getName();
        this.type = sm.getType();
        this.createdAt = sm.getCreatedAt();
    }
    
    // Getters
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
}