package xyz.planecon.dto;

import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.enums.SocialMaterializationType;

public class SocialMaterializationDto {
    private Integer id;
    private String name;
    private String type;
    private Integer sectorId;
    private String sectorName;

    // Default constructor
    public SocialMaterializationDto() {
    }

    // Constructor that takes a SocialMaterialization entity
    public SocialMaterializationDto(SocialMaterialization materialization) {
        this.id = materialization.getId();
        this.name = materialization.getName();
        this.type = materialization.getType().toString();
        
        if (materialization.getSector() != null) {
            this.sectorId = materialization.getSector().getId();
            this.sectorName = materialization.getSector().getName();
        }
    }

    // Getters
    public Integer getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getType() {
        return type;
    }

    public Integer getSectorId() {
        return sectorId;
    }

    public String getSectorName() {
        return sectorName;
    }

    // Setters - adding these for completeness and future flexibility
    public void setId(Integer id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setSectorId(Integer sectorId) {
        this.sectorId = sectorId;
    }

    public void setSectorName(String sectorName) {
        this.sectorName = sectorName;
    }
}