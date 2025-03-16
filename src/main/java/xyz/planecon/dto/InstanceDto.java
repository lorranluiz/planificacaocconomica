package xyz.planecon.dto;

import java.time.LocalDateTime;

import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.enums.InstanceType;

public class InstanceDto {
    private Integer id;
    private String name;
    private InstanceType type;
    private LocalDateTime createdAt;
    
    public InstanceDto(Instance instance) {
        this.id = instance.getId();
        
        // Tratamento para quando committeeName for nulo
        if (instance.getCommitteeName() != null && !instance.getCommitteeName().isEmpty()) {
            this.name = instance.getCommitteeName();
        } else {
            // Nome padrão baseado no tipo e ID
            this.name = instance.getType() + " #" + instance.getId();
        }
        
        this.type = instance.getType();
        this.createdAt = instance.getCreatedAt();
    }
    
    // Getters
    public Integer getId() {
        return id;
    }
    
    public String getName() {
        return name;
    }
    
    public InstanceType getType() {
        return type;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}