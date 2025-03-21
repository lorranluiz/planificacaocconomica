package xyz.planecon.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import xyz.planecon.dto.PlanificationRequest;
import xyz.planecon.dto.PlanificationResponse;
import xyz.planecon.dto.PlanificationResponse.OptimizationResult;
import xyz.planecon.model.entity.OptimizationInputsResults;
import xyz.planecon.repository.OptimizationInputsResultsRepository;
import xyz.planecon.util.MatrixOperations;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PlanificationService {

    private final OptimizationService optimizationService;
    private final OptimizationInputsResultsRepository optimizationRepository;
    private static final Logger logger = LoggerFactory.getLogger(PlanificationService.class);

    @Autowired
    public PlanificationService(
        OptimizationService optimizationService,
        OptimizationInputsResultsRepository optimizationRepository) {
        this.optimizationService = optimizationService;
        this.optimizationRepository = optimizationRepository;
    }

    /**
     * Executa o processo completo de planificação econômica.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PlanificationResponse planify(PlanificationRequest request) {
        Integer instanceId = request.getInstanceId();
        
        // Não limpar resultados anteriores para preservar configurações do usuário
        // Remova a linha: optimizationService.clearPreviousResults(instanceId);
        
        // Converter matrizes de Double para double primitivo
        double[][] techMatrix = convertToDoublePrimitive(request.getTechnologicalMatrix());
        double[] demandVector = convertToDoublePrimitive(request.getDemandVector());
        
        // Calcular o vetor de produção usando o modelo de Leontief
        double[] productionVector = MatrixOperations.calculateProductionVector(techMatrix, demandVector);
        
        // Carregar configurações existentes para usar nos cálculos de otimização
        Map<Integer, OptimizationInputsResults> existingConfigs = new HashMap<>();
        List<OptimizationInputsResults> configs = optimizationRepository.findById_InstanceId(instanceId);
        
        for (OptimizationInputsResults config : configs) {
            existingConfigs.put(config.getId().getSocialMaterializationId(), config);
        }
        
        // Realizar otimização para cada produto
        List<OptimizationResult> optimizationResults = new ArrayList<>();
        for (int i = 0; i < productionVector.length; i++) {
            try {
                // Obter dados para otimização
                Integer materializationId = request.getMaterializationIds()[i];
                String productName = request.getProductNames()[i];
                double productionNeeded = productionVector[i] * 1000; // Ajustar escala (mil unidades)
                
                // Verificar se já existe uma configuração para esta materialização
                OptimizationResult result;
                
                if (existingConfigs.containsKey(materializationId)) {
                    // Usar configuração existente para a otimização
                    OptimizationInputsResults existingConfig = existingConfigs.get(materializationId);
                    
                    // Realizar otimização COM a configuração existente
                    result = optimizationService.performOptimization(
                        materializationId, 
                        productName, 
                        productionNeeded, 
                        instanceId,
                        existingConfig
                    );
                } else {
                    // Criar uma configuração padrão nova
                    result = optimizationService.performOptimization(
                        materializationId, 
                        productName, 
                        productionNeeded, 
                        instanceId
                    );
                }
                
                optimizationResults.add(result);
            } catch (Exception e) {
                logger.error("Erro ao processar otimização para produto {}: {}", i, e.getMessage(), e);
                // Adicionar um resultado vazio para manter a ordem
                optimizationResults.add(createEmptyOptimizationResult(
                    request.getMaterializationIds()[i],
                    request.getProductNames()[i],
                    productionVector[i] * 1000
                ));
            }
        }
        
        // Converter o vetor de produção para Double[]
        Double[] boxedProductionVector = new Double[productionVector.length];
        for (int i = 0; i < productionVector.length; i++) {
            boxedProductionVector[i] = productionVector[i];
        }
        
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

    // Método auxiliar para criar um resultado de otimização vazio
    private OptimizationResult createEmptyOptimizationResult(Integer materializationId, String productName, double productionNeeded) {
        return new OptimizationResult(
            materializationId,
            productName,
            productionNeeded,
            0.0,  // totalHours
            0.0,  // workersNeeded
            0.0,  // factoriesNeeded
            0.0,  // productionTime
            0.0,  // weeklyScale
            0.0,  // workerHours
            0.0,  // factoryOperationHours
            0,    // workerLimit
            0.0   // minimumProductionTimeInDays
        );
    }
}