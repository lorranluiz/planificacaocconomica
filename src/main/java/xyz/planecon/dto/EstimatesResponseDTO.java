package xyz.planecon.dto;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EstimatesResponseDTO {
    
    /**
     * Matriz tecnológica atualizada com base nas instâncias filhas
     */
    private TechnologicalMatrixDTO technologicalMatrix;
    
    /**
     * Vetor de demanda atualizado com base nas instâncias filhas
     */
    private DemandVectorDTO demandVector;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TechnologicalMatrixDTO {
        private List<List<Double>> matrix;
        private List<String> productNames;
        private List<Integer> productIds;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DemandVectorDTO {
        private List<Double> vector;
        private List<String> productNames;
        private List<Integer> productIds;
    }
}
