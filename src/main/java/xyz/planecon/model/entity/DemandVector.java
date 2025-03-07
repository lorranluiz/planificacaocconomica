package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "demand_vector")
@NoArgsConstructor
@AllArgsConstructor
@IdClass(DemandVector.DemandVectorId.class)
public class DemandVector {
    
    @Id
    @ManyToOne
    @JoinColumn(name = "id_social_materialization")
    private SocialMaterialization socialMaterialization;
    
    @Id
    @ManyToOne
    @JoinColumn(name = "id_instance")
    private Instance instance;
    
    @Column(name = "demand")
    private BigDecimal demand;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DemandVectorId implements Serializable {
        private static final long serialVersionUID = 1L;
        
        // Estes nomes devem corresponder aos da classe principal
        // O tipo deve ser o mesmo da chave primária da entidade associada
        private SocialMaterialization socialMaterialization; // Não Integer
        private Instance instance; // Não Integer
    }
}
