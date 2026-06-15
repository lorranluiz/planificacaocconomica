package xyz.planecon.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlanificationResponse {
    private Integer instanceId;
    private Double[] productionVector;
    private List<OptimizationResult> optimizationResults;
    private Double totalSocialProductionCapacity;
    private String[] productNames;
    private Integer[] productIds;
    private Double totalCo2Emissions;
    private Double co2Limit;
    private Boolean co2ConstraintBinding;
    private String optimizationFallbackReason; // null=LP OK, "LP_INFEASIBLE", "NO_CO2_CONSTRAINT"
    
    public PlanificationResponse(Integer instanceId, Double[] productionVector, List<OptimizationResult> optimizationResults) {
        this.instanceId = instanceId;
        this.productionVector = productionVector;
        this.optimizationResults = optimizationResults;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptimizationResult {
        private Integer materializationId;
        private String productName;
        private Double productionNeeded;  // Produção necessária calculada
        private Double totalHours;        // Total de horas necessárias
        private Double workersNeeded;     // Trabalhadores necessários
        private Double factoriesNeeded;   // Fábricas necessárias
        
        // Armazenar os parâmetros da otimização
        private Double productionTime;    // Tempo para produzir uma unidade
        private Double weeklyScale;       // Escala de trabalho semanal
        private Double workerHours;       // Horas de trabalho por trabalhador
        private Double factoryOperationHours; // Horas de operação da fábrica
        private Integer workerLimit;      // Limite de trabalhadores por fábrica
        private Double minimumProductionTimeInDays; // Tempo mínimo de produção em dias
        private Boolean nightShift;       // Indica se usa turno noturno
        private Integer committeeCount;   // Número real de comitês (fábricas) existentes
        private Double totalMaterializationCapacity; // c_total_i: capacidade produtiva mensal total desta materialização

        // Campos de CO2
        private Double co2EmissionFactor;   // Fator de emissão (kg CO2/unidade)
        private Double co2Allocated;        // CO2 alocado a este produto (kg)
        private Double co2ShadowPrice;      // Preço-sombra do CO2 (horas/kg CO2)

        // Plano B (LP com slack) — valores ajustados quando a restrição de CO2 força redução de demanda
        private Double originalDemand;          // Demanda original y_i
        private Double originalProductionNeeded; // Produção original do Leontief (antes do ajuste), em unidades
        private Double adjustedProductionNeeded; // Produção ajustada x_i (LP relaxado, em unidades)
        private Double adjustedDemand;           // Demanda ajustada y_i - s_i
    }
}
