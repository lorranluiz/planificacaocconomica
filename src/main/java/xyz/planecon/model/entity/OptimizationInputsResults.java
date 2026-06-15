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
    private OptimizationInputsResultsId id = new OptimizationInputsResultsId();
    
    @ManyToOne
    @MapsId("instanceId")
    @JoinColumn(name = "id_instance")
    private Instance instance;
    
    @ManyToOne
    @MapsId("socialMaterializationId")
    @JoinColumn(name = "id_social_materialization")
    private SocialMaterialization socialMaterialization;
    
    @Column(name = "worker_hours", precision = 10, scale = 2, nullable = false)
    private BigDecimal workerHours;
    
    /**
     * Tempo Localmente Necessário para Produzir 1 Unidade (anteriormente chamado de "Tempo para Produzir Uma Unidade").
     * Representa o tempo local de produção de uma unidade da materialização social.
     */
    @Column(name = "production_time", precision = 10, scale = 2, nullable = false)
    private BigDecimal productionTime;

    /**
     * Tempo Socialmente Necessário para Produzir 1 Unidade.
     * Calculado como a soma das proporções temporais dos insumos mais o tempo local de produção de uma unidade.
     */
    @Column(name = "socially_necessary_time_per_unit", precision = 10, scale = 2)
    private BigDecimal sociallyNecessaryTimePerUnit;
    
    @Column(name = "night_shift", nullable = false)
    private Boolean nightShift;
    
    @Column(name = "weekly_scale", nullable = false)
    private Integer weeklyScale;
    
    @Column(name = "planned_weekly_scale", nullable = false)
    private Integer plannedWeeklyScale;
    
    @Column(name = "total_hours", precision = 38, scale = 2, nullable = false)
    private BigDecimal totalHours;
    
    @Column(name = "total_shifts", nullable = false)
    private Integer totalShifts;
    
    @Column(name = "minimum_production_time", precision = 10, scale = 2, nullable = false)
    private BigDecimal minimumProductionTime;
    
    @Column(name = "total_employment_period", nullable = false)
    private Long totalEmploymentPeriodSeconds; // Armazenado em segundos
    
    @Column(name = "planned_final_demand", precision = 38, scale = 6, nullable = false)
    private BigDecimal plannedFinalDemand;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "production_goal", precision = 38, scale = 6, nullable = false)
    private BigDecimal productionGoal;
    
    @Transient
    private Double totalWorkHours;
    
    @Column(name = "workers_needed", nullable = false)
    private Integer workersNeeded;
    
    @Column(name = "factories_needed", nullable = false)
    private Integer factoriesNeeded;
    
    // Novos campos adicionados
    @Column(name = "workers_to_contract", nullable = true)
    private Integer workersToContract;
    
    @Column(name = "current_factories", nullable = true)
    private Integer currentFactories;
    
    @Column(name = "needed_factories_to_build", nullable = true)
    private Integer neededFactoriesToBuild;
    
    @Column(name = "factory_daily_operating_hours", precision = 10, scale = 2, nullable = true)
    private BigDecimal factoryDailyOperatingHours;
    
    @Transient // Adicionar esta anotação
    private Double productionTimeInHours;
    
    @Transient // Adicionar esta anotação
    private Double weeklyWorkingHours;
    
    @Transient // Adicionar esta anotação
    private Double workerHoursPerWeek;
    
    @Transient // Adicionar esta anotação
    private Double factoryOperationHours;
    
    @Column(name = "worker_limit", nullable = false)
    private Integer workerLimit;

    // c_total_i: capacidade produtiva mensal total de todos os comitês desta materialização
    @Column(name = "total_materialization_capacity", precision = 38, scale = 10)
    private BigDecimal totalMaterializationCapacity;

    // CO2 alocado a esta materialização (kg CO2), resultado da planificação
    @Column(name = "co2_allocated", precision = 38, scale = 6)
    private BigDecimal co2Allocated;

    // Preço-sombra do CO2 (horas de trabalho / kg CO2), variável dual da restrição de emissão
    @Column(name = "co2_shadow_price", precision = 20, scale = 10)
    private BigDecimal co2ShadowPrice;

    // Fator de escala do Plano B: scale = co2Limit / leontiefCo2 (1.0 = sem redução)
    @Column(name = "co2_scale_factor", precision = 20, scale = 10)
    private BigDecimal co2ScaleFactor;
    
    @Transient // Adicionar esta anotação
    private Double minimumProductionTimeInDays;
    
    // Métodos Transient para Duration
    @Transient
    public Duration getTotalEmploymentPeriodAsDuration() {
        return totalEmploymentPeriodSeconds != null ? Duration.ofSeconds(totalEmploymentPeriodSeconds) : null;
    }

    public void setTotalEmploymentPeriodFromDuration(Duration duration) {
        this.totalEmploymentPeriodSeconds = duration != null ? duration.getSeconds() : null;
    }
    
    // Métodos auxiliares para configurar o ID
    public void setInstanceId(Integer instanceId) {
        if (this.id == null) this.id = new OptimizationInputsResultsId();
        this.id.setInstanceId(instanceId);
    }
    
    public Integer getInstanceId() {
        return this.id != null ? this.id.getInstanceId() : null;
    }
    
    public void setMaterializationId(Integer materializationId) {
        if (this.id == null) this.id = new OptimizationInputsResultsId();
        this.id.setSocialMaterializationId(materializationId);
    }
    
    public Integer getMaterializationId() {
        return this.id != null ? this.id.getSocialMaterializationId() : null;
    }
    
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
