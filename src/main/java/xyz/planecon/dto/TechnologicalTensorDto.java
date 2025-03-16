package xyz.planecon.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import xyz.planecon.model.entity.TechnologicalTensor;

public class TechnologicalTensorDto {
    private Integer inputSocialMaterializationId;
    private Integer outputSocialMaterializationId;
    private String inputSocialMaterializationName;
    private String outputSocialMaterializationName;
    
    @JsonSerialize(using = ToStringSerializer.class)
    private BigDecimal technicalCoefficientElementValue;
    
    private InstanceDto instance;
    private LocalDateTime createdAt;
    
    public TechnologicalTensorDto(TechnologicalTensor tensor) {
        this.inputSocialMaterializationId = tensor.getId().getInputSocialMaterializationId();
        this.outputSocialMaterializationId = tensor.getId().getOutputSocialMaterializationId();
        this.inputSocialMaterializationName = tensor.getInputSocialMaterialization().getName();
        this.outputSocialMaterializationName = tensor.getOutputSocialMaterialization().getName();
        this.technicalCoefficientElementValue = tensor.getTechnicalCoefficientElementValue();
        this.instance = new InstanceDto(tensor.getInstance());
        this.createdAt = tensor.getCreatedAt();
    }
    
    // Getters
    public Integer getInputSocialMaterializationId() {
        return inputSocialMaterializationId;
    }
    
    public Integer getOutputSocialMaterializationId() {
        return outputSocialMaterializationId;
    }
    
    public String getInputSocialMaterializationName() {
        return inputSocialMaterializationName;
    }
    
    public String getOutputSocialMaterializationName() {
        return outputSocialMaterializationName;
    }
    
    public BigDecimal getTechnicalCoefficientElementValue() {
        return technicalCoefficientElementValue;
    }
    
    public InstanceDto getInstance() {
        return instance;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}