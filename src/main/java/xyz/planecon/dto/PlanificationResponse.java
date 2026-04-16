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
    private Double[] productionVector;  // Vetor de produção calculado
    private List<OptimizationResult> optimizationResults;  // Resultados de otimização
    private Double totalSocialProductionCapacity; // c_total: capacidade produtiva mensal total de todos os comitês
    
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
    }
}
