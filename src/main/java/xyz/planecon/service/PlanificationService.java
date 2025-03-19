package xyz.planecon.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import xyz.planecon.dto.PlanificationRequest;
import xyz.planecon.dto.PlanificationResponse;
import xyz.planecon.dto.PlanificationResponse.OptimizationResult;
import xyz.planecon.util.MatrixOperations;

import java.util.ArrayList;
import java.util.List;

@Service
public class PlanificationService {

    private final OptimizationService optimizationService;

    @Autowired
    public PlanificationService(OptimizationService optimizationService) {
        this.optimizationService = optimizationService;
    }

    /**
     * Executa o processo completo de planificação econômica.
     */
    public PlanificationResponse planify(PlanificationRequest request) {
        Integer instanceId = request.getInstanceId();
        
        // Converter matrizes de Double para double primitivo
        double[][] techMatrix = convertToDoublePrimitive(request.getTechnologicalMatrix());
        double[] demandVector = convertToDoublePrimitive(request.getDemandVector());
        
        // 1. Calcular o vetor de produção usando o modelo de Leontief
        double[] productionVector = MatrixOperations.calculateProductionVector(techMatrix, demandVector);
        
        // 2. Limpar resultados anteriores para esta instância
        optimizationService.clearPreviousResults(instanceId);
        
        // 3. Realizar otimização para cada produto
        List<OptimizationResult> optimizationResults = new ArrayList<>();
        for (int i = 0; i < productionVector.length; i++) {
            // Obter dados para otimização
            Integer materializationId = request.getMaterializationIds()[i];
            String productName = request.getProductNames()[i];
            double productionNeeded = productionVector[i] * 1000; // Ajustar escala (mil unidades)
            
            // Realizar otimização
            OptimizationResult result = optimizationService.performOptimization(
                materializationId, 
                productName, 
                productionNeeded, 
                instanceId
            );
            
            optimizationResults.add(result);
        }
        
        // 4. Converter o vetor de produção para Double[]
        Double[] boxedProductionVector = new Double[productionVector.length];
        for (int i = 0; i < productionVector.length; i++) {
            boxedProductionVector[i] = productionVector[i];
        }
        
        // 5. Retornar resposta completa
        return new PlanificationResponse(
            instanceId,
            boxedProductionVector,
            optimizationResults
        );
    }
    
    /**
     * Converte matriz de Double para double primitivo
     */
    private double[][] convertToDoublePrimitive(Double[][] matrix) {
        double[][] result = new double[matrix.length][matrix[0].length];
        for (int i = 0; i < matrix.length; i++) {
            for (int j = 0; j < matrix[i].length; j++) {
                result[i][j] = matrix[i][j] != null ? matrix[i][j] : 0.0;
            }
        }
        return result;
    }
    
    /**
     * Converte vetor de Double para double primitivo
     */
    private double[] convertToDoublePrimitive(Double[] vector) {
        double[] result = new double[vector.length];
        for (int i = 0; i < vector.length; i++) {
            result[i] = vector[i] != null ? vector[i] : 0.0;
        }
        return result;
    }
}