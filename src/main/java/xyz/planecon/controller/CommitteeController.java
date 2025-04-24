package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.CacheEvict;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import xyz.planecon.dto.CommitteeStateDTO;
import xyz.planecon.dto.DemandsAndGoalsResponseDTO;
import xyz.planecon.model.entity.*;
import xyz.planecon.repository.*;
import xyz.planecon.service.CommitteeService;
import xyz.planecon.service.OptimizationService;
import xyz.planecon.model.entity.TechnologicalTensor.TechnologicalTensorId;
import xyz.planecon.model.entity.DemandStock.DemandStockId;
import xyz.planecon.model.entity.DemandVector.DemandVectorId;
import xyz.planecon.model.enums.UserType;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.model.enums.PronounType;
import java.time.LocalDateTime;
import java.util.*;
import java.math.BigDecimal;
import java.math.RoundingMode;

@RestController
@RequestMapping("/api/committees")
public class CommitteeController {
    
    private static final Logger logger = LoggerFactory.getLogger(CommitteeController.class);
    
    @Autowired
    private InstanceRepository instanceRepository;
    
    @Autowired
    private WorkersProposalRepository workersProposalRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private DemandVectorRepository demandVectorRepository;
    
    @Autowired
    private DemandStockRepository demandStockRepository;
    
    @Autowired
    private TechnologicalTensorRepository technologicalTensorRepository;
    
    @Autowired
    private SocialMaterializationRepository socialMaterializationRepository;

    @Autowired
    private CommitteeService committeeService;

    @Autowired
    private OptimizationService optimizationService;

    @Autowired
    private OptimizationInputsResultsRepository optimizationInputsResultsRepository;

    /**
     * Endpoint para salvar o estado completo de um comitê em uma única transação.
     * 
     * @param committeeStateDTO DTO contendo todo o estado da página do comitê
     * @return ResponseEntity com o resultado da operação
     */
    @PostMapping("/save-state")
    @Transactional
    @CacheEvict(value = {
        "materializations", "instances", "technologicalMatrix", 
        "demandVectors", // Corrigido: era demandVector (singular)
        "demandStocks",  // Adicionado: estava faltando
        "planificationResults", "committeeState"
    }, allEntries = true)
    public ResponseEntity<?> saveCommitteeState(@RequestBody CommitteeStateDTO committeeStateDTO) {
        try {
            logger.info("Iniciando salvamento em lote para comitê ID: {}", committeeStateDTO.getId());
            
            // 1. Buscar ou criar instância do comitê
            Instance committee = null;
            boolean isNewCommittee = false;
            
            if (committeeStateDTO.getId() != null) {
                Optional<Instance> committeeOpt = instanceRepository.findById(committeeStateDTO.getId());
                if (committeeOpt.isPresent()) {
                    committee = committeeOpt.get();
                    logger.info("Comitê existente encontrado: {}", committee.getId());
                }
            }
            
            if (committee == null) {
                committee = new Instance();
                isNewCommittee = true;
                logger.info("Criando novo comitê");
            }
            
            // 2. Atualizar dados básicos do comitê
            updateCommitteeBasicData(committee, committeeStateDTO);
            
            // 3. Salvar o comitê para obter o ID se for novo
            committee = instanceRepository.save(committee);
            logger.info("Comitê salvo com ID: {}", committee.getId());
            
            // 4. Salvar proposta de trabalhadores
            if (committeeStateDTO.getWorkerProposal() != null) {
                saveWorkerProposal(committee, committeeStateDTO.getWorkerProposal());
            }
            
            // 5. Processar membros do comitê (usuários)
            if (committeeStateDTO.getMembers() != null) {
                processCommitteeMembers(committee, committeeStateDTO.getMembers());
            }
            
            // 6. Processar materializações sociais e suas relações
            if (committeeStateDTO.getMaterializations() != null) {
                processMaterializations(committee, committeeStateDTO.getMaterializations());
            }
            
            // 7. Retornar resposta de sucesso com o ID do comitê
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("committeeId", committee.getId());
            response.put("message", isNewCommittee ? "Comitê criado com sucesso" : "Comitê atualizado com sucesso");
            
            logger.info("Salvamento em lote concluído com sucesso para comitê ID: {}", committee.getId());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Erro ao salvar estado do comitê", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Erro ao salvar comitê: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * Atualiza os dados básicos do comitê.
     */
    private void updateCommitteeBasicData(Instance committee, CommitteeStateDTO dto) {
        // Definir tipo como COMMITTEE se for novo
        if (committee.getType() == null) {
            committee.setType(xyz.planecon.model.enums.InstanceType.COMMITTEE);
        }
        
        committee.setCommitteeName(dto.getCommitteeName());
        committee.setProducedQuantity(dto.getProducedQuantity());
        committee.setTargetQuantity(dto.getTargetQuantity());
        committee.setWorkerEffectiveLimit(dto.getWorkerEffectiveLimit());
        
        // Definir materialização social associada
        if (dto.getSocialMaterializationId() != null) {
            Optional<SocialMaterialization> smOpt = socialMaterializationRepository.findById(dto.getSocialMaterializationId());
            smOpt.ifPresent(committee::setSocialMaterialization);
        }
        
        // Definir conselho popular associado
        if (dto.getCouncilId() != null) {
            Optional<Instance> councilOpt = instanceRepository.findById(dto.getCouncilId());
            councilOpt.ifPresent(committee::setPopularCouncilAssociatedWithCommitteeOrWorker);
        }
        
        // Outros campos obrigatórios
        if (committee.getTotalSocialWorkOfThisJurisdiction() == null) {
            committee.setTotalSocialWorkOfThisJurisdiction(10000); // Valor padrão
        }
        
        // Definir data de criação se for novo
        if (committee.getCreatedAt() == null) {
            committee.setCreatedAt(LocalDateTime.now());
        }
    }
    
    /**
     * Salva a proposta de trabalhadores para o comitê.
     */
    private void saveWorkerProposal(Instance committee, CommitteeStateDTO.WorkerProposalDTO proposalDTO) {
        // Criar o objeto ID composto corretamente
        WorkersProposal.WorkersProposalId proposalId = new WorkersProposal.WorkersProposalId();
        proposalId.setInstanceId(committee.getId());
        
        // Buscar proposta existente ou criar nova
        WorkersProposal proposal = workersProposalRepository.findById(proposalId)
            .orElseGet(() -> {
                WorkersProposal newProposal = new WorkersProposal();
                newProposal.setId(proposalId);
                newProposal.setInstance(committee);
                newProposal.setCreatedAt(LocalDateTime.now());
                return newProposal;
            });
        
        // Atualizar valores da proposta
        proposal.setWorkerLimit(proposalDTO.getWorkerLimit());
        proposal.setWorkerHours(proposalDTO.getWorkerHours());
        proposal.setProductionTime(proposalDTO.getProductionTime());
        proposal.setNightShift(proposalDTO.getNightShift());
        proposal.setWeeklyScale(proposalDTO.getWeeklyScale());
        
        // Salvar a proposta
        workersProposalRepository.save(proposal);
        logger.info("Proposta de trabalhadores salva para comitê ID: {}", committee.getId());
    }
    
    /**
     * Processa os membros do comitê (usuários).
     */
    private void processCommitteeMembers(Instance committee, List<CommitteeStateDTO.CommitteeMemberDTO> members) {
        // Obter lista de usuários existentes associados a este comitê
        List<User> existingUsers = userRepository.findByInstanceId(committee.getId());
        Map<Integer, User> existingUsersMap = new HashMap<>();
        
        for (User user : existingUsers) {
            existingUsersMap.put(user.getId(), user);
        }
        
        // Lista para armazenar IDs de usuários que foram processados
        Set<Integer> processedUserIds = new HashSet<>();
        
        // Processar cada membro do DTO
        for (CommitteeStateDTO.CommitteeMemberDTO memberDTO : members) {
            // Pular usuários marcados para exclusão
            if (Boolean.TRUE.equals(memberDTO.getIsDeleted())) {
                if (memberDTO.getId() != null) {
                    User userToDelete = existingUsersMap.get(memberDTO.getId());
                    if (userToDelete != null) {
                        userRepository.delete(userToDelete);
                        logger.info("Usuário excluído: {}", userToDelete.getId());
                    }
                }
                continue;
            }
            
            // Processar usuário existente ou criar novo
            User user;
            if (memberDTO.getId() != null && existingUsersMap.containsKey(memberDTO.getId())) {
                // Atualizar usuário existente
                user = existingUsersMap.get(memberDTO.getId());
                updateUserFromDTO(user, memberDTO, committee);
            } else {
                // Criar novo usuário
                user = createUserFromDTO(memberDTO, committee);
            }
            
            // Salvar usuário
            user = userRepository.save(user);
            processedUserIds.add(user.getId());
            
            logger.info("Usuário salvo: {}", user.getId());
        }
    }
    
    /**
     * Atualiza um usuário existente com dados do DTO.
     */
    private void updateUserFromDTO(User user, CommitteeStateDTO.CommitteeMemberDTO memberDTO, Instance committee) {
        user.setName(memberDTO.getName());
        // Não alterar o nome de usuário de usuários existentes por segurança
        // user.setUsername(memberDTO.getUsername());
        
        // Atualizar tipo e pronome apenas se fornecidos
        if (memberDTO.getType() != null) {
            user.setType(UserType.valueOf(memberDTO.getType()));
        }
        
        if (memberDTO.getPronoun() != null) {
            user.setPronoun(PronounType.valueOf(memberDTO.getPronoun()));
        }
        
        // Garantir que o usuário está associado ao comitê
        user.setInstance(committee);
    }
    
    /**
     * Cria um novo usuário a partir do DTO.
     */
    private User createUserFromDTO(CommitteeStateDTO.CommitteeMemberDTO memberDTO, Instance committee) {
        User user = new User();
        user.setName(memberDTO.getName());
        user.setUsername(memberDTO.getUsername());
        
        // Gerar uma senha segura para novos usuários
        String password = UUID.randomUUID().toString().substring(0, 8);
        user.setPassword(password);
        
        // Definir tipo e pronome
        user.setType(UserType.valueOf(memberDTO.getType() != null ? memberDTO.getType() : "COUNCILLOR"));
        user.setPronoun(PronounType.valueOf(memberDTO.getPronoun() != null ? memberDTO.getPronoun() : "THEY_THEM"));
        
        // Associar ao comitê
        user.setInstance(committee);
        user.setCreatedAt(LocalDateTime.now());
        
        return user;
    }
    
    /**
     * Processa as materializações sociais e suas relações.
     */
    private void processMaterializations(Instance committee, List<CommitteeStateDTO.MaterializationStateDTO> materializations) {
        // Para cada materialização, processar demandas, estoques e tensores tecnológicos
        for (CommitteeStateDTO.MaterializationStateDTO matDTO : materializations) {
            // Pular materializações marcadas para exclusão
            if (Boolean.TRUE.equals(matDTO.getIsDeleted())) {
                deleteAllMaterializationData(committee.getId(), matDTO.getId());
                logger.info("Materialização excluída: {} para comitê {}", matDTO.getId(), committee.getId());
                continue;
            }
            
            // Sempre processa estoque e demanda, mesmo se valores forem null
            // Usar valores padrão zero para evitar problemas de null
            BigDecimal stockValue = matDTO.getStock() != null ? matDTO.getStock() : BigDecimal.ZERO;
            BigDecimal demandValue = matDTO.getDemand() != null ? matDTO.getDemand() : BigDecimal.ZERO;
            
            // Salvar estoque e demanda sempre para todas as materializações
            saveDemandStock(committee, matDTO.getId(), stockValue, demandValue);
            logger.info("Estoque/demanda salvo para materialização {}: estoque={}, demanda={}", 
                       matDTO.getId(), stockValue, demandValue);
            
            // Também criar/atualizar vetor de demanda
            saveDemandVector(committee, matDTO.getId(), demandValue);
            
            // Processar tensores tecnológicos
            if (matDTO.getTechnologicalTensors() != null && !matDTO.getTechnologicalTensors().isEmpty()) {
                processTechnologicalTensors(committee, matDTO.getId(), matDTO.getTechnologicalTensors());
            }
        }
    }
    
    /**
     * Exclui todos os dados relacionados a uma materialização.
     */
    private void deleteAllMaterializationData(Integer committeeId, Integer materializationId) {
        try {
            // Excluir vetores de demanda usando o método específico em vez de deleteById
            demandVectorRepository.deleteByIdSocialMaterializationIdAndIdInstanceId(materializationId, committeeId);
            logger.info("Vetor de demanda excluído para comitê={}, materialização={}", committeeId, materializationId);
            
            // Excluir estoques de demanda
            demandStockRepository.deleteByIdSocialMaterializationIdAndIdInstanceId(materializationId, committeeId);
            logger.info("Estoque de demanda excluído para comitê={}, materialização={}", committeeId, materializationId);
            
            // Excluir tensores tecnológicos relacionados
            int deletedTensors = technologicalTensorRepository.deleteByInstanceIdAndMaterializationId(committeeId, materializationId);
            logger.info("{} tensores tecnológicos excluídos para comitê={}, materialização={}", 
                      deletedTensors, committeeId, materializationId);
            
            logger.info("Dados da materialização {} excluídos com sucesso para comitê {}", materializationId, committeeId);
        } catch (Exception e) {
            logger.error("Erro ao excluir dados da materialização {} para comitê {}: {}", 
                       materializationId, committeeId, e.getMessage(), e);
            throw e; // Relançar exceção para ser tratada pelo método chamador
        }
    }
    
    /**
     * Salva vetor de demanda para uma materialização.
     */
    private void saveDemandVector(Instance committee, Integer materializationId, BigDecimal demand) {
        // Buscar materialização
        Optional<SocialMaterialization> matOpt = socialMaterializationRepository.findById(materializationId);
        if (!matOpt.isPresent()) {
            logger.warn("Materialização não encontrada: {}", materializationId);
            return;
        }
        
        // Criar ID composto para o DemandVector
        DemandVectorId id = new DemandVectorId(committee.getId(), materializationId);
        
        // Buscar existente ou criar novo
        DemandVector demandVector = demandVectorRepository.findById(id)
            .orElseGet(() -> {
                DemandVector newDV = new DemandVector();
                newDV.setId(id);
                newDV.setInstance(committee);
                newDV.setSocialMaterialization(matOpt.get());
                newDV.setCreatedAt(LocalDateTime.now());
                return newDV;
            });
        
        // Atualizar valor da demanda
        demandVector.setDemand(demand);
        
        // Salvar
        demandVectorRepository.save(demandVector);
        logger.info("Vetor de demanda salvo para comitê {} e materialização {}", committee.getId(), materializationId);
    }
    
    /**
     * Salva estoque de demanda para uma materialização.
     */
    private void saveDemandStock(Instance committee, Integer materializationId, BigDecimal stock, BigDecimal demand) {
        // Buscar materialização
        Optional<SocialMaterialization> matOpt = socialMaterializationRepository.findById(materializationId);
        if (!matOpt.isPresent()) {
            logger.warn("Materialização não encontrada: {}", materializationId);
            return;
        }
        
        // Criar ID composto para o DemandStock
        DemandStockId id = new DemandStockId(committee.getId(), materializationId);
        
        // Buscar existente ou criar novo
        DemandStock demandStock = demandStockRepository.findById(id)
            .orElseGet(() -> {
                DemandStock newDS = new DemandStock();
                newDS.setInstance(committee);
                newDS.setSocialMaterialization(matOpt.get());
                newDS.setCreatedAt(LocalDateTime.now());
                return newDS;
            });
        
        // Atualizar valores
        demandStock.setStock(stock);
        
        // Garantir que demand não seja nulo
        if (demand == null) {
            demand = BigDecimal.ZERO;
        }
        demandStock.setDemand(demand);
        
        // Salvar
        demandStockRepository.save(demandStock);
        logger.info("Estoque de demanda salvo para comitê {} e materialização {}", committee.getId(), materializationId);
    }
    
    /**
     * Processa tensores tecnológicos para uma materialização.
     */
    private void processTechnologicalTensors(
            Instance committee, 
            Integer inputMaterializationId,
            Map<String, BigDecimal> tensors) {
        
        // Buscar materialização de entrada
        Optional<SocialMaterialization> inputMatOpt = socialMaterializationRepository.findById(inputMaterializationId);
        if (!inputMatOpt.isPresent()) {
            logger.warn("Materialização de entrada não encontrada: {}", inputMaterializationId);
            return;
        }
        
        SocialMaterialization inputMaterialization = inputMatOpt.get();
        
        // Conjunto para rastrear tensores processados
        Set<Integer> processedOutputMatIds = new HashSet<>();
        
        // Para cada tensor no mapa
        for (Map.Entry<String, BigDecimal> tensorEntry : tensors.entrySet()) {
            // O ID da materialização de saída é a chave do mapa
            Integer outputMatId;
            try {
                outputMatId = Integer.parseInt(tensorEntry.getKey());
            } catch (NumberFormatException e) {
                logger.warn("ID de materialização inválido: {}", tensorEntry.getKey());
                continue;
            }
            
            BigDecimal coefficient = tensorEntry.getValue();
            
            // Buscar materialização de saída
            Optional<SocialMaterialization> outputMatOpt = socialMaterializationRepository.findById(outputMatId);
            if (!outputMatOpt.isPresent()) {
                logger.warn("Materialização de saída não encontrada: {}", outputMatId);
                continue;
            }
            
            SocialMaterialization outputMaterialization = outputMatOpt.get();
            
            // Criar ou atualizar tensor tecnológico
            saveTechnologicalTensor(committee, inputMaterialization, outputMaterialization, coefficient);
            
            // Marcar como processado
            processedOutputMatIds.add(outputMatId);
        }
    }
    
    /**
     * Salva um tensor tecnológico.
     */
    private void saveTechnologicalTensor(
            Instance committee,
            SocialMaterialization inputMaterialization,
            SocialMaterialization outputMaterialization,
            BigDecimal coefficient) {
        
        // Criar ID composto
        TechnologicalTensorId id = new TechnologicalTensorId(
            committee.getId(),
            inputMaterialization.getId(),
            outputMaterialization.getId()
        );
        
        // Buscar existente ou criar novo
        TechnologicalTensor tensor = technologicalTensorRepository.findById(id)
            .orElseGet(() -> {
                TechnologicalTensor newTensor = new TechnologicalTensor();
                newTensor.setId(id);
                newTensor.setInstance(committee);
                newTensor.setInputSocialMaterialization(inputMaterialization);
                newTensor.setOutputSocialMaterialization(outputMaterialization);
                newTensor.setCreatedAt(LocalDateTime.now());
                return newTensor;
            });
        
        // Atualizar coeficiente
        tensor.setTechnicalCoefficientElementValue(coefficient);
        
        // Salvar
        technologicalTensorRepository.save(tensor);
        logger.info("Tensor tecnológico salvo: input={}, output={}, coefficient={}", 
            inputMaterialization.getId(), outputMaterialization.getId(), coefficient);
    }
    
    /**
     * Endpoint para obter o estado completo de um comitê.
     */
    @GetMapping("/{id}/state")
    public ResponseEntity<?> getCommitteeState(@PathVariable Integer id) {
        try {
            logger.info("Buscando estado completo para comitê ID: {}", id);
            
            // 1. Buscar instância do comitê
            Optional<Instance> committeeOpt = instanceRepository.findById(id);
            if (!committeeOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            Instance committee = committeeOpt.get();
            
            // 2. Verificar se é realmente um comitê
            if (committee.getType() != xyz.planecon.model.enums.InstanceType.COMMITTEE) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "A instância especificada não é um comitê"
                ));
            }
            
            // 3. Criar DTO para resposta
            CommitteeStateDTO committeeStateDTO = new CommitteeStateDTO();
            
            // 4. Preencher dados básicos
            committeeStateDTO.setId(committee.getId());
            committeeStateDTO.setCommitteeName(committee.getCommitteeName());
            committeeStateDTO.setProducedQuantity(committee.getProducedQuantity());
            committeeStateDTO.setTargetQuantity(committee.getTargetQuantity());
            committeeStateDTO.setWorkerEffectiveLimit(committee.getWorkerEffectiveLimit());
            
            if (committee.getSocialMaterialization() != null) {
                committeeStateDTO.setSocialMaterializationId(committee.getSocialMaterialization().getId());
            }
            
            if (committee.getPopularCouncilAssociatedWithCommitteeOrWorker() != null) {
                committeeStateDTO.setCouncilId(
                    committee.getPopularCouncilAssociatedWithCommitteeOrWorker().getId()
                );
            }
            
            // 5. Buscar e preencher proposta de trabalhadores
            WorkersProposal.WorkersProposalId proposalId = new WorkersProposal.WorkersProposalId();
            proposalId.setInstanceId(id);
            Optional<WorkersProposal> proposalOpt = workersProposalRepository.findById(proposalId);
            
            if (proposalOpt.isPresent()) {
                WorkersProposal proposal = proposalOpt.get();
                
                CommitteeStateDTO.WorkerProposalDTO proposalDTO = new CommitteeStateDTO.WorkerProposalDTO();
                proposalDTO.setWorkerLimit(proposal.getWorkerLimit());
                proposalDTO.setWorkerHours(proposal.getWorkerHours());
                proposalDTO.setProductionTime(proposal.getProductionTime());
                proposalDTO.setNightShift(proposal.getNightShift());
                proposalDTO.setWeeklyScale(proposal.getWeeklyScale());
                
                committeeStateDTO.setWorkerProposal(proposalDTO);
            }
            
            // 6. Buscar e preencher membros do comitê
            List<User> users = userRepository.findByInstanceId(id);
            List<CommitteeStateDTO.CommitteeMemberDTO> memberDTOs = new ArrayList<>();
            
            for (User user : users) {
                CommitteeStateDTO.CommitteeMemberDTO memberDTO = new CommitteeStateDTO.CommitteeMemberDTO();
                memberDTO.setId(user.getId());
                memberDTO.setName(user.getName());
                memberDTO.setUsername(user.getUsername());
                memberDTO.setType(user.getType().name());
                memberDTO.setPronoun(user.getPronoun().name());
                memberDTO.setIsNew(false);
                memberDTO.setIsDeleted(false);
                
                memberDTOs.add(memberDTO);
            }
            
            committeeStateDTO.setMembers(memberDTOs);
            
            // 7. Buscar e preencher materializações associadas
            List<CommitteeStateDTO.MaterializationStateDTO> materializationDTOs = getMaterializationsForCommittee(committee);
            committeeStateDTO.setMaterializations(materializationDTOs);
            
            // Adicionar dados de otimização para o produto principal, se existir
            if (committee.getSocialMaterialization() != null) {
                Integer mainProductId = committee.getSocialMaterialization().getId();
                
                // Obter dados de otimização do produto principal
                //WorkersProposal.WorkersProposalId proposalId = new WorkersProposal.WorkersProposalId();
                //proposalId.setInstanceId(id);
                
                Optional<WorkersProposal> proposalOptForOptimization = workersProposalRepository.findById(proposalId);
                
                if (proposalOptForOptimization.isPresent()) {
                    WorkersProposal proposal = proposalOptForOptimization.get();
                    
                    // Obter demanda para o produto principal
                    BigDecimal productionNeeded = BigDecimal.ZERO;
                    Optional<DemandVector> demandVectorOpt = demandVectorRepository.findByInstanceIdAndSocialMaterializationId(
                            id, mainProductId);
                    
                    if (demandVectorOpt.isPresent()) {
                        productionNeeded = demandVectorOpt.get().getDemand();
                    } else {
                        Optional<DemandStock> demandStockOpt = demandStockRepository.findByInstanceIdAndSocialMaterializationId(
                                id, mainProductId);
                        if (demandStockOpt.isPresent()) {
                            productionNeeded = demandStockOpt.get().getDemand();
                        }
                    }
                    
                    // Se a meta for maior que a produção atual, usar a diferença como produção necessária
                    BigDecimal producedQuantity = committee.getProducedQuantity() != null ? 
                                                committee.getProducedQuantity() : BigDecimal.ZERO;
                    
                    BigDecimal targetQuantity = committee.getTargetQuantity() != null ? 
                                              committee.getTargetQuantity() : BigDecimal.ZERO;
                    
                    if (targetQuantity.compareTo(producedQuantity) > 0) {
                        productionNeeded = targetQuantity.subtract(producedQuantity);
                    }
                    
                    // Contar comitês associados à esta materialização
                    int committeeCount = (int) instanceRepository.countByTypeAndSocialMaterializationId(
                            xyz.planecon.model.enums.InstanceType.COMMITTEE, mainProductId);
                    
                    // Criar objeto de dados de otimização
                    Map<String, Object> optimizationData = new HashMap<>();
                    
                    // Dados da proposta de trabalhadores
                    optimizationData.put("workerLimit", proposal.getWorkerLimit());
                    optimizationData.put("workerHours", proposal.getWorkerHours());
                    optimizationData.put("productionTime", proposal.getProductionTime());
                    optimizationData.put("weeklyScale", proposal.getWeeklyScale());
                    optimizationData.put("nightShift", proposal.getNightShift());
                    
                    // Dados de produção
                    optimizationData.put("productionNeeded", productionNeeded);
                    
                    // Calcular horas totais necessárias
                    BigDecimal totalHours = productionNeeded.multiply(proposal.getProductionTime());
                    optimizationData.put("totalHours", totalHours);
                    
                    // Calcular horas disponíveis por trabalhador por dia
                    BigDecimal workerHoursPerDay = proposal.getWorkerHours().multiply(
                            proposal.getNightShift() ? new BigDecimal("2") : BigDecimal.ONE);
                    
                    // Calcular horas totais de trabalho disponíveis por semana
                    BigDecimal totalWeeklyHours = workerHoursPerDay.multiply(new BigDecimal(proposal.getWeeklyScale()));
                    
                    // Calcular trabalhadores necessários
                    BigDecimal workersNeeded = totalHours.divide(totalWeeklyHours, 4, RoundingMode.CEILING);
                    optimizationData.put("workersNeeded", workersNeeded);
                    
                    // Calcular fábricas necessárias
                    BigDecimal factoriesNeeded = workersNeeded.divide(new BigDecimal(proposal.getWorkerLimit()), 4, RoundingMode.CEILING);
                    optimizationData.put("factoriesNeeded", factoriesNeeded);
                    
                    // Calcular tempo mínimo de produção em dias
                    BigDecimal factoryDailyHours = new BigDecimal(proposal.getWorkerLimit()).multiply(workerHoursPerDay);
                    BigDecimal minimumProductionTimeInDays = totalHours.divide(
                            factoriesNeeded.setScale(0, RoundingMode.CEILING).multiply(factoryDailyHours), 
                            4, RoundingMode.CEILING);
                    optimizationData.put("minimumProductionTimeInDays", minimumProductionTimeInDays);
                    
                    // Adicionar contagem de comitês existentes
                    optimizationData.put("committeeCount", committeeCount);
                    
                    // Adicionar dados de otimização ao DTO
                    committeeStateDTO.setOptimizationData(optimizationData);
                }
            }
            
            logger.info("Estado completo do comitê {} obtido com sucesso", id);
            return ResponseEntity.ok(committeeStateDTO);
            
        } catch (Exception e) {
            logger.error("Erro ao obter estado do comitê", e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Erro ao obter estado do comitê: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Busca e monta os DTOs de materializações associadas ao comitê.
     */
    private List<CommitteeStateDTO.MaterializationStateDTO> getMaterializationsForCommittee(Instance committee) {
        // Mapa para deduplição
        Map<Integer, CommitteeStateDTO.MaterializationStateDTO> matMap = new HashMap<>();
        
        // 1. Primeiro, buscar os estoques e demandas para garantir que toda materialização tenha valores
        List<DemandStock> stocks = demandStockRepository.findByInstance(committee);
        
        for (DemandStock stock : stocks) {
            SocialMaterialization mat = stock.getSocialMaterialization();
            
            // Criar ou reutilizar DTO
            CommitteeStateDTO.MaterializationStateDTO matDTO = matMap.computeIfAbsent(mat.getId(), id -> {
                CommitteeStateDTO.MaterializationStateDTO dto = new CommitteeStateDTO.MaterializationStateDTO();
                dto.setId(id);
                dto.setName(mat.getName());
                dto.setType(mat.getType().name());
                dto.setTechnologicalTensors(new HashMap<>());
                return dto;
            });
            
            // Definir valores de estoque e demanda - Garantindo que nunca sejam nulos
            matDTO.setStock(stock.getStock() != null ? stock.getStock() : BigDecimal.ZERO);
            matDTO.setDemand(stock.getDemand() != null ? stock.getDemand() : BigDecimal.ZERO);
            
            // Log para depuração
            logger.debug("Carregados valores de materialização {}: estoque={}, demanda={}", 
                       mat.getId(), matDTO.getStock(), matDTO.getDemand());
        }
        
        // 2. Buscar as materializações na matriz tecnológica
        List<TechnologicalTensor> tensors = technologicalTensorRepository.findByInstanceId(committee.getId());
        
        // Processar tensores
        for (TechnologicalTensor tensor : tensors) {
            SocialMaterialization inputMat = tensor.getInputSocialMaterialization();
            SocialMaterialization outputMat = tensor.getOutputSocialMaterialization();
            
            // Processar materialização de entrada
            CommitteeStateDTO.MaterializationStateDTO inputMatDTO = matMap.computeIfAbsent(inputMat.getId(), id -> {
                CommitteeStateDTO.MaterializationStateDTO dto = new CommitteeStateDTO.MaterializationStateDTO();
                dto.setId(id);
                dto.setName(inputMat.getName());
                dto.setType(inputMat.getType().name());
                dto.setTechnologicalTensors(new HashMap<>());
                dto.setStock(BigDecimal.ZERO);  // Valores default para garantir não-nulos
                dto.setDemand(BigDecimal.ZERO);
                return dto;
            });
            
            // Adicionar tensor ao mapa
            inputMatDTO.getTechnologicalTensors().put(
                String.valueOf(outputMat.getId()),
                tensor.getTechnicalCoefficientElementValue()
            );
            
            // Também adicionar materialização de saída
            CommitteeStateDTO.MaterializationStateDTO outputMatDTO = matMap.computeIfAbsent(outputMat.getId(), id -> {
                CommitteeStateDTO.MaterializationStateDTO dto = new CommitteeStateDTO.MaterializationStateDTO();
                dto.setId(id);
                dto.setName(outputMat.getName());
                dto.setType(outputMat.getType().name());
                dto.setTechnologicalTensors(new HashMap<>());
                dto.setStock(BigDecimal.ZERO);  // Valores default para garantir não-nulos
                dto.setDemand(BigDecimal.ZERO);
                return dto;
            });
        }
        
        // 3. Buscar vetores de demanda para completar quaisquer valores faltantes
        List<DemandVector> demands = demandVectorRepository.findByInstanceId(committee.getId());
        
        for (DemandVector demand : demands) {
            SocialMaterialization mat = demand.getSocialMaterialization();
            
            // Buscar no mapa ou criar novo
            CommitteeStateDTO.MaterializationStateDTO matDTO = matMap.computeIfAbsent(mat.getId(), id -> {
                CommitteeStateDTO.MaterializationStateDTO dto = new CommitteeStateDTO.MaterializationStateDTO();
                dto.setId(id);
                dto.setName(mat.getName());
                dto.setType(mat.getType().name());
                dto.setTechnologicalTensors(new HashMap<>());
                dto.setStock(BigDecimal.ZERO);  // Valor padrão para garantir não-nulos
                return dto;
            });
            
            // Definir demanda apenas se ainda não foi definida pelo DemandStock
            if (matDTO.getDemand() == null || matDTO.getDemand().compareTo(BigDecimal.ZERO) == 0) {
                matDTO.setDemand(demand.getDemand() != null ? demand.getDemand() : BigDecimal.ZERO);
            }
        }
        
        // Verificação final para garantir que nenhum valor é nulo
        for (CommitteeStateDTO.MaterializationStateDTO dto : matMap.values()) {
            if (dto.getStock() == null) dto.setStock(BigDecimal.ZERO);
            if (dto.getDemand() == null) dto.setDemand(BigDecimal.ZERO);
        }
        
        // Converter mapa em lista
        return new ArrayList<>(matMap.values());
    }

    /**
     * Endpoint para atualizar demandas e metas do comitê com base nas instâncias relacionadas
     * 
     * @param instanceId ID da instância do comitê
     * @return Objeto contendo os dados de estoque/demanda e metas de produção atualizados
     */
    @PostMapping("/{instanceId}/update-demands-goals")
    public ResponseEntity<DemandsAndGoalsResponseDTO> updateDemandsAndGoals(@PathVariable Integer instanceId) {
        DemandsAndGoalsResponseDTO response = committeeService.updateDemandsAndGoals(instanceId);
        return ResponseEntity.ok(response);
    }

    /**
     * Endpoint para obter dados de otimização para um produto específico do comitê
     * 
     * @param committeeId ID do comitê
     * @param materializationId ID da materialização social (produto)
     * @return ResponseEntity com os dados de otimização
     */
    @GetMapping("/{committeeId}/optimization/{materializationId}")
    public ResponseEntity<?> getOptimizationData(
            @PathVariable Integer committeeId,
            @PathVariable Integer materializationId) {
        
        try {
            logger.info("Obtendo dados de otimização para comitê {} e materialização {}", committeeId, materializationId);
            
            // 1. Verificar se o comitê existe
            Optional<Instance> committeeOpt = instanceRepository.findById(committeeId);
            if (!committeeOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            Instance committee = committeeOpt.get();
            
            // 2. Verificar se a materialização existe
            Optional<SocialMaterialization> materializationOpt = socialMaterializationRepository.findById(materializationId);
            if (!materializationOpt.isPresent()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Materialização não encontrada"
                ));
            }
            
            // 3. Obter a proposta de trabalhadores associada ao comitê
            WorkersProposal.WorkersProposalId proposalId = new WorkersProposal.WorkersProposalId();
            proposalId.setInstanceId(committeeId);
            
            Optional<WorkersProposal> proposalOpt = workersProposalRepository.findById(proposalId);
            if (!proposalOpt.isPresent()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Proposta de trabalhadores não encontrada"
                ));
            }
            
            WorkersProposal proposal = proposalOpt.get();
            
            // 4. Obter demanda para a materialização
            Optional<DemandVector> demandVectorOpt = demandVectorRepository.findByInstanceIdAndSocialMaterializationId(
                    committeeId, materializationId);
            
            // Se não encontrar um vetor de demanda específico, buscar no estoque/demanda
            BigDecimal productionNeeded = BigDecimal.ZERO;
            
            if (demandVectorOpt.isPresent()) {
                productionNeeded = demandVectorOpt.get().getDemand();
            } else {
                // Tentar buscar da tabela de estoques/demandas
                Optional<DemandStock> demandStockOpt = demandStockRepository.findByInstanceIdAndSocialMaterializationId(
                        committeeId, materializationId);
                
                if (demandStockOpt.isPresent()) {
                    productionNeeded = demandStockOpt.get().getDemand();
                }
            }
            
            // 5. Verificar a quantidade já produzida e a meta
            BigDecimal producedQuantity = committee.getProducedQuantity() != null ? 
                                         committee.getProducedQuantity() : BigDecimal.ZERO;
            
            BigDecimal targetQuantity = committee.getTargetQuantity() != null ? 
                                       committee.getTargetQuantity() : BigDecimal.ZERO;
            
            // Se a meta for maior que a produção atual, usar a diferença como produção necessária
            if (targetQuantity.compareTo(producedQuantity) > 0 && 
                materializationId.equals(committee.getSocialMaterialization().getId())) {
                productionNeeded = targetQuantity.subtract(producedQuantity);
            }
            
            // 6. Contar comitês associados à esta materialização
            int committeeCount = (int) instanceRepository.countByTypeAndSocialMaterializationId(
                    xyz.planecon.model.enums.InstanceType.COMMITTEE, materializationId);
            
            // 7. Preparar dados de retorno
            Map<String, Object> optimizationData = new HashMap<>();
            
            // Dados da proposta de trabalhadores
            optimizationData.put("workerLimit", proposal.getWorkerLimit());
            optimizationData.put("workerHours", proposal.getWorkerHours());
            optimizationData.put("productionTime", proposal.getProductionTime());
            optimizationData.put("weeklyScale", proposal.getWeeklyScale());
            optimizationData.put("nightShift", proposal.getNightShift());
            
            // Dados de produção
            optimizationData.put("productionNeeded", productionNeeded);
            
            // Calcular horas totais necessárias
            BigDecimal totalHours = productionNeeded.multiply(proposal.getProductionTime());
            optimizationData.put("totalHours", totalHours);
            
            // Calcular horas disponíveis por trabalhador por dia
            BigDecimal workerHoursPerDay = proposal.getWorkerHours().multiply(
                    proposal.getNightShift() ? new BigDecimal("2") : BigDecimal.ONE);
            
            // Calcular horas totais de trabalho disponíveis por semana
            BigDecimal totalWeeklyHours = workerHoursPerDay.multiply(new BigDecimal(proposal.getWeeklyScale()));
            
            // Calcular trabalhadores necessários
            BigDecimal workersNeeded = totalHours.divide(totalWeeklyHours, 4, RoundingMode.CEILING);
            optimizationData.put("workersNeeded", workersNeeded);
            
            // Calcular fábricas necessárias
            BigDecimal factoriesNeeded = workersNeeded.divide(new BigDecimal(proposal.getWorkerLimit()), 4, RoundingMode.CEILING);
            optimizationData.put("factoriesNeeded", factoriesNeeded);
            
            // Calcular tempo mínimo de produção em dias
            BigDecimal factoryDailyHours = new BigDecimal(proposal.getWorkerLimit()).multiply(workerHoursPerDay);
            BigDecimal minimumProductionTimeInDays = totalHours.divide(
                    factoriesNeeded.setScale(0, RoundingMode.CEILING).multiply(factoryDailyHours), 
                    4, RoundingMode.CEILING);
            optimizationData.put("minimumProductionTimeInDays", minimumProductionTimeInDays);
            
            // Adicionar contagem de comitês existentes
            optimizationData.put("committeeCount", committeeCount);
            
            logger.info("Dados de otimização obtidos com sucesso para comitê {} e materialização {}", committeeId, materializationId);
            
            return ResponseEntity.ok(optimizationData);
            
        } catch (Exception e) {
            logger.error("Erro ao obter dados de otimização", e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Erro ao obter dados de otimização: " + e.getMessage()
            ));
        }
    }

    /**
     * Endpoint para obter dados de otimização do conselho planificador central para um produto específico do comitê
     * 
     * @param committeeId ID do comitê
     * @param materializationId ID da materialização social (produto)
     * @return ResponseEntity com os dados de otimização do conselho central
     */
    @GetMapping("/{committeeId}/central-optimization/{materializationId}")
    public ResponseEntity<?> getCentralOptimizationData(
            @PathVariable Integer committeeId,
            @PathVariable Integer materializationId) {
        
        try {
            logger.info("Obtendo dados de otimização central para comitê {} e materialização {}", committeeId, materializationId);
            
            // 1. Verificar se o comitê existe
            Optional<Instance> committeeOpt = instanceRepository.findById(committeeId);
            if (!committeeOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            Instance committee = committeeOpt.get();
            
            // 2. Verificar se a materialização existe
            Optional<SocialMaterialization> materializationOpt = socialMaterializationRepository.findById(materializationId);
            if (!materializationOpt.isPresent()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Materialização não encontrada"
                ));
            }
            
            // 3. Encontrar o conselho planejador central (assume que existe apenas um)
            Instance plannerCouncil = instanceRepository.findByType(InstanceType.PLANNERCOUNCIL)
                .stream()
                .findFirst()
                .orElse(null);
            
            if (plannerCouncil == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Conselho planificador central não encontrado"
                ));
            }
            
            // 4. Buscar a configuração de otimização do conselho central para esta materialização
            OptimizationInputsResults optimizationConfig = optimizationInputsResultsRepository
                .findById_InstanceIdAndId_SocialMaterializationId(plannerCouncil.getId(), materializationId)
                .orElse(null);
            
            if (optimizationConfig == null) {
                // Se não encontrar configuração específica, criar uma configuração padrão
                WorkersProposal.WorkersProposalId proposalId = new WorkersProposal.WorkersProposalId();
                proposalId.setInstanceId(committeeId);
                
                Optional<WorkersProposal> proposalOpt = workersProposalRepository.findById(proposalId);
                
                // Use a proposta do comitê como fallback
                WorkersProposal proposal = proposalOpt.orElse(new WorkersProposal());
                
                Map<String, Object> defaultConfig = new HashMap<>();
                defaultConfig.put("workerLimit", proposal.getWorkerLimit() != null ? proposal.getWorkerLimit() : 100);
                defaultConfig.put("workerHours", proposal.getWorkerHours() != null ? proposal.getWorkerHours() : 8.0);
                defaultConfig.put("productionTime", proposal.getProductionTime() != null ? proposal.getProductionTime() : 1.0);
                defaultConfig.put("weeklyScale", proposal.getWeeklyScale() != null ? proposal.getWeeklyScale() : 5);
                defaultConfig.put("nightShift", proposal.getNightShift() != null ? proposal.getNightShift() : false);
                
                // Buscar demanda para calcular produção necessária
                BigDecimal productionNeeded = BigDecimal.ZERO;
                Optional<DemandVector> demandVectorOpt = demandVectorRepository
                    .findByInstanceIdAndSocialMaterializationId(plannerCouncil.getId(), materializationId);
                
                if (demandVectorOpt.isPresent()) {
                    productionNeeded = demandVectorOpt.get().getDemand();
                }
                
                defaultConfig.put("productionNeeded", productionNeeded);
                
                // Calcular outros valores necessários
                BigDecimal totalHours = productionNeeded.multiply(BigDecimal.valueOf(
                    (Double) defaultConfig.get("productionTime")));
                defaultConfig.put("totalHours", totalHours);
                
                int committeeCount = (int) instanceRepository.countByTypeAndSocialMaterializationId(
                        InstanceType.COMMITTEE, materializationId);
                defaultConfig.put("committeeCount", committeeCount);
                
                return ResponseEntity.ok(defaultConfig);
            }
            
            // 5. Preparar resposta com os dados da configuração do conselho central
            Map<String, Object> optimizationData = new HashMap<>();
            
            // Parâmetros configurados - usar valores diretos do banco
            optimizationData.put("workerLimit", optimizationConfig.getWorkerLimit());
            optimizationData.put("workerHours", optimizationConfig.getWorkerHours());
            optimizationData.put("productionTime", optimizationConfig.getProductionTime());
            optimizationData.put("weeklyScale", optimizationConfig.getWeeklyScale());
            optimizationData.put("nightShift", optimizationConfig.getNightShift());
            
            // MODIFICADO: Garantir que os dados de produção usem valores diretos do banco
            optimizationData.put("productionNeeded", optimizationConfig.getProductionGoal());
            
            // CORRIGIDO: Garantir que totalHours seja calculado corretamente quando não estiver presente
            BigDecimal totalHours = optimizationConfig.getTotalHours();
            if (totalHours == null || totalHours.compareTo(BigDecimal.ZERO) == 0) {
                // Se não tiver um valor de totalHours armazenado, calcular com base na fórmula:
                // totalHours = productionNeeded * productionTime
                BigDecimal productionNeeded = optimizationConfig.getProductionGoal();
                BigDecimal productionTime = optimizationConfig.getProductionTime();
                
                if (productionNeeded != null && productionTime != null) {
                    totalHours = productionNeeded.multiply(productionTime);
                } else {
                    totalHours = BigDecimal.ZERO;
                }
            }
            optimizationData.put("totalHours", totalHours);
            
            // MODIFICADO: Resultados calculados - usar valores diretos do banco sem recalcular
            optimizationData.put("workersNeeded", optimizationConfig.getWorkersNeeded());
            optimizationData.put("factoriesNeeded", optimizationConfig.getFactoriesNeeded());
            optimizationData.put("minimumProductionTimeInDays", optimizationConfig.getMinimumProductionTime());
            
            // Adicionar contagem de comitês existentes
            int committeeCount = (int) instanceRepository.countByTypeAndSocialMaterializationId(
                    InstanceType.COMMITTEE, materializationId);
            optimizationData.put("committeeCount", committeeCount);
            
            logger.info("Dados de otimização central obtidos com sucesso para comitê {} e materialização {}", committeeId, materializationId);
            
            return ResponseEntity.ok(optimizationData);
            
        } catch (Exception e) {
            logger.error("Erro ao obter dados de otimização central", e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Erro ao obter dados de otimização central: " + e.getMessage()
            ));
        }
    }
}
