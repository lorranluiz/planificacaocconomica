package xyz.planecon.dto;

import java.math.BigDecimal;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para a resposta da atualização de demandas e metas
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DemandsAndGoalsResponseDTO {
    
    /**
     * Dados de estoque e demanda atualizados para cada materialização
     * Key: ID da materialização social
     * Value: objeto com os valores de estoque e demanda
     */
    private Map<Integer, StockDemandDTO> stockDemand;
    
    /**
     * Dados de produção e metas atualizados
     */
    private ProductionTargetsDTO productionTargets;
    
    /**
     * DTO para estoque e demanda de uma materialização
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockDemandDTO {
        private BigDecimal stock;
        private BigDecimal demand;
        private BigDecimal balance;
    }
    
    /**
     * DTO para produção e metas
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductionTargetsDTO {
        private BigDecimal producedQuantity;
        private BigDecimal targetQuantity;
        private BigDecimal remainingQuantity;
    }
}
