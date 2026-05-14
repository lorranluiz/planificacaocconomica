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
            Integer instanceId,
            Integer committeeCount) {
        
        OptimizationInputsResults optimizationData = null;
        try {
            logger.info("Iniciando otimização para materialização {} com produção necessária {}", 
                        materializationId, productionNeeded);
            
            // Adicione esta verificação antes do cálculo
            if (productionNeeded > 1e15) {
                logger.warn("Valor de produção extremamente alto ({}). Considere verificar os dados de entrada.", productionNeeded);
            }
            
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

            if (workerLimit <= 0 || workerHours <= 0.0 || weeklyScale <= 0 || !isFiniteNonNegative(productionNeeded)) {
                logger.warn("Configuração inválida para otimização da materialização {}: workerLimit={}, workerHours={}, weeklyScale={}, productionNeeded={}",
                        materializationId, workerLimit, workerHours, weeklyScale, productionNeeded);
                return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
            }
            
            // CÁLCULOS DE OTIMIZAÇÃO (mesmo algoritmo do JavaScript)
            
            // Cálculo total de horas necessárias para produzir a quantidade desejada
            // Usa workerHours (Horas de Trabalho por Dia) da configuração de otimização
            double totalHours = workerHours * productionNeeded;
            
            // Capacidade semanal por trabalhador (em horas)
            double weeklyWorkHoursPerWorker = weeklyScale * workerHours;
            if (weeklyWorkHoursPerWorker <= 0.0 || !Double.isFinite(weeklyWorkHoursPerWorker)) {
                logger.warn("Capacidade semanal inválida para materialização {}", materializationId);
                return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
            }
            
            // Cálculo do número de trabalhadores necessários
            double workersNeeded = Math.ceil(totalHours / weeklyWorkHoursPerWorker);
            
            // Capacidade total de trabalho por turno
            double shiftWorkHours = workerLimit * workerHours;
            if (shiftWorkHours <= 0.0 || !Double.isFinite(shiftWorkHours)) {
                logger.warn("Capacidade por turno inválida para materialização {}", materializationId);
                return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
            }
            
            // Total de turnos necessários
            int totalShifts = (int)Math.ceil(totalHours / shiftWorkHours);
            
            // Capacidade diária considerando escala semanal e turno noturno
            double dailyWorkHours = nightShift ? shiftWorkHours * 2 : shiftWorkHours;
            double totalDailyWorkHours = dailyWorkHours * weeklyScale / 7;
            if (totalDailyWorkHours <= 0.0 || !Double.isFinite(totalDailyWorkHours) || dailyWorkHours <= 0.0 || !Double.isFinite(dailyWorkHours)) {
                logger.warn("Capacidade diária inválida para materialização {}", materializationId);
                return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
            }
            
            // Prazo mínimo de produção em dias
            double minimumProductionTime = Math.ceil(totalHours / totalDailyWorkHours);
            
            // Período total de trabalho (em dias)
            long totalWorkDays = Math.max(0L, (long)Math.ceil(totalHours / dailyWorkHours));
            
            // Cálculo das horas de operação por dia
            double factoryOperationHours = nightShift ? 24 : 12;
            
            // Conversão do prazo mínimo de produção para dias
            double minimumProductionTimeInDays = minimumProductionTime / 24; // Considera 1 dia = 24 horas
            if (minimumProductionTimeInDays <= 0.0 || !Double.isFinite(minimumProductionTimeInDays)) {
                logger.warn("Tempo mínimo de produção inválido para materialização {}", materializationId);
                return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
            }
            
            // Cálculo do número de fábricas necessárias
            double factoriesNeeded = Math.ceil(totalHours / (factoryOperationHours * workerLimit * minimumProductionTimeInDays));
            
            // Período total de emprego em segundos
            long totalEmploymentPeriodSeconds = safeSecondsFromDays(totalWorkDays);

            if (!isFiniteNonNegative(totalHours) || !isFiniteNonNegative(workersNeeded) || !isFiniteNonNegative(factoriesNeeded)
                    || !isFiniteNonNegative(minimumProductionTime) || totalEmploymentPeriodSeconds < 0) {
                logger.warn("Resultado de otimização inválido para materialização {}", materializationId);
                return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
            }
            
            // Atualizar o objeto com os resultados calculados
            optimizationData.setProductionGoal(new BigDecimal(productionNeeded));
            optimizationData.setPlannedFinalDemand(new BigDecimal(productionNeeded));
            optimizationData.setTotalHours(new BigDecimal(totalHours).setScale(2, RoundingMode.HALF_UP));
            optimizationData.setWorkersNeeded(toBoundedInt(workersNeeded));
            optimizationData.setFactoriesNeeded(toBoundedInt(factoriesNeeded));
            optimizationData.setTotalShifts(Math.max(0, totalShifts));
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
                minimumProductionTimeInDays,
                nightShift,
                committeeCount,
                null
            );
            
            logger.info("Otimização concluída com sucesso para materialização {} ({})", 
                        materializationId, productName);
            
            return result;
            
        } catch (Exception e) {
            logger.error("Erro detalhado ao realizar otimização para {}: {}", 
                        materializationId, e.getMessage(), e);
            if (optimizationData != null && entityManager.contains(optimizationData)) {
                entityManager.detach(optimizationData);
            }
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
            OptimizationInputsResults existingConfig,
            Integer committeeCount) {
        
        try {
            // Recuperar valores da configuração existente
            Integer workerLimitObj = existingConfig.getWorkerLimit();
            BigDecimal workerHours = existingConfig.getWorkerHours();
            BigDecimal productionTime = existingConfig.getProductionTime();
            Integer weeklyScaleObj = existingConfig.getWeeklyScale();
            Boolean nightShiftObj = existingConfig.getNightShift();

            if (workerLimitObj == null || weeklyScaleObj == null || nightShiftObj == null
                    || workerHours == null || productionTime == null) {
                logger.warn("Configuração existente incompleta para materialização {}", materializationId);
                return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
            }

            int workerLimit = workerLimitObj;
            int weeklyScale = weeklyScaleObj;
            boolean nightShift = nightShiftObj;

            if (workerLimit <= 0 || weeklyScale <= 0 || workerHours.doubleValue() <= 0.0 || !isFiniteNonNegative(productionNeeded)) {
                logger.warn("Configuração existente inválida para materialização {}: workerLimit={}, weeklyScale={}, workerHours={}, productionNeeded={}",
                        materializationId, workerLimit, weeklyScale, workerHours, productionNeeded);
                return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
            }
            
            // 1. Tempo total de horas necessárias para produzir toda a quantidade
            // Usa workerHours (Horas de Trabalho por Dia) da configuração de otimização
            double totalHours = productionNeeded * workerHours.doubleValue();
            
            // 2. Horas de operação diária de uma fábrica (limitada pelas restrições físicas)
            double factoryOperationHours = nightShift ? 24.0 : 8.0;
            
            // 3. Horas de trabalho por trabalhador por dia
            double workerHoursPerDay = workerHours.doubleValue();
            
            // 4. Verificar quantos turnos cabem em um dia
            double shiftsPerDay = factoryOperationHours / workerHoursPerDay;
            if (!Double.isFinite(shiftsPerDay) || shiftsPerDay <= 0.0) {
                logger.warn("Turnos por dia inválidos para materialização {}", materializationId);
                return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
            }
            
            // 5. Calcular trabalho total possível por dia por fábrica
            // (considerando os turnos e limite de trabalhadores)
            double effectiveWorkerLimit = workerLimit * shiftsPerDay;
            if (!Double.isFinite(effectiveWorkerLimit) || effectiveWorkerLimit <= 0.0) {
                logger.warn("Limite efetivo de trabalhadores inválido para materialização {}", materializationId);
                return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
            }
            
            // 6. Calcular horas de trabalho totais por dia por fábrica
            double totalHoursPerDayPerFactory = effectiveWorkerLimit * workerHoursPerDay;
            
            // 7. Calcular o número mínimo necessário de fábricas
            // NOVA LÓGICA: dividir o total de horas pelo máximo que pode ser feito por dia por fábrica 
            // e pela duração desejada (ajustada para escala semanal)
            double avgDailyWorkHours = (workerHoursPerDay * weeklyScale) / 7.0; // média diária considerando escala semanal
            if (!Double.isFinite(avgDailyWorkHours) || avgDailyWorkHours <= 0.0) {
                logger.warn("Carga diária média inválida para materialização {}", materializationId);
                return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
            }
            
            // Tempo total de dias com uma única fábrica operando
            double daysWithOneFactory = totalHours / (effectiveWorkerLimit * avgDailyWorkHours);
            if (!Double.isFinite(daysWithOneFactory) || daysWithOneFactory <= 0.0) {
                logger.warn("Dias com uma fábrica inválido para materialização {}", materializationId);
                return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
            }
            
            // 8. Usar um número razoável de fábricas para balancear custo e tempo
            // Aqui não usamos um valor fixo de 30 dias, mas um cálculo flexível
            double targetDaysUpperLimit = 60.0; // limite máximo aceitável (ajustável)
            double targetDaysLowerLimit = 15.0; // limite mínimo desejável (ajustável)
            
            // Calcular número ideal de fábricas com base nos limites de tempo
            double minFactories = Math.ceil(daysWithOneFactory / targetDaysUpperLimit);
            double maxFactories = Math.ceil(daysWithOneFactory / targetDaysLowerLimit);
            
            // Ajustar para um valor razoável
            double factoriesNeeded = Math.min(maxFactories, Math.max(minFactories, 1));
            
            // 9. Calcular o número total de trabalhadores necessários
            double workersNeeded = factoriesNeeded * Math.min(workerLimit, 
                    Math.ceil(totalHours / (daysWithOneFactory * workerHoursPerDay * factoriesNeeded)));
            
            // 10. Calcular o tempo mínimo real com base nos trabalhadores e fábricas disponíveis
            // IMPORTANTE: Essa é a lógica central da sua proposta
            double totalDailyCapacity = factoriesNeeded * effectiveWorkerLimit * avgDailyWorkHours;
            if (!Double.isFinite(totalDailyCapacity) || totalDailyCapacity <= 0.0) {
                logger.warn("Capacidade diária total inválida para materialização {}", materializationId);
                return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
            }
            double minimumProductionTimeInDays = totalHours / totalDailyCapacity;
            
            // 11. Garantir que o tempo não seja menor que o fisicamente possível
            double physicalMinimumTimeInDays = productionTime.doubleValue() / factoryOperationHours;
            minimumProductionTimeInDays = Math.max(minimumProductionTimeInDays, physicalMinimumTimeInDays);

            if (!isFiniteNonNegative(totalHours) || !isFiniteNonNegative(workersNeeded) || !isFiniteNonNegative(factoriesNeeded)
                    || !isFiniteNonNegative(minimumProductionTimeInDays)) {
                logger.warn("Resultado de otimização inválido para materialização {}", materializationId);
                return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
            }

            long employmentTimeSeconds = safeHoursToSeconds(totalHours);
            if (employmentTimeSeconds < 0) {
                logger.warn("Período total de emprego inválido para materialização {}", materializationId);
                return createDefaultOptimizationResult(materializationId, productName, productionNeeded);
            }

            // Atualizar apenas após validar todas as contas para evitar flush de estado parcial inválido
            existingConfig.setProductionGoal(new BigDecimal(productionNeeded));
            existingConfig.setPlannedFinalDemand(new BigDecimal(productionNeeded));
            
            // Salvar resultados calculados na configuração de otimização
            existingConfig.setTotalHours(new BigDecimal(totalHours).setScale(2, RoundingMode.HALF_UP));
            existingConfig.setWorkersNeeded(toBoundedInt(workersNeeded));
            existingConfig.setFactoriesNeeded(toBoundedInt(factoriesNeeded));
            existingConfig.setMinimumProductionTime(new BigDecimal(minimumProductionTimeInDays).setScale(2, RoundingMode.HALF_UP));
            existingConfig.setTotalShifts(nightShift ? 3 : 1);
            
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
                (double) weeklyScale,
                workerHours.doubleValue(),
                factoryOperationHours,
                workerLimit,
                minimumProductionTimeInDays,
                nightShift,
                committeeCount,
                null
            );
            
        } catch (Exception e) {
            logger.error("Erro ao realizar otimização para {} com config existente: {}", 
                        productName, e.getMessage(), e);
            if (entityManager.contains(existingConfig)) {
                entityManager.detach(existingConfig);
            }
            
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
            0.0,  // minimumProductionTimeInDays
            false, // nightShift
            0,    // committeeCount
            null  // totalMaterializationCapacity
        );
    }

    private boolean isFiniteNonNegative(double value) {
        return Double.isFinite(value) && value >= 0.0;
    }

    private int toBoundedInt(double value) {
        if (!Double.isFinite(value) || value <= 0.0) {
            return 0;
        }
        if (value >= Integer.MAX_VALUE) {
            return Integer.MAX_VALUE;
        }
        return (int) Math.ceil(value);
    }

    private long safeHoursToSeconds(double hours) {
        if (!Double.isFinite(hours) || hours < 0.0) {
            return -1L;
        }
        double seconds = hours * 3600.0;
        if (!Double.isFinite(seconds)) {
            return -1L;
        }
        if (seconds >= Long.MAX_VALUE) {
            return Long.MAX_VALUE;
        }
        return Math.round(seconds);
    }

    private long safeSecondsFromDays(long days) {
        if (days < 0L) {
            return -1L;
        }
        long secondsPerDay = 24L * 60L * 60L;
        if (days > Long.MAX_VALUE / secondsPerDay) {
            return Long.MAX_VALUE;
        }
        return days * secondsPerDay;
    }
}