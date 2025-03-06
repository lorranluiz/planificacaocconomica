package xyz.planecon.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class TechnologicalTensorId implements Serializable {
    private static final long serialVersionUID = 1L;
    
    @Column(name = "id_production_input")
    private Integer inputSocialMaterializationId;
    
    @Column(name = "id_social_materialization")
    private Integer outputSocialMaterializationId;
}