package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.server.ResponseStatusException;
import xyz.planecon.dto.EstimatesResponseDTO;
import xyz.planecon.dto.InstanceDto;
import xyz.planecon.dto.OptimizationConfigsResponseDTO;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.WorkersProposal;
import xyz.planecon.model.entity.CouncilTransaction;
import xyz.planecon.model.entity.ProjectBid;
import xyz.planecon.model.entity.SupplyOrder;
import xyz.planecon.repository.CouncilTransactionRepository;
import xyz.planecon.repository.ProjectBidRepository;
import xyz.planecon.repository.SupplyOrderRepository;
import xyz.planecon.service.CouncilService;
import xyz.planecon.repository.InstanceRepository;
import xyz.planecon.repository.WorkersProposalRepository;
import xyz.planecon.model.enums.InstanceType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.Optional;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import java.util.HashMap;

@RestController
@RequestMapping("/api/council")
public class CouncilController {

    @Autowired
    private CouncilService councilService;

    @Autowired
    private InstanceRepository instanceRepository;

    @Autowired
    private WorkersProposalRepository workersProposalRepository;

    @Autowired
    private CouncilTransactionRepository councilTransactionRepository;

    @Autowired
    private ProjectBidRepository projectBidRepository;

    @Autowired
    private SupplyOrderRepository supplyOrderRepository;

    private static final Logger logger = LoggerFactory.getLogger(CouncilController.class);

    /**
     * Endpoint para calcular estimativas com base nas instâncias filhas
     * 
     * @param instanceId ID da instância do conselho
     * @return Objeto contendo a matriz tecnológica e vetor de demanda atualizados
     */
    @PostMapping("/{instanceId}/calculate-estimates")
    public ResponseEntity<EstimatesResponseDTO> calculateEstimates(@PathVariable Integer instanceId) {
        EstimatesResponseDTO estimates = councilService.calculateEstimates(instanceId);
        return ResponseEntity.ok(estimates);
    }

    /**
     * Endpoint para buscar as instâncias filhas de um conselho
     * 
     * @param councilId ID da instância do conselho
     * @return Lista de instâncias filhas
     */
    @GetMapping("/{councilId}/children")
    public ResponseEntity<List<InstanceDto>> getChildInstances(@PathVariable Integer councilId) {
        List<InstanceDto> childInstances = councilService.getChildInstances(councilId);
        return ResponseEntity.ok(childInstances);
    }

    /**
     * Endpoint para buscar as configurações de otimização das instâncias filhas de um conselho
     * 
     * @param councilId ID da instância do conselho
     * @return Objeto contendo as configurações médias de otimização por materialização
     */
    @GetMapping("/{councilId}/children-optimization-configs")
    public ResponseEntity<OptimizationConfigsResponseDTO> getChildrenOptimizationConfigs(@PathVariable Integer councilId) {
        OptimizationConfigsResponseDTO configs = councilService.calculateAverageOptimizationConfigs(councilId);
        return ResponseEntity.ok(configs);
    }

    /**
     * Retorna as instâncias filhas de um conselho planejador (PLANNERCOUNCIL)
     * 
     * @param councilId ID do conselho planejador
     * @return Lista de instâncias filhas
     */
    @GetMapping("/{councilId}/planner-children")
    public ResponseEntity<List<Instance>> getPlannerCouncilChildInstances(@PathVariable Integer councilId) {
        logger.info("Buscando instâncias filhas para conselho planejador (PLANNERCOUNCIL) ID: {}", councilId);
        
        try {
            // Buscar a instância do conselho
            Instance council = instanceRepository.findById(councilId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conselho não encontrado: " + councilId));
            
            // Verificar se a instância é do tipo correto (apenas log, não bloquear)
            if (!"PLANNERCOUNCIL".equals(council.getType())) {
                logger.warn("A instância {} não é um conselho planejador, é do tipo: {}", councilId, council.getType());
            }
            
            // Buscar todas as instâncias que têm esta instância como parent,
            // independentemente do tipo da instância
            List<Instance> childInstances = instanceRepository.findByParentCouncilId(councilId);
            
            logger.info("Encontradas {} instâncias filhas para o conselho planejador {}", childInstances.size(), councilId);
            
            return ResponseEntity.ok(childInstances);
        } catch (Exception e) {
            logger.error("Erro ao buscar instâncias filhas do conselho planejador: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    /**
     * Retorna o conselho pai (jurisdição) de um conselho popular
     */
    @GetMapping("/{councilId}/parent")
    public ResponseEntity<?> getParentCouncil(@PathVariable Integer councilId) {
        Instance council = instanceRepository.findById(councilId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conselho não encontrado: " + councilId));
        
        Instance parent = council.getPopularCouncilAssociatedWithPopularCouncil();
        if (parent != null) {
            return ResponseEntity.ok(java.util.Map.of(
                "id", parent.getId(),
                "name", parent.getCommitteeName() != null ? parent.getCommitteeName() : ""
            ));
        }
        return ResponseEntity.ok(java.util.Map.of());
    }

    /**
     * Endpoint administrativo para corrigir os nomes de todos os Conselhos Populares
     * Define o nome como "Conselho Popular de [nome da cidade]"
     * Também preenche dados de cidade baseado nos comitês associados
     * 
     * @return Número de conselhos atualizados
     */
    @PostMapping("/admin/fix-council-names")
    public ResponseEntity<?> fixCouncilNames() {
        logger.info("Iniciando correção dos nomes dos Conselhos Populares...");
        
        try {
            // Buscar todos os conselhos populares
            List<Instance> councils = instanceRepository.findByType(
                xyz.planecon.model.enums.InstanceType.POPULARCOUNCIL
            );
            
            int updated = 0;
            int alreadyCorrect = 0;
            
            for (Instance council : councils) {
                // Se não tem cidade, tentar preencher a partir dos comitês associados
                if (council.getCity() == null || council.getCity().isEmpty()) {
                    // Buscar comitês que apontam para este conselho e que têm cidade
                    List<Instance> associatedCommittees = instanceRepository
                        .findByPopularCouncilAssociatedWithCommitteeOrWorker(council);
                    
                    for (Instance committee : associatedCommittees) {
                        if (committee.getCity() != null && !committee.getCity().isEmpty()) {
                            council.setCity(committee.getCity());
                            if (committee.getCityCode() != null) {
                                council.setCityCode(committee.getCityCode());
                            }
                            logger.info("Preenchendo cidade do conselho {} a partir do comitê {}: {}",
                                council.getId(), committee.getId(), committee.getCity());
                            break;
                        }
                    }
                }
                
                // Definir nome se tiver cidade
                if (council.getCity() != null && !council.getCity().isEmpty()) {
                    String correctName = "Conselho Popular de " + council.getCity();
                    
                    if (council.getCommitteeName() == null || 
                        !council.getCommitteeName().equals(correctName)) {
                        
                        logger.info("Atualizando conselho ID {}: '{}' -> '{}'",
                            council.getId(),
                            council.getCommitteeName(),
                            correctName);
                        
                        council.setCommitteeName(correctName);
                        instanceRepository.save(council);
                        updated++;
                    } else {
                        alreadyCorrect++;
                    }
                } else {
                    logger.warn("Conselho ID {} não tem cidade definida nem em comitês associados", council.getId());
                }
            }
            
            logger.info("Correção concluída. {} conselhos atualizados, {} já estavam corretos",
                updated, alreadyCorrect);
            
            return ResponseEntity.ok(java.util.Map.of(
                "success", true,
                "message", "Correção concluída",
                "updated", updated,
                "alreadyCorrect", alreadyCorrect,
                "total", councils.size()
            ));
            
        } catch (Exception e) {
            logger.error("Erro ao corrigir nomes dos conselhos: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                java.util.Map.of(
                    "success", false,
                    "message", "Erro ao corrigir nomes: " + e.getMessage()
                )
            );
        }
    }

    /**
     * Atualiza o timestamp de última execução de "Calcular Estimativas" + "Salvar Alterações"
     * no Conselho Popular. Esse timestamp será usado pelos comitês filhos para saber quando
     * precisam sincronizar os dados da aba "Capacidade Produtiva em Planejamento".
     * 
     * @param instanceId ID da instância do conselho popular
     * @return ResponseEntity com resultado da operação
     */
    @PostMapping("/{instanceId}/mark-estimates-saved")
    public ResponseEntity<?> markEstimatesSaved(@PathVariable Integer instanceId) {
        logger.info("Marcando estimativas salvas para conselho ID: {}", instanceId);
        
        try {
            Instance council = instanceRepository.findById(instanceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conselho não encontrado: " + instanceId));
            
            long unixTimestamp = System.currentTimeMillis() / 1000L;
            council.setLastEstimatesSavedAt(unixTimestamp);

            // Calcular totalSocialWork desta jurisdição:
            // 1. Somar (planifiedProductionTime * producedQuantity) de cada comitê filho
            // 2. Somar totalSocialWork de cada conselho popular filho
            BigDecimal totalSocialWork = BigDecimal.ZERO;

            // Comitês filhos deste conselho
            List<Instance> childCommittees = instanceRepository.findByPopularCouncilAssociatedWithCommitteeOrWorker(council);
            for (Instance child : childCommittees) {
                if (child.getType() == InstanceType.COMMITTEE) {
                    BigDecimal producedQty = child.getProducedQuantity() != null ? child.getProducedQuantity() : BigDecimal.ZERO;
                    // Obter planifiedProductionTime do WorkersProposal do comitê
                    List<WorkersProposal> proposals = workersProposalRepository.findByInstanceId(child.getId());
                    if (!proposals.isEmpty()) {
                        BigDecimal planifiedProdTime = proposals.get(0).getPlanifiedSociallyNecessaryTimePerUnit();
                        if (planifiedProdTime != null) {
                            totalSocialWork = totalSocialWork.add(planifiedProdTime.multiply(producedQty));
                        }
                    }
                }
            }

            // Conselhos populares filhos deste conselho
            List<Instance> childCouncils = instanceRepository.findByPopularCouncilAssociatedWithPopularCouncil(council);
            for (Instance childCouncil : childCouncils) {
                if (childCouncil.getTotalSocialWork() != null) {
                    totalSocialWork = totalSocialWork.add(childCouncil.getTotalSocialWork());
                }
            }

            council.setTotalSocialWork(totalSocialWork);
            instanceRepository.save(council);
            
            logger.info("Timestamp de estimativas salvas atualizado para conselho {}: {}, totalSocialWork: {}",
                instanceId, unixTimestamp, totalSocialWork);
            
            return ResponseEntity.ok(java.util.Map.of(
                "success", true,
                "lastEstimatesSavedAt", unixTimestamp,
                "totalSocialWork", totalSocialWork
            ));
        } catch (Exception e) {
            logger.error("Erro ao marcar estimativas salvas para conselho {}: {}", instanceId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                java.util.Map.of(
                    "success", false,
                    "message", "Erro: " + e.getMessage()
                )
            );
        }
    }

    /**
     * Atualiza o timestamp de última execução de "Calcular Estimativas" + "Planificar" + "Salvar Alterações"
     * no Conselho Planificador. Esse timestamp será usado pelos comitês para saber quando
     * precisam mover os dados de "Capacidade Produtiva em Planejamento" para "Capacidade Produtiva Planificada".
     * 
     * Também registra o campo de auditoria planification_data_tampered, que indica se o usuário
     * alterou dados após clicar em "Planificar" e antes de "Salvar Alterações".
     * FALSE = dados íntegros (não manipulados após planificação)
     * TRUE  = dados alterados após planificação (possível distorção, para auditoria posterior)
     * 
     * @param instanceId ID da instância do Conselho Planificador
     * @param tampered se true, indica que dados foram alterados após "Planificar"
     * @return ResponseEntity com resultado da operação
     */
    @PostMapping("/{instanceId}/mark-planner-estimates-saved")
    public ResponseEntity<?> markPlannerEstimatesSaved(
            @PathVariable Integer instanceId,
            @org.springframework.web.bind.annotation.RequestParam(name = "tampered", defaultValue = "false") boolean tampered,
            @org.springframework.web.bind.annotation.RequestParam(name = "totalSocialProductionCapacity", required = false) java.math.BigDecimal totalSocialProductionCapacity,
            @org.springframework.web.bind.annotation.RequestParam(name = "totalWorkerHours", required = false) java.math.BigDecimal totalWorkerHoursParam) {
        logger.info("Marcando estimativas planificadas salvas para Conselho Planificador ID: {}, tampered: {}", instanceId, tampered);
        
        try {
            Instance plannerCouncil = instanceRepository.findById(instanceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conselho Planificador não encontrado: " + instanceId));
            
            long unixTimestamp = System.currentTimeMillis() / 1000L;
            plannerCouncil.setLastEstimatesSavedAt(unixTimestamp);

            // Campo de auditoria: registra se o usuário alterou dados após clicar em "Planificar"
            // antes de clicar em "Salvar Alterações". Usado para auditoria posterior.
            plannerCouncil.setPlanificationDataTampered(tampered);

            // c_total: capacidade produtiva mensal total de todos os comitês
            if (totalSocialProductionCapacity != null) {
                plannerCouncil.setTotalSocialProductionCapacity(totalSocialProductionCapacity);
            }

            // Salvar totalWorkerHours (denominador para participação social dos trabalhadores)
            if (totalWorkerHoursParam != null) {
                plannerCouncil.setTotalWorkerHours(totalWorkerHoursParam);
            }

            // Calcular totalSocialWork: somar totalSocialWork de cada conselho popular filho
            BigDecimal totalSocialWork = BigDecimal.ZERO;
            List<Instance> childCouncils = instanceRepository.findByPopularCouncilAssociatedWithPopularCouncil(plannerCouncil);
            for (Instance childCouncil : childCouncils) {
                if (childCouncil.getTotalSocialWork() != null) {
                    totalSocialWork = totalSocialWork.add(childCouncil.getTotalSocialWork());
                }
            }
            // Também somar comitês diretamente filhos do Conselho Planificador (se existirem)
            List<Instance> directCommittees = instanceRepository.findByPopularCouncilAssociatedWithCommitteeOrWorker(plannerCouncil);
            for (Instance child : directCommittees) {
                if (child.getType() == InstanceType.COMMITTEE) {
                    BigDecimal producedQty = child.getProducedQuantity() != null ? child.getProducedQuantity() : BigDecimal.ZERO;
                    List<WorkersProposal> proposals = workersProposalRepository.findByInstanceId(child.getId());
                    if (!proposals.isEmpty()) {
                        BigDecimal planifiedProdTime = proposals.get(0).getPlanifiedSociallyNecessaryTimePerUnit();
                        if (planifiedProdTime != null) {
                            totalSocialWork = totalSocialWork.add(planifiedProdTime.multiply(producedQty));
                        }
                    }
                }
            }
            plannerCouncil.setTotalSocialWork(totalSocialWork);
            
            instanceRepository.save(plannerCouncil);
            
            logger.info("Timestamp de estimativas planificadas atualizado para Conselho Planificador {}: {}, tampered: {}",
                instanceId, unixTimestamp, tampered);
            
            return ResponseEntity.ok(java.util.Map.of(
                "success", true,
                "lastEstimatesSavedAt", unixTimestamp,
                "planificationDataTampered", tampered
            ));
        } catch (Exception e) {
            logger.error("Erro ao marcar estimativas planificadas salvas para Conselho Planificador {}: {}", instanceId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                java.util.Map.of(
                    "success", false,
                    "message", "Erro: " + e.getMessage()
                )
            );
        }
    }

    /**
     * Realiza o resgate automático da participação social de todos os trabalhadores.
     * Uso: chamado pelo Conselho Planificador após "Salvar Alterações".
     * Regra: increment = workerHours / totalWorkerHours
     * Não multiplica por totalSocialWork; zera as horas após processar.
     */
    @PostMapping("/{instanceId}/redeem-all-workers")
    @Transactional
    public ResponseEntity<?> redeemAllWorkers(@PathVariable Integer instanceId) {
        try {
            Instance plannerCouncil = instanceRepository.findById(instanceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conselho Planificador não encontrado: " + instanceId));

            // Determinar totalWorkerHours: usar o valor salvo no planner, se disponível
            BigDecimal totalWorkerHours = (plannerCouncil.getTotalWorkerHours() != null)
                ? plannerCouncil.getTotalWorkerHours()
                : instanceRepository.sumWorkerHours();

            if (totalWorkerHours == null || totalWorkerHours.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "totalWorkerHours inválido ou zero"));
            }

            List<Instance> workers = instanceRepository.findByType(InstanceType.WORKER);
            List<Map<String, Object>> updates = new ArrayList<>();

            for (Instance worker : workers) {
                BigDecimal workerHours = worker.getHoursAtElectronicPoint() != null ? worker.getHoursAtElectronicPoint() : BigDecimal.ZERO;

                if (workerHours.compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }

                BigDecimal increment = workerHours.divide(totalWorkerHours, 15, RoundingMode.HALF_UP);

                BigDecimal current = worker.getEstimatedIndividualParticipationInSocialWork() != null
                    ? worker.getEstimatedIndividualParticipationInSocialWork()
                    : BigDecimal.ZERO;

                BigDecimal updated = current.add(increment);
                worker.setEstimatedIndividualParticipationInSocialWork(updated);

                // Zerar horas no ponto eletrônico após resgate (opção do usuário)
                worker.setHoursAtElectronicPoint(BigDecimal.ZERO);

                updates.add(Map.of(
                    "workerId", worker.getId(),
                    "added", increment,
                    "previousParticipation", current,
                    "newParticipation", updated
                ));
            }

            // Persistir todas as alterações em lote
            instanceRepository.saveAll(workers);

            return ResponseEntity.ok(Map.of("updated", updates.size(), "details", updates));
        } catch (Exception e) {
            logger.error("Erro ao processar redeem-all-workers: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Retorna saldo e taxa do conselho.
     */
    @GetMapping("/{id}/balance")
    public ResponseEntity<?> getCouncilBalance(@PathVariable Integer id) {
        try {
            Instance council = instanceRepository.findById(id).orElse(null);
            if (council == null) return ResponseEntity.notFound().build();
            Map<String, Object> result = new HashMap<>();
            result.put("balance", council.getBalance() != null ? council.getBalance() : BigDecimal.ZERO);
            result.put("taxRate", council.getTaxRate() != null ? council.getTaxRate() : new BigDecimal("50"));
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Atualiza a taxa de arrecadação do conselho.
     */
    @PutMapping("/{id}/tax-rate")
    @Transactional
    public ResponseEntity<?> updateTaxRate(@PathVariable Integer id, @RequestBody Map<String, Object> body) {
        try {
            Instance council = instanceRepository.findById(id).orElse(null);
            if (council == null) return ResponseEntity.notFound().build();
            BigDecimal rate = new BigDecimal(body.get("taxRate").toString());
            if (rate.compareTo(new BigDecimal("10")) < 0 || rate.compareTo(new BigDecimal("70")) > 0) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Taxa deve estar entre 10% e 70%"));
            }
            council.setTaxRate(rate);
            instanceRepository.save(council);
            return ResponseEntity.ok(Map.of("success", true, "taxRate", rate));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Extrato de transações do conselho (paginado).
     */
    @GetMapping("/{id}/transactions")
    public ResponseEntity<?> getTransactions(
            @PathVariable Integer id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(required = false) String search) {
        try {
            Page<CouncilTransaction> result;
            if (search != null && !search.trim().isEmpty()) {
                result = councilTransactionRepository.findByCouncilIdWithSearch(id, search.trim(),
                    PageRequest.of(page, limit, Sort.by(Sort.Direction.DESC, "createdAt")));
            } else {
                result = councilTransactionRepository.findByCouncilIdOrderByCreatedAtDesc(id,
                    PageRequest.of(page, limit));
            }
            Map<String, Object> response = new HashMap<>();
            response.put("transactions", result.getContent());
            response.put("totalPages", result.getTotalPages());
            response.put("currentPage", page);
            response.put("totalElements", result.getTotalElements());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Ajusta o saldo do conselho (crédito/débito) e registra transação.
     */
    @PutMapping("/{id}/balance")
    @Transactional
    public ResponseEntity<?> adjustBalance(@PathVariable Integer id, @RequestBody Map<String, Object> body) {
        try {
            Instance council = instanceRepository.findById(id).orElse(null);
            if (council == null) return ResponseEntity.notFound().build();

            BigDecimal amount = new BigDecimal(body.get("amount").toString());
            String description = body.get("description") != null ? body.get("description").toString() : "Transação";
            String sourceName = body.get("sourceName") != null ? body.get("sourceName").toString() : "";

            BigDecimal currentBalance = council.getBalance() != null ? council.getBalance() : BigDecimal.ZERO;
            BigDecimal newBalance = currentBalance.add(amount).setScale(10, RoundingMode.HALF_UP);
            council.setBalance(newBalance);
            instanceRepository.save(council);

            CouncilTransaction ct = new CouncilTransaction();
            ct.setCouncilId(id);
            ct.setAmount(amount.abs());
            ct.setTransactionType(amount.compareTo(BigDecimal.ZERO) >= 0 ? "CREDIT" : "DEBIT");
            ct.setDescription(description);
            ct.setSourceName(sourceName);
            ct.setBalanceAfter(newBalance);
            ct.setCreatedAt(java.time.LocalDateTime.now());
            councilTransactionRepository.save(ct);

            return ResponseEntity.ok(Map.of("success", true, "balance", newBalance));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Lista lances de um projeto ordenados por menor custo (h).
     */
    @GetMapping("/{councilId}/projects/{orderId}/bids")
    public ResponseEntity<?> getProjectBids(@PathVariable Integer councilId, @PathVariable Integer orderId) {
        try {
            List<ProjectBid> bids = projectBidRepository.findBySupplyOrderIdOrderByBidHoursAsc(orderId);
            List<Map<String, Object>> result = new ArrayList<>();
            for (ProjectBid b : bids) {
                Map<String, Object> item = new HashMap<>();
                item.put("bidId", b.getId());
                item.put("committeeId", b.getCommitteeId());
                item.put("committeeName", instanceRepository.findById(b.getCommitteeId())
                    .map(Instance::getCommitteeName).orElse("Comitê #" + b.getCommitteeId()));
                item.put("bidHours", b.getBidHours());
                item.put("createdAt", b.getCreatedAt() != null ? b.getCreatedAt().toString() : "");
                result.add(item);
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Seleciona um comitê vencedor para o projeto.
     */
    @PutMapping("/{councilId}/projects/{orderId}/select-winner")
    @Transactional
    public ResponseEntity<?> selectProjectWinner(@PathVariable Integer councilId, @PathVariable Integer orderId,
                                                  @RequestBody Map<String, Object> body) {
        try {
            Integer committeeId = Integer.valueOf(body.get("committeeId").toString());
            Optional<SupplyOrder> orderOpt = supplyOrderRepository.findById(orderId);
            if (!orderOpt.isPresent()) return ResponseEntity.notFound().build();
            SupplyOrder order = orderOpt.get();
            Optional<Instance> committeeOpt = instanceRepository.findById(committeeId);
            if (!committeeOpt.isPresent()) return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Comitê não encontrado"));
            order.setSupplierInstance(committeeOpt.get());

            // Atualizar investimento para o valor do lance vencedor
            Optional<ProjectBid> winningBid = projectBidRepository.findBySupplyOrderIdAndCommitteeId(orderId, committeeId);
            if (winningBid.isPresent()) {
                order.setQuantity(winningBid.get().getBidHours());
            }

            supplyOrderRepository.save(order);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}