package xyz.planecon.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import xyz.planecon.dto.PlanificationResponse.OptimizationResult;
import xyz.planecon.model.entity.OptimizationInputsResults;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.repository.OptimizationInputsResultsRepository;
import xyz.planecon.repository.SocialMaterializationRepository;

import java.math.BigDecimal;
import java.util.Optional;

@Service
public class OptimizationService {

    private final OptimizationInputsResultsRepository optimizationRepository;
    private final SocialMaterializationRepository materializationRepository;

    @Autowired
    public OptimizationService(OptimizationInputsResultsRepository optimizationRepository,
                              SocialMaterializationRepository materializationRepository) {
        this.optimizationRepository = optimizationRepository;
        this.materializationRepository = materializationRepository;
    }

    /**
     * Realiza a otimização de produção para um produto específico.
     */
    public OptimizationResult performOptimization(
            Integer materializationId,
            String productName,
            double productionNeeded,
            Integer instanceId) {
        
        // Buscar materialização social
        Optional<SocialMaterialization> materialOptional = 
            materializationRepository.findById(materializationId);
        
        if (materialOptional.isEmpty()) {
            return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
        }
        
        // Buscar dados de otimização existentes ou criar novos
        OptimizationInputsResults optimizationData = 
            findOptimizationData(instanceId, materializationId)
                .orElse(createNewOptimizationData(instanceId, materializationId));
        
        // Extrair parâmetros de otimização
        double productionTime = 
            optimizationData.getProductionTimeInHours() != null ? 
            optimizationData.getProductionTimeInHours() : 1.0;
            
        double weeklyScale = 
            optimizationData.getWeeklyWorkingHours() != null ? 
            optimizationData.getWeeklyWorkingHours() : 40.0;
            
        double workerHours = 
            optimizationData.getWorkerHoursPerWeek() != null ? 
            optimizationData.getWorkerHoursPerWeek() : 40.0;
            
        double factoryOperationHours = 
            optimizationData.getFactoryOperationHours() != null ? 
            optimizationData.getFactoryOperationHours() : 168.0; // 7 dias * 24 horas
            
        int workerLimit = 
            optimizationData.getWorkerLimit() != null ? 
            optimizationData.getWorkerLimit() : 100;
            
        double minimumProductionDays = 
            optimizationData.getMinimumProductionTimeInDays() != null ? 
            optimizationData.getMinimumProductionTimeInDays() : 7.0;
        
        // Cálculos de otimização
        double totalHours = productionTime * productionNeeded;
        double workersNeeded = totalHours / (weeklyScale * workerHours);
        double factoriesNeeded = totalHours / (factoryOperationHours * workerLimit * minimumProductionDays);
        
        // Atualizar e salvar resultado da otimização no banco de dados
        optimizationData.setProductionGoal(new BigDecimal(productionNeeded));
        optimizationData.setTotalWorkHours(totalHours);
        optimizationData.setWorkersNeeded((int)Math.ceil(workersNeeded));
        optimizationData.setFactoriesNeeded((int)Math.ceil(factoriesNeeded));
        
        optimizationRepository.save(optimizationData);
        
        // Retornar resultado da otimização
        return new OptimizationResult(
            materializationId,
            productName, 
            productionNeeded,
            totalHours,
            workersNeeded,
            factoriesNeeded,
            productionTime,
            weeklyScale,
            workerHours,
            factoryOperationHours,
            workerLimit,
            minimumProductionDays
        );
    }
    
    /**
     * Busca os dados de otimização existentes
     */
    public Optional<OptimizationInputsResults> findOptimizationData(Integer instanceId, Integer materializationId) {
        return optimizationRepository.findById(new OptimizationInputsResults.OptimizationInputsResultsId(instanceId, materializationId));
    }
    
    /**
     * Cria um novo objeto de dados de otimização com valores padrão
     */
    private OptimizationInputsResults createNewOptimizationData(Integer instanceId, Integer materializationId) {
        OptimizationInputsResults result = new OptimizationInputsResults();
        result.setInstanceId(instanceId);
        result.setMaterializationId(materializationId);
        result.setProductionTimeInHours(1.0);
        result.setWeeklyWorkingHours(40.0);
        result.setWorkerHoursPerWeek(40.0);
        result.setFactoryOperationHours(168.0);
        result.setWorkerLimit(100);
        result.setMinimumProductionTimeInDays(7.0);
        return result;
    }
    
    /**
     * Cria um resultado de otimização padrão quando não há dados suficientes
     */
    private OptimizationResult createDefaultOptimizationResult(Integer materializationId, String productName, double productionNeeded) {
        return new OptimizationResult(
            materializationId, 
            productName, 
            productionNeeded, 
            0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 0.0
        );
    }
    
    /**
     * Limpa resultados anteriores para uma instância específica.
     */
    public void clearPreviousResults(Integer instanceId) {
        List<OptimizationInputsResults> results = optimizationRepository.findById_InstanceId(instanceId);
        optimizationRepository.deleteByInstanceId(instanceId);
    }
}