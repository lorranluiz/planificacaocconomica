package xyz.planecon.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.enums.SocialMaterializationType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class SocialMaterializationDto {
    private Integer id;
    private String name;
    private String type;
    private LocalDateTime createdAt;
    private Integer sectorId;
    private String sectorName;
    private SectorRef sector;
    private Integer measurementUnitId;
    private String measurementUnitName;
    private BigDecimal standardQuantityPerUnit;

    // Default constructor
    public SocialMaterializationDto() {
    }

    // Constructor that takes a SocialMaterialization entity
    public SocialMaterializationDto(SocialMaterialization materialization) {
        this(materialization, false);
    }

    public SocialMaterializationDto(SocialMaterialization materialization, boolean includeExtendedFields) {
        this.id = materialization.getId();
        this.name = materialization.getName();
        this.type = materialization.getType().toString();
        
        if (materialization.getSector() != null) {
            this.sectorId = materialization.getSector().getId();
            this.sectorName = materialization.getSector().getName();
        }

        if (includeExtendedFields) {
            this.createdAt = materialization.getCreatedAt();
            if (materialization.getSector() != null) {
                this.sector = new SectorRef(this.sectorId, this.sectorName);
            }
            this.standardQuantityPerUnit = materialization.getStandardQuantityPerUnit();
            if (materialization.getMeasurementUnit() != null) {
                this.measurementUnitId = materialization.getMeasurementUnit().getId();
                this.measurementUnitName = materialization.getMeasurementUnit().getName();
            }
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public Integer getSectorId() {
        return sectorId;
    }

    public String getSectorName() {
        return sectorName;
    }

    public SectorRef getSector() {
        return sector;
    }

    public Integer getMeasurementUnitId() {
        return measurementUnitId;
    }

    public String getMeasurementUnitName() {
        return measurementUnitName;
    }

    public BigDecimal getStandardQuantityPerUnit() {
        return standardQuantityPerUnit;
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

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setSectorId(Integer sectorId) {
        this.sectorId = sectorId;
    }

    public void setSectorName(String sectorName) {
        this.sectorName = sectorName;
    }

    public void setSector(SectorRef sector) {
        this.sector = sector;
    }

    public void setMeasurementUnitId(Integer measurementUnitId) {
        this.measurementUnitId = measurementUnitId;
    }

    public void setMeasurementUnitName(String measurementUnitName) {
        this.measurementUnitName = measurementUnitName;
    }

    public void setStandardQuantityPerUnit(BigDecimal standardQuantityPerUnit) {
        this.standardQuantityPerUnit = standardQuantityPerUnit;
    }

    public static class SectorRef {
        private Integer id;
        private String name;

        public SectorRef() {
        }

        public SectorRef(Integer id, String name) {
            this.id = id;
            this.name = name;
        }

        public Integer getId() {
            return id;
        }

        public void setId(Integer id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }
}