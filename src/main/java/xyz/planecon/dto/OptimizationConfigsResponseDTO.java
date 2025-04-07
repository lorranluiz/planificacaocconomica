package xyz.planecon.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

/**
 * DTO para representar as configurações médias de otimização por materialização
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OptimizationConfigsResponseDTO {

    /**
     * Mapa de configurações de otimização por materialização
     * Key: ID da materialização social
     * Value: Objeto com as configurações médias de otimização
     */
    private Map<Integer, OptimizationConfigDTO> materializationConfigs;
    
    /**
     * DTO para uma configuração de otimização
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptimizationConfigDTO {
        private Integer workerLimit;
        private BigDecimal workerHours;
        private BigDecimal productionTime;
        private Integer weeklyScale;
        private Boolean nightShift;
    }
}
