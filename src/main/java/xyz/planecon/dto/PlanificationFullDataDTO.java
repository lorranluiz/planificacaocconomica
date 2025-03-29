package xyz.planecon.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlanificationFullDataDTO {
    private Integer instanceId;
    private InstanceDTO instance;
    private List<SocialMaterializationDTO> materializations;
    private MatrixData technologicalMatrix;
    private VectorData demandVector;
    private List<OptimizationConfigDTO> optimizationConfigs;
    private PlanificationResultsDTO previousResults;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InstanceDTO {
        private Integer id;
        private String name;
        private String type;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SocialMaterializationDTO {
        private Integer id;
        private String name;
        private String type;
        private Integer sectorId;
        private String sectorName;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatrixData {
        private BigDecimal[][] matrix;
        private String[] productNames;
        private Integer[] productIds;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VectorData {
        private BigDecimal[] vector;
        private String[] productNames;
        private Integer[] productIds;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptimizationConfigDTO {
        private Integer materializationId;
        private String materializationName;
        private Integer workerLimit;
        private BigDecimal workerHours;
        private BigDecimal productionTime;
        private Integer weeklyScale;
        private Boolean nightShift;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlanificationResultsDTO {
        private Double[] productionVector;
        private List<PlanificationResponse.OptimizationResult> optimizationResults;
    }
}
