package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.EqualsAndHashCode;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "optimization_inputs_results")
@NoArgsConstructor
@AllArgsConstructor
public class OptimizationInputsResults {
    @EmbeddedId
    private OptimizationInputsResultsId id;
    
    @ManyToOne
    @MapsId("instanceId")
    @JoinColumn(name = "id_instance")
    private Instance instance;
    
    @ManyToOne
    @MapsId("socialMaterializationId")
    @JoinColumn(name = "id_social_materialization")
    private SocialMaterialization socialMaterialization;
    
    @Column(name = "worker_limit", nullable = false)
    private Integer workerLimit;
    
    @Column(name = "worker_hours", precision = 10, scale = 2, nullable = false)
    private BigDecimal workerHours;
    
    @Column(name = "production_time", precision = 10, scale = 2, nullable = false)
    private BigDecimal productionTime;
    
    @Column(name = "night_shift", nullable = false)
    private Boolean nightShift;
    
    @Column(name = "weekly_scale", nullable = false)
    private Integer weeklyScale;
    
    @Column(name = "planned_weekly_scale", nullable = false)
    private Integer plannedWeeklyScale;
    
    @Column(name = "production_goal", precision = 16, scale = 6, nullable = false)
    private BigDecimal productionGoal;
    
    @Column(name = "total_hours", precision = 16, scale = 10, nullable = false)
    private BigDecimal totalHours;
    
    @Column(name = "workers_needed", nullable = false)
    private Integer workersNeeded;
    
    @Column(name = "factories_needed", nullable = false)
    private Integer factoriesNeeded;
    
    @Column(name = "total_shifts", nullable = false)
    private Integer totalShifts;
    
    @Column(name = "minimum_production_time", precision = 10, scale = 2, nullable = false)
    private BigDecimal minimumProductionTime;
    
    // Modificar o tipo do campo
    @Column(name = "total_employment_period", nullable = false)
    private Long totalEmploymentPeriodSeconds; // Armazenado em segundos
    
    // Métodos helper para converter de/para Duration (opcionais)
    @Transient // Não será persistido no banco
    public Duration getTotalEmploymentPeriodAsDuration() {
        return totalEmploymentPeriodSeconds != null ? Duration.ofSeconds(totalEmploymentPeriodSeconds) : null;
    }

    public void setTotalEmploymentPeriodFromDuration(Duration duration) {
        this.totalEmploymentPeriodSeconds = duration != null ? duration.getSeconds() : null;
    }
    
    @Column(name = "planned_final_demand", precision = 16, scale = 6, nullable = false)
    private BigDecimal plannedFinalDemand;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Data
    @Embeddable
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class OptimizationInputsResultsId implements Serializable {
        private static final long serialVersionUID = 1L;
        
        @Column(name = "id_instance")
        private Integer instanceId;
        
        @Column(name = "id_social_materialization")
        private Integer socialMaterializationId;
    }
}
