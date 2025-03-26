package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "technological_tensor")
@Getter
@Setter
@NoArgsConstructor
public class TechnologicalTensor {
    
    @EmbeddedId
    private TechnologicalTensorId id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("inputSocialMaterializationId")
    @JoinColumn(name = "id_production_input", nullable = false)
    private SocialMaterialization inputSocialMaterialization;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("outputSocialMaterializationId")
    @JoinColumn(name = "id_social_materialization", nullable = false)
    private SocialMaterialization outputSocialMaterialization;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("instanceId")  // Adicionando o mapeamento do instanceId da chave primária
    @JoinColumn(name = "id_instance", nullable = false)
    private Instance instance;

    @Column(name = "technical_coefficient_element_value", nullable = false)
    private BigDecimal technicalCoefficientElementValue;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    // Método getter para acessar o coeficiente
    public BigDecimal getCoefficient() {
        return technicalCoefficientElementValue;
    }
    
    // Construtor com todos os campos
    public TechnologicalTensor(TechnologicalTensorId id, 
                              SocialMaterialization inputSocialMaterialization,
                              SocialMaterialization outputSocialMaterialization,
                              BigDecimal technicalCoefficientElementValue,
                              Instance instance, 
                              LocalDateTime createdAt) {
        this.id = id;
        this.inputSocialMaterialization = inputSocialMaterialization;
        this.outputSocialMaterialization = outputSocialMaterialization;
        this.technicalCoefficientElementValue = technicalCoefficientElementValue;
        this.instance = instance;
        this.createdAt = createdAt;
    }
    
    // Método de conveniência para criar um tensor
    public static TechnologicalTensor create(
            SocialMaterialization input, 
            SocialMaterialization output,
            BigDecimal coefficient,
            Instance instance) {
        
        TechnologicalTensorId id = new TechnologicalTensorId(
            instance.getId(),
            input.getId(),
            output.getId()
        );
        
        return new TechnologicalTensor(
            id,
            input,
            output,
            coefficient,
            instance,
            LocalDateTime.now()
        );
    }
    
    @Getter
    @Setter
    @Embeddable
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TechnologicalTensorId implements Serializable {
        private static final long serialVersionUID = 1L;
        
        @Column(name = "id_instance")
        private Integer instanceId;
        
        @Column(name = "id_production_input")
        private Integer inputSocialMaterializationId;
        
        @Column(name = "id_social_materialization")
        private Integer outputSocialMaterializationId;
        
        // Construtor adicional sem o instanceId para compatibilidade com código existente
        public TechnologicalTensorId(Integer inputId, Integer outputId) {
            this.inputSocialMaterializationId = inputId;
            this.outputSocialMaterializationId = outputId;
        }
        
        // Importante implementar equals e hashCode para chaves compostas
        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            TechnologicalTensorId that = (TechnologicalTensorId) o;
            return Objects.equals(instanceId, that.instanceId) &&
                   Objects.equals(inputSocialMaterializationId, that.inputSocialMaterializationId) &&
                   Objects.equals(outputSocialMaterializationId, that.outputSocialMaterializationId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(instanceId, inputSocialMaterializationId, outputSocialMaterializationId);
        }
    }
}
