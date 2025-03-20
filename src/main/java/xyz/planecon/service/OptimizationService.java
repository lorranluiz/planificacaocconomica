package xyz.planecon.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import xyz.planecon.dto.PlanificationResponse.OptimizationResult;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.OptimizationInputsResults;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.repository.OptimizationInputsResultsRepository;
import xyz.planecon.repository.SocialMaterializationRepository;
import xyz.planecon.repository.InstanceRepository; // Adicione esta importação

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional; // Use esta importação
// Remova: import jakarta.transaction.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;

@Service
public class OptimizationService {

    private final OptimizationInputsResultsRepository optimizationRepository;
    private final SocialMaterializationRepository materializationRepository;
    private final InstanceRepository instanceRepository; // Adicione este campo

    @PersistenceContext
    private EntityManager entityManager;

    private static final Logger logger = LoggerFactory.getLogger(OptimizationService.class);

    @Autowired
    public OptimizationService(OptimizationInputsResultsRepository optimizationRepository,
                              SocialMaterializationRepository materializationRepository,
                              InstanceRepository instanceRepository) { // Adicione este parâmetro
        this.optimizationRepository = optimizationRepository;
        this.materializationRepository = materializationRepository;
        this.instanceRepository = instanceRepository; // Inicialize o repositório
    }

    /**
     * Limpa resultados anteriores para a instância especificada.
     * Esta operação agora é executada em uma transação separada.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void clearPreviousResults(Integer instanceId) {
        optimizationRepository.deleteByInstanceId(instanceId);
        // Forçar commit da transação após a limpeza
        entityManager.flush();
        entityManager.clear();
    }

    /**
     * Realiza a otimização de produção para um produto específico.
     * Agora com gestão melhorada de concorrência.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public OptimizationResult performOptimization(
            Integer materializationId,
            String productName,
            double productionNeeded,
            Integer instanceId) {
        
        try {
            // Buscar materialização social e instância
            Optional<SocialMaterialization> materialOptional = 
                materializationRepository.findById(materializationId);
            
            Optional<Instance> instanceOptional = 
                instanceRepository.findById(instanceId);
            
            if (materialOptional.isEmpty() || instanceOptional.isEmpty()) {
                return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
            }
            
            SocialMaterialization material = materialOptional.get();
            Instance instance = instanceOptional.get();
            
            // Criar um ID para o resultado de otimização
            OptimizationInputsResults.OptimizationInputsResultsId resultId = 
                new OptimizationInputsResults.OptimizationInputsResultsId(instanceId, materializationId);
            
            // Verificar se já existe um resultado
            OptimizationInputsResults optimizationData;
            
            // Lock exclusivo usando LockModeType.PESSIMISTIC_WRITE para evitar concorrência
            Optional<OptimizationInputsResults> existingResult = 
                Optional.ofNullable(entityManager.find(
                    OptimizationInputsResults.class, 
                    resultId, 
                    LockModeType.PESSIMISTIC_WRITE
                ));
            
            if (existingResult.isPresent()) {
                optimizationData = existingResult.get();
            } else {
                optimizationData = createNewOptimizationData(instanceId, materializationId);
            }
            
            // Garantir que as associações com entidades estão definidas
            optimizationData.setInstance(instance);
            optimizationData.setSocialMaterialization(material);
            
            // Usar valores padrão para campos que não existem no banco
            double productionTime = 1.0; // Valor padrão - não usa o campo transiente  
            double weeklyScale = 40.0;   // Valor padrão - não usa o campo transiente
            double workerHours = 40.0;   // Valor padrão - não usa o campo transiente
            double factoryOperationHours = 168.0; // 7 dias * 24 horas - não usa o campo transiente
            int workerLimit = optimizationData.getWorkerLimit() != null ? 
                optimizationData.getWorkerLimit() : 100;
            double minimumProductionDays = 7.0; // Valor padrão - não usa o campo transiente
            
            // Cálculos de otimização
            double totalHours = productionTime * productionNeeded;
            double workersNeeded = totalHours / (weeklyScale * workerHours);
            double factoriesNeeded = totalHours / (factoryOperationHours * workerLimit * minimumProductionDays);
            
            // Atualizar e salvar apenas os campos que existem na tabela
            optimizationData.setProductionGoal(new BigDecimal(productionNeeded));
            // Manter a variável para cálculos, mas não tentar persistir no banco
            // optimizationData.setTotalWorkHours(totalHours); // Comentado - não existe no banco
            // Em vez disso, podemos usar totalHours no banco
            optimizationData.setTotalHours(new BigDecimal(totalHours));
            optimizationData.setWorkersNeeded((int)Math.ceil(workersNeeded));
            optimizationData.setFactoriesNeeded((int)Math.ceil(factoriesNeeded));
            
            // Salvar e fazer flush imediatamente para evitar problemas de concorrência
            optimizationData = optimizationRepository.saveAndFlush(optimizationData);
            
            // Limpar o contexto de persistência para evitar problemas em transações subsequentes
            entityManager.clear();
            
            // Retornar resultado da otimização com todos os campos
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
        } catch (Exception e) {
            // Adicionar log detalhado da exceção
            logger.error("Erro ao realizar otimização: {}", e.getMessage(), e);
            throw e;
        }
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
        // Buscar as entidades reais
        Instance instance = instanceRepository.findById(instanceId)
                .orElseThrow(() -> new RuntimeException("Instância não encontrada"));
        
        SocialMaterialization materialization = materializationRepository.findById(materializationId)
                .orElseThrow(() -> new RuntimeException("Materialização social não encontrada"));
        
        OptimizationInputsResults result = new OptimizationInputsResults();
        
        // Definir o ID composto
        result.setInstanceId(instanceId);
        result.setMaterializationId(materializationId);
        
        // Definir as entidades relacionadas (CRUCIAL PARA RESOLVER O ERRO)
        result.setInstance(instance);
        result.setSocialMaterialization(materialization);
        
        // Valores transientes
        result.setProductionTimeInHours(1.0);
        result.setWeeklyWorkingHours(40.0);
        result.setWorkerHoursPerWeek(40.0);
        result.setFactoryOperationHours(168.0);
        result.setMinimumProductionTimeInDays(7.0);
        
        // Inicializar campos obrigatórios
        result.setWorkerHours(new BigDecimal("40.0"));
        result.setProductionTime(new BigDecimal("1.0"));
        result.setNightShift(false);
        result.setWeeklyScale(40);
        result.setPlannedWeeklyScale(40);
        result.setTotalHours(new BigDecimal("0"));
        result.setTotalShifts(1);
        result.setMinimumProductionTime(new BigDecimal("1.0"));
        result.setTotalEmploymentPeriodSeconds(0L);
        result.setPlannedFinalDemand(new BigDecimal("0"));
        result.setProductionGoal(new BigDecimal("0"));
        result.setCreatedAt(LocalDateTime.now());
        result.setWorkersNeeded(0);
        result.setFactoriesNeeded(0);
        result.setWorkerLimit(100);
        
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
}