package xyz.planecon.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import xyz.planecon.dto.PlanificationResponse.OptimizationResult;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.OptimizationInputsResults;
import xyz.planecon.model.entity.OptimizationInputsResults.OptimizationInputsResultsId;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.repository.InstanceRepository;
import xyz.planecon.repository.OptimizationInputsResultsRepository;
import xyz.planecon.repository.SocialMaterializationRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class OptimizationService {

    private static final Logger logger = LoggerFactory.getLogger(OptimizationService.class);

    private final OptimizationInputsResultsRepository optimizationRepository;
    private final SocialMaterializationRepository materializationRepository;
    private final InstanceRepository instanceRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    public OptimizationService(OptimizationInputsResultsRepository optimizationRepository,
                              SocialMaterializationRepository materializationRepository,
                              InstanceRepository instanceRepository) {
        this.optimizationRepository = optimizationRepository;
        this.materializationRepository = materializationRepository;
        this.instanceRepository = instanceRepository;
    }

    /**
     * Limpa resultados anteriores para a instância especificada.
     * Esta operação é executada em uma transação separada.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void clearPreviousResults(Integer instanceId) {
        optimizationRepository.deleteByInstanceId(instanceId);
        entityManager.flush();
        entityManager.clear();
    }

    /**
     * Realiza a otimização de produção para um produto específico.
     * Os cálculos que antes eram feitos no cliente são agora feitos no servidor.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public OptimizationResult performOptimization(
            Integer materializationId,
            String productName,
            double productionNeeded,
            Integer instanceId) {
        
        try {
            logger.info("Iniciando otimização para materialização {} com produção necessária {}", 
                        materializationId, productionNeeded);
            
            // Buscar materialização social e instância
            Optional<SocialMaterialization> materialOptional = 
                materializationRepository.findById(materializationId);
            
            Optional<Instance> instanceOptional = 
                instanceRepository.findById(instanceId);
            
            if (materialOptional.isEmpty() || instanceOptional.isEmpty()) {
                logger.warn("Materialização ou instância não encontrada: materializationId={}, instanceId={}", 
                           materializationId, instanceId);
                return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
            }
            
            SocialMaterialization material = materialOptional.get();
            Instance instance = instanceOptional.get();
            
            // Verificar se já existe configuração ou criar nova
            OptimizationInputsResultsId resultId = 
                new OptimizationInputsResultsId(instanceId, materializationId);
            
            OptimizationInputsResults optimizationData;
            Optional<OptimizationInputsResults> existingData = optimizationRepository.findById(resultId);
            
            if (existingData.isPresent()) {
                optimizationData = existingData.get();
            } else {
                optimizationData = createNewOptimizationData(instanceId, materializationId);
            }
            
            // Garantir que as associações estão definidas
            optimizationData.setInstance(instance);
            optimizationData.setSocialMaterialization(material);
            
            // Extrair parâmetros de configuração
            Integer workerLimit = optimizationData.getWorkerLimit();
            BigDecimal workerHoursValue = optimizationData.getWorkerHours();
            BigDecimal productionTimeValue = optimizationData.getProductionTime();
            Integer weeklyScale = optimizationData.getWeeklyScale();
            Boolean nightShift = optimizationData.getNightShift();
            
            // Verificar se os dados de configuração estão completos
            if (workerLimit == null || workerHoursValue == null || productionTimeValue == null || 
                weeklyScale == null || nightShift == null) {
                logger.warn("Dados de configuração incompletos para otimização");
                return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
            }
            
            // Converter BigDecimal para double para cálculos
            double workerHours = workerHoursValue.doubleValue();
            double productionTime = productionTimeValue.doubleValue();
            
            // CÁLCULOS DE OTIMIZAÇÃO (mesmo algoritmo do JavaScript)
            
            // Cálculo total de horas necessárias para produzir a quantidade desejada
            double totalHours = productionTime * productionNeeded;
            
            // Capacidade semanal por trabalhador (em horas)
            double weeklyWorkHoursPerWorker = weeklyScale * workerHours;
            
            // Cálculo do número de trabalhadores necessários
            double workersNeeded = Math.ceil(totalHours / weeklyWorkHoursPerWorker);
            
            // Capacidade total de trabalho por turno
            double shiftWorkHours = workerLimit * workerHours;
            
            // Total de turnos necessários
            int totalShifts = (int)Math.ceil(totalHours / shiftWorkHours);
            
            // Capacidade diária considerando escala semanal e turno noturno
            double dailyWorkHours = nightShift ? shiftWorkHours * 2 : shiftWorkHours;
            double totalDailyWorkHours = dailyWorkHours * weeklyScale / 7;
            
            // Prazo mínimo de produção em dias
            double minimumProductionTime = Math.ceil(totalHours / totalDailyWorkHours);
            
            // Período total de trabalho (em dias)
            int totalWorkDays = (int)Math.ceil(totalHours / dailyWorkHours);
            
            // Cálculo das horas de operação por dia
            double factoryOperationHours = nightShift ? 24 : 12;
            
            // Conversão do prazo mínimo de produção para dias
            double minimumProductionTimeInDays = minimumProductionTime / 24; // Considera 1 dia = 24 horas
            
            // Cálculo do número de fábricas necessárias
            double factoriesNeeded = Math.ceil(totalHours / (factoryOperationHours * workerLimit * minimumProductionTimeInDays));
            
            // Período total de emprego em segundos
            long totalEmploymentPeriodSeconds = (long)(totalWorkDays * 24 * 60 * 60);
            
            // Atualizar o objeto com os resultados calculados
            optimizationData.setProductionGoal(new BigDecimal(productionNeeded));
            optimizationData.setPlannedFinalDemand(new BigDecimal(productionNeeded));
            optimizationData.setTotalHours(new BigDecimal(totalHours).setScale(2, RoundingMode.HALF_UP));
            optimizationData.setWorkersNeeded((int)Math.ceil(workersNeeded));
            optimizationData.setFactoriesNeeded((int)Math.ceil(factoriesNeeded));
            optimizationData.setTotalShifts(totalShifts);
            optimizationData.setMinimumProductionTime(new BigDecimal(minimumProductionTime).setScale(2, RoundingMode.HALF_UP));
            optimizationData.setTotalEmploymentPeriodSeconds(totalEmploymentPeriodSeconds);
            
            // Salvar os resultados no banco de dados
            OptimizationInputsResults savedData = optimizationRepository.save(optimizationData);
            
            // Criar e retornar o objeto de resultado
            OptimizationResult result = new OptimizationResult(
                materializationId,
                productName,
                productionNeeded,
                totalHours,
                workersNeeded,
                factoriesNeeded,
                productionTime,
                (double) weeklyScale,
                workerHours,
                factoryOperationHours,
                workerLimit,
                minimumProductionTimeInDays
            );
            
            logger.info("Otimização concluída com sucesso para materialização {} ({})", 
                        materializationId, productName);
            
            return result;
            
        } catch (Exception e) {
            logger.error("Erro detalhado ao realizar otimização para {}: {}", 
                        materializationId, e.getMessage(), e);
            return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
        }
    }
    
    /**
     * Realiza a otimização usando uma configuração existente
     */
    @Transactional
    public OptimizationResult performOptimization(
            Integer materializationId, 
            String productName,
            double productionNeeded,
            Integer instanceId,
            OptimizationInputsResults existingConfig) {
        
        logger.info("Realizando otimização para {} usando configuração existente. Produção necessária: {}", 
                    productName, productionNeeded);
        
        try {
            // Atualizar a configuração existente com a nova meta de produção
            existingConfig.setProductionGoal(new BigDecimal(productionNeeded));
            
            // Recuperar valores da configuração existente
            int workerLimit = existingConfig.getWorkerLimit();
            BigDecimal workerHours = existingConfig.getWorkerHours();
            BigDecimal productionTime = existingConfig.getProductionTime();
            int weeklyScale = existingConfig.getWeeklyScale();
            boolean nightShift = existingConfig.getNightShift();
            
            // Calcular horas de operação diária da fábrica
            double factoryOperationHours = workerHours.doubleValue();
            if (nightShift) {
                factoryOperationHours *= 3; // Turnos de 24h (3 turnos)
            }
            
            // Total de horas necessárias para produção
            double totalHours = productionNeeded * productionTime.doubleValue();
            
            // Calcular número de trabalhadores necessários
            double hoursPerDay = workerHours.doubleValue() * weeklyScale / 7.0; // Média diária
            double daysRequired = totalHours / (workerLimit * hoursPerDay);
            double workersNeeded = Math.ceil(workerLimit * daysRequired);
            
            // Calcular número de fábricas necessárias (arredondar para cima)
            double factoriesNeeded = Math.ceil(workersNeeded / workerLimit);
            
            // Tempo mínimo de produção em dias (tempo tão rápido quanto possível)
            double minimumProductionTime = totalHours / (factoriesNeeded * workerLimit * factoryOperationHours);
            
            // Salvar resultados
            existingConfig.setTotalHours(new BigDecimal(totalHours));
            existingConfig.setWorkersNeeded((int) workersNeeded);
            existingConfig.setFactoriesNeeded((int) factoriesNeeded);
            existingConfig.setMinimumProductionTime(new BigDecimal(minimumProductionTime));
            existingConfig.setTotalShifts(nightShift ? 3 : 1);
            
            // Tempo total de emprego (em segundos)
            long employmentTimeSeconds = Math.round(totalHours * 3600); // horas para segundos
            existingConfig.setTotalEmploymentPeriodSeconds(employmentTimeSeconds);
            
            // Salvar a configuração atualizada
            optimizationRepository.save(existingConfig);
            
            // Retornar resultado da otimização
            return new OptimizationResult(
                materializationId,
                productName,
                productionNeeded,
                totalHours,
                workersNeeded,
                factoriesNeeded,
                productionTime.doubleValue(),
                (double) weeklyScale,  // Converter de int para double
                workerHours.doubleValue(),
                factoryOperationHours,
                workerLimit,
                minimumProductionTime
            );
            
        } catch (Exception e) {
            logger.error("Erro ao realizar otimização para {} com config existente: {}", 
                        productName, e.getMessage(), e);
            
            return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
        }
    }
    
    /**
     * Encontra dados de otimização existentes.
     */
    public Optional<OptimizationInputsResults> findOptimizationData(Integer instanceId, Integer materializationId) {
        OptimizationInputsResultsId id = new OptimizationInputsResultsId(instanceId, materializationId);
        return optimizationRepository.findById(id);
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
        OptimizationInputsResultsId id = new OptimizationInputsResultsId(instanceId, materializationId);
        result.setId(id);
        
        // Definir as entidades relacionadas
        result.setInstance(instance);
        result.setSocialMaterialization(materialization);
        
        // Inicializar campos
        result.setWorkerHours(new BigDecimal("40.0"));
        result.setProductionTime(new BigDecimal("1.0"));
        result.setNightShift(false);
        result.setWeeklyScale(5);
        result.setPlannedWeeklyScale(5);
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
    private OptimizationResult createDefaultOptimizationResult(
            Integer materializationId, String productName, double productionNeeded) {
        
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