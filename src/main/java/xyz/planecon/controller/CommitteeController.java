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
import xyz.planecon.model.enums.SocialMaterializationType;
import xyz.planecon.util.BrazilianStateUtil;
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

    @Autowired
    private CityRepository cityRepository;

    @Autowired
    private SupplyOrderRepository supplyOrderRepository;

    @Autowired
    private CouncilTransactionRepository councilTransactionRepository;

    @Autowired
    private ProjectBidRepository projectBidRepository;

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

            // 2.1. Persistir as quantidades do vetor tecnológico na própria instância do comitê
            saveTechnologicalQuantities(committee, committeeStateDTO.getMaterializations());
            
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
                processMaterializations(committee, committeeStateDTO.getMaterializations(),
                    committeeStateDTO.getSupplierChoices());
            }

            // 7. Persistir Tempo Socialmente Necessário para Produzir Uma Unidade
            if (committeeStateDTO.getSociallyNecessaryTimePerUnit() != null) {
                // Sempre persistir na workers_proposal como fonte confiável
                WorkersProposal.WorkersProposalId proposalId = new WorkersProposal.WorkersProposalId();
                proposalId.setInstanceId(committee.getId());
                Optional<WorkersProposal> proposalForSnt = workersProposalRepository.findById(proposalId);
                if (proposalForSnt.isPresent()) {
                    WorkersProposal wpSnt = proposalForSnt.get();
                    wpSnt.setProposalSociallyNecessaryTimePerUnit(committeeStateDTO.getSociallyNecessaryTimePerUnit());
                    workersProposalRepository.save(wpSnt);
                    logger.info("Tempo Socialmente Necessário (proposta) salvo em workers_proposal para comitê {}", committee.getId());
                }
                // Também atualizar optimization_inputs_results se o registro já existir
                if (committee.getSocialMaterialization() != null) {
                    OptimizationInputsResults.OptimizationInputsResultsId optId =
                            new OptimizationInputsResults.OptimizationInputsResultsId(
                                    committee.getId(), committee.getSocialMaterialization().getId());
                    Optional<OptimizationInputsResults> existingOpt = optimizationInputsResultsRepository.findById(optId);
                    if (existingOpt.isPresent()) {
                        OptimizationInputsResults opt = existingOpt.get();
                        opt.setSociallyNecessaryTimePerUnit(committeeStateDTO.getSociallyNecessaryTimePerUnit());
                        optimizationInputsResultsRepository.save(opt);
                        logger.info("Tempo Socialmente Necessário atualizado para comitê {} materialização {}",
                                committee.getId(), committee.getSocialMaterialization().getId());
                    }
                }
            }

            // 8. Retornar resposta de sucesso com o ID do comitê
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

        // Atualizar campos de planejamento se fornecidos
        if (proposalDTO.getPlanningWorkerLimit() != null) proposal.setPlanningWorkerLimit(proposalDTO.getPlanningWorkerLimit());
        if (proposalDTO.getPlanningWorkerHours() != null) proposal.setPlanningWorkerHours(proposalDTO.getPlanningWorkerHours());
        if (proposalDTO.getPlanningProductionTime() != null) proposal.setPlanningProductionTime(proposalDTO.getPlanningProductionTime());
        if (proposalDTO.getPlanningNightShift() != null) proposal.setPlanningNightShift(proposalDTO.getPlanningNightShift());
        if (proposalDTO.getPlanningWeeklyScale() != null) proposal.setPlanningWeeklyScale(proposalDTO.getPlanningWeeklyScale());

        // Atualizar campos de planificado se fornecidos
        if (proposalDTO.getPlanifiedWorkerLimit() != null) proposal.setPlanifiedWorkerLimit(proposalDTO.getPlanifiedWorkerLimit());
        if (proposalDTO.getPlanifiedWorkerHours() != null) proposal.setPlanifiedWorkerHours(proposalDTO.getPlanifiedWorkerHours());
        if (proposalDTO.getPlanifiedProductionTime() != null) proposal.setPlanifiedProductionTime(proposalDTO.getPlanifiedProductionTime());
        if (proposalDTO.getPlanifiedNightShift() != null) proposal.setPlanifiedNightShift(proposalDTO.getPlanifiedNightShift());
        if (proposalDTO.getPlanifiedWeeklyScale() != null) proposal.setPlanifiedWeeklyScale(proposalDTO.getPlanifiedWeeklyScale());
        
        // Salvar a proposta
        workersProposalRepository.save(proposal);
        logger.info("Proposta de trabalhadores salva para comitê ID: {}", committee.getId());
    }

    /**
     * Persiste as quantidades do vetor tecnológico no campo JSONB da instância.
     */
    private void saveTechnologicalQuantities(Instance committee, List<CommitteeStateDTO.MaterializationStateDTO> materializations) {
        if (committee == null || materializations == null) {
            return;
        }

        Map<String, BigDecimal> quantitiesByMaterialization = new LinkedHashMap<>();
        for (CommitteeStateDTO.MaterializationStateDTO materialization : materializations) {
            if (materialization == null || materialization.getId() == null) {
                continue;
            }

            BigDecimal quantity = materialization.getQuantity();
            if (quantity != null) {
                quantitiesByMaterialization.put(String.valueOf(materialization.getId()), quantity);
            }
        }

        committee.setTechnologicalQuantitiesByMaterialization(
            quantitiesByMaterialization.isEmpty() ? null : quantitiesByMaterialization
        );
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
    private void processMaterializations(Instance committee, List<CommitteeStateDTO.MaterializationStateDTO> materializations,
                                          Map<Integer, Integer> supplierChoices) {
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
                processTechnologicalTensors(committee, matDTO.getId(), matDTO.getTechnologicalTensors(),
                    supplierChoices);
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
            Map<String, BigDecimal> tensors,
            Map<Integer, Integer> supplierChoices) {
        
        // Buscar materialização de entrada
        Optional<SocialMaterialization> inputMatOpt = socialMaterializationRepository.findById(inputMaterializationId);
        if (!inputMatOpt.isPresent()) {
            logger.warn("Materialização de entrada não encontrada: {}", inputMaterializationId);
            return;
        }
        
        SocialMaterialization inputMaterialization = inputMatOpt.get();
        
        // Obter fornecedor para este insumo (se houver)
        Integer supplierId = null;
        if (supplierChoices != null) {
            supplierId = supplierChoices.get(inputMaterializationId);
        }
        
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
            saveTechnologicalTensor(committee, inputMaterialization, outputMaterialization, coefficient, supplierId);
            
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
            BigDecimal coefficient,
            Integer supplierInstanceId) {
        
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
        
        // Atualizar fornecedor (null remove o fornecedor)
        tensor.setSupplierInstanceId(supplierInstanceId);
        
        // Salvar
        technologicalTensorRepository.save(tensor);
        logger.info("Tensor tecnológico salvo: input={}, output={}, coefficient={}, supplier={}", 
            inputMaterialization.getId(), outputMaterialization.getId(), coefficient, supplierInstanceId);
    }
    
    /**
     * Busca ou cria um Conselho Popular para uma cidade específica.
     * Garante que exista apenas um Conselho Popular por cidade.
     * Também cria automaticamente o conselho estadual se não existir.
     */
    private Instance findOrCreatePopularCouncilForCity(String cityCode, String cityName, String suggestedState) {
        logger.info("Buscando Conselho Popular para cidade: {} ({})", cityName, cityCode);
        
        // Buscar conselho popular existente para esta cidade
        List<Instance> existingCouncils = instanceRepository
            .findByCityCodeAndType(cityCode, InstanceType.POPULARCOUNCIL);
        
        // Se já existe, retornar o primeiro (deve haver apenas um por cidade)
        if (!existingCouncils.isEmpty()) {
            Instance council = existingCouncils.get(0);
            logger.info("Conselho Popular encontrado: {} (ID: {})", 
                council.getCommitteeName(), council.getId());
            
            // Se existir mais de um, logar warning
            if (existingCouncils.size() > 1) {
                logger.warn("ATENÇÃO: Foram encontrados {} Conselhos Populares para a cidade {} - deveria haver apenas um!", 
                    existingCouncils.size(), cityName);
            }
            
            // Se o estado está faltando mas temos sugestão, definir
            if (council.getState() == null && suggestedState != null && !suggestedState.trim().isEmpty()) {
                council.setState(suggestedState.trim());
                council.setCountry("Brasil");
                council = instanceRepository.save(council);
                logger.info("Estado '{}' definido para conselho da cidade: {}", suggestedState, cityName);
            }
            
            // Garantir que o conselho da cidade está vinculado ao conselho estadual
            if (council.getPopularCouncilAssociatedWithPopularCouncil() == null && council.getState() != null) {
                Instance stateCouncil = findOrCreateStateCouncil(council.getState());
                council.setPopularCouncilAssociatedWithPopularCouncil(stateCouncil);
                council = instanceRepository.save(council);
                logger.info("Conselho da cidade {} vinculado ao conselho estadual: {}", 
                    cityName, stateCouncil.getCommitteeName());
            }
            
            return council;
        }
        
        // Se não existe, criar novo Conselho Popular
        logger.info("Conselho Popular não encontrado. Criando novo para cidade: {}", cityName);
        
        Instance newCouncil = new Instance();
        newCouncil.setType(InstanceType.POPULARCOUNCIL);
        newCouncil.setCommitteeName("Conselho Popular de " + cityName);
        newCouncil.setCityCode(cityCode);
        newCouncil.setCity(cityName);
        newCouncil.setCreatedAt(LocalDateTime.now());
        
        // Buscar dados de localização da cidade no repositório de cidades
        String stateName = null;
        Optional<City> cityOpt = cityRepository.findByCode(cityCode);
        if (cityOpt.isPresent()) {
            City city = cityOpt.get();
            stateName = city.getState();
            if (stateName != null) {
                newCouncil.setState(stateName);
            }
            newCouncil.setCountry("Brasil");
        }
        
        // Fallback: usar estado sugerido (via geocodificação reversa ou input do usuário)
        if (stateName == null && suggestedState != null && !suggestedState.trim().isEmpty()) {
            stateName = suggestedState.trim();
            newCouncil.setState(stateName);
            newCouncil.setCountry("Brasil");
            logger.info("Usando estado sugerido '{}' para cidade: {}", stateName, cityName);
        }
        
        // Salvar novo conselho
        newCouncil = instanceRepository.save(newCouncil);
        logger.info("Novo Conselho Popular criado: {} (ID: {})", 
            newCouncil.getCommitteeName(), newCouncil.getId());
        
        // Vincular ao conselho estadual (criando-o se necessário)
        if (stateName != null) {
            Instance stateCouncil = findOrCreateStateCouncil(stateName);
            newCouncil.setPopularCouncilAssociatedWithPopularCouncil(stateCouncil);
            newCouncil = instanceRepository.save(newCouncil);
            logger.info("Conselho da cidade {} vinculado ao conselho estadual: {}", 
                cityName, stateCouncil.getCommitteeName());
        }
        
        return newCouncil;
    }

    private static final int BRASIL_COUNCIL_ID = 6068;

    private Instance findOrCreateStateCouncil(String stateName) {
        // Buscar conselho estadual existente
        List<Instance> stateCouncils = instanceRepository
            .findStateCouncilByStateAndType(stateName, InstanceType.POPULARCOUNCIL);
        
        if (!stateCouncils.isEmpty()) {
            return stateCouncils.get(0);
        }
        
        // Criar novo conselho estadual
        logger.info("Criando conselho estadual para: {}", stateName);
        Instance stateCouncil = new Instance();
        stateCouncil.setType(InstanceType.POPULARCOUNCIL);
        stateCouncil.setCommitteeName(BrazilianStateUtil.getCouncilName(stateName));
        stateCouncil.setState(stateName);
        stateCouncil.setCountry("Brasil");
        stateCouncil.setContinent("América do Sul");
        stateCouncil.setCreatedAt(LocalDateTime.now());
        
        // Coordenadas da capital do estado
        BigDecimal[] coords = BrazilianStateUtil.getCapitalCoords(stateName);
        if (coords != null) {
            stateCouncil.setLatitude(coords[0]);
            stateCouncil.setLongitude(coords[1]);
        }
        
        // Vincular ao conselho do Brasil
        Optional<Instance> brasilCouncil = instanceRepository.findById(BRASIL_COUNCIL_ID);
        if (brasilCouncil.isPresent()) {
            stateCouncil.setPopularCouncilAssociatedWithPopularCouncil(brasilCouncil.get());
            logger.info("Conselho estadual de {} vinculado ao Conselho do Brasil", stateName);
        }
        
        stateCouncil = instanceRepository.save(stateCouncil);
        logger.info("Conselho estadual criado: {} (ID: {})", 
            stateCouncil.getCommitteeName(), stateCouncil.getId());
        
        return stateCouncil;
    }
    
    /**
     * Endpoint para obter o estado completo de um comitê.
     */
    @GetMapping("/{id}/state")
    @Transactional
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
            
            // 2.5. Verificar e corrigir associação do Conselho Popular
            if (committee.getCityCode() != null && committee.getCity() != null) {
                Instance currentCouncil = committee.getPopularCouncilAssociatedWithCommitteeOrWorker();
                
                // Buscar ou criar o conselho correto para esta cidade
                Instance correctCouncil = findOrCreatePopularCouncilForCity(
                    committee.getCityCode(),
                    committee.getCity(),
                    null
                );
                
                // Se não tem conselho associado OU o conselho associado é de outra cidade
                boolean needsUpdate = false;
                if (currentCouncil == null) {
                    logger.info("Comitê {} não tem conselho associado. Associando ao conselho da cidade: {}",
                        committee.getId(), correctCouncil.getCommitteeName());
                    needsUpdate = true;
                } else if (!currentCouncil.getId().equals(correctCouncil.getId())) {
                    // Verificar se o conselho atual é da mesma cidade
                    if (!committee.getCityCode().equals(currentCouncil.getCityCode())) {
                        logger.warn("Comitê {} estava associado ao conselho {} (cidade: {}), mas deveria estar associado ao conselho {} (cidade: {}). Corrigindo...",
                            committee.getId(),
                            currentCouncil.getCommitteeName(), currentCouncil.getCity(),
                            correctCouncil.getCommitteeName(), correctCouncil.getCity());
                        needsUpdate = true;
                    }
                }
                
                if (needsUpdate) {
                    committee.setPopularCouncilAssociatedWithCommitteeOrWorker(correctCouncil);
                    committee = instanceRepository.save(committee);
                    logger.info("Associação atualizada: Comitê {} agora está associado ao Conselho {}",
                        committee.getId(), correctCouncil.getCommitteeName());
                }
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
                Instance council = committee.getPopularCouncilAssociatedWithCommitteeOrWorker();
                committeeStateDTO.setCouncilId(council.getId());
                committeeStateDTO.setCouncilName(council.getCommitteeName());
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

                // Campos de "Capacidade Produtiva em Planejamento"
                proposalDTO.setPlanningWorkerLimit(proposal.getPlanningWorkerLimit());
                proposalDTO.setPlanningWorkerHours(proposal.getPlanningWorkerHours());
                proposalDTO.setPlanningProductionTime(proposal.getPlanningProductionTime());
                proposalDTO.setPlanningNightShift(proposal.getPlanningNightShift());
                proposalDTO.setPlanningWeeklyScale(proposal.getPlanningWeeklyScale());

                // Campos de "Capacidade Produtiva Planificada"
                proposalDTO.setPlanifiedWorkerLimit(proposal.getPlanifiedWorkerLimit());
                proposalDTO.setPlanifiedWorkerHours(proposal.getPlanifiedWorkerHours());
                proposalDTO.setPlanifiedProductionTime(proposal.getPlanifiedProductionTime());
                proposalDTO.setPlanifiedNightShift(proposal.getPlanifiedNightShift());
                proposalDTO.setPlanifiedWeeklyScale(proposal.getPlanifiedWeeklyScale());

                // Campos de Tempo Socialmente Necessário para Produzir 1 Unidade
                proposalDTO.setPlanningSociallyNecessaryTimePerUnit(proposal.getPlanningSociallyNecessaryTimePerUnit());
                proposalDTO.setPlanifiedSociallyNecessaryTimePerUnit(proposal.getPlanifiedSociallyNecessaryTimePerUnit());
                
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

            // 7.1 Construir escolhas de fornecedor a partir dos tensores tecnológicos
            Map<Integer, Integer> supplierChoices = new HashMap<>();
            Map<Integer, String> orderStatuses = new HashMap<>();
            List<TechnologicalTensor> tensors = technologicalTensorRepository.findByInstanceId(committee.getId());
            for (TechnologicalTensor tensor : tensors) {
                if (tensor.getSupplierInstanceId() != null) {
                    supplierChoices.put(tensor.getInputSocialMaterialization().getId(), tensor.getSupplierInstanceId());
                }
            }
            // Buscar último status de cada insumo do supply_order
            for (TechnologicalTensor tensor : tensors) {
                Integer inputId = tensor.getInputSocialMaterialization().getId();
                List<SupplyOrder> history = supplyOrderRepository
                    .findByOrderingInstanceIdAndInputMaterializationIdOrderByCreatedAtDesc(committee.getId(), inputId);
                if (!history.isEmpty()) {
                    orderStatuses.put(inputId, history.get(0).getOrderStatus() != null
                        ? history.get(0).getOrderStatus() : "solicitada");
                }
            }
            committeeStateDTO.setSupplierChoices(supplierChoices);
            committeeStateDTO.setOrderStatuses(orderStatuses);

            // 7.2 Popular nomes dos fornecedores
            if (supplierChoices != null && !supplierChoices.isEmpty()) {
                Map<Integer, String> supplierNames = new HashMap<>();
                for (Integer supplierId : new HashSet<>(supplierChoices.values())) {
                    instanceRepository.findById(supplierId).ifPresent(inst ->
                        supplierNames.put(supplierId, inst.getCommitteeName())
                    );
                }
                committeeStateDTO.setSupplierNames(supplierNames);
            }

            // 8. Verificar sincronização com Conselho Popular pai
            //    Se o conselho pai executou "Calcular Estimativas" + "Salvar Alterações" desde a última sincronização,
            //    copiar dados da aba "Proposta de Capacidade Produtiva Declarada" para "Capacidade Produtiva em Planejamento"
            Instance council = committee.getPopularCouncilAssociatedWithCommitteeOrWorker();
            if (council != null && council.getLastEstimatesSavedAt() != null) {
                Long councilTimestamp = council.getLastEstimatesSavedAt();
                Long committeeTimestamp = committee.getLastCouncilEstimatesSyncedAt();

                if (committeeTimestamp == null || !committeeTimestamp.equals(councilTimestamp)) {
                    logger.info("Sincronizando dados do conselho {} para comitê {}: council_ts={}, committee_ts={}",
                        council.getId(), committee.getId(), councilTimestamp, committeeTimestamp);

                    // Copiar dados da proposta (aba "Proposta de Capacidade Produtiva Declarada")
                    // para os campos de planejamento (aba "Capacidade Produtiva em Planejamento")
                    Optional<WorkersProposal> proposalForSync = workersProposalRepository.findById(proposalId);
                    if (proposalForSync.isPresent()) {
                        WorkersProposal wp = proposalForSync.get();
                        wp.setPlanningWorkerLimit(wp.getWorkerLimit());
                        wp.setPlanningWorkerHours(wp.getWorkerHours());
                        wp.setPlanningProductionTime(wp.getProductionTime());
                        wp.setPlanningNightShift(wp.getNightShift());
                        wp.setPlanningWeeklyScale(wp.getWeeklyScale());

                        // Copiar Tempo Socialmente Necessário para Produzir 1 Unidade para planejamento
                        // Primeiro tenta a fonte confiável (workers_proposal.proposal_snt), depois fallback em optimization_inputs_results
                        if (wp.getProposalSociallyNecessaryTimePerUnit() != null) {
                            wp.setPlanningSociallyNecessaryTimePerUnit(wp.getProposalSociallyNecessaryTimePerUnit());
                        } else if (committee.getSocialMaterialization() != null) {
                            OptimizationInputsResults.OptimizationInputsResultsId optId =
                                new OptimizationInputsResults.OptimizationInputsResultsId(
                                    committee.getId(), committee.getSocialMaterialization().getId());
                            Optional<OptimizationInputsResults> optResultsOpt = optimizationInputsResultsRepository.findById(optId);
                            if (optResultsOpt.isPresent() && optResultsOpt.get().getSociallyNecessaryTimePerUnit() != null) {
                                wp.setPlanningSociallyNecessaryTimePerUnit(optResultsOpt.get().getSociallyNecessaryTimePerUnit());
                            }
                        }
                        workersProposalRepository.save(wp);

                        // Atualizar o DTO que será retornado
                        if (committeeStateDTO.getWorkerProposal() != null) {
                            CommitteeStateDTO.WorkerProposalDTO wpDTO = committeeStateDTO.getWorkerProposal();
                            wpDTO.setPlanningWorkerLimit(wp.getWorkerLimit());
                            wpDTO.setPlanningWorkerHours(wp.getWorkerHours());
                            wpDTO.setPlanningProductionTime(wp.getProductionTime());
                            wpDTO.setPlanningNightShift(wp.getNightShift());
                            wpDTO.setPlanningWeeklyScale(wp.getWeeklyScale());
                            wpDTO.setPlanningSociallyNecessaryTimePerUnit(wp.getPlanningSociallyNecessaryTimePerUnit());
                        }

                        logger.info("Dados da proposta copiados para aba de planejamento do comitê {}", committee.getId());
                    }

                    // Atualizar o timestamp de sincronização do comitê
                    committee.setLastCouncilEstimatesSyncedAt(councilTimestamp);
                    instanceRepository.save(committee);
                    logger.info("Timestamp de sincronização atualizado para comitê {}: {}", committee.getId(), councilTimestamp);
                }
            }
            committeeStateDTO.setLastCouncilEstimatesSyncedAt(committee.getLastCouncilEstimatesSyncedAt());

            // 9. Verificar sincronização com Conselho Planificador
            //    Se o Conselho Planificador executou "Calcular Estimativas" + "Planificar" + "Salvar Alterações"
            //    desde a última sincronização, mover dados de "Capacidade Produtiva em Planejamento"
            //    para "Capacidade Produtiva Planificada" e limpar os campos de planejamento.
            List<Instance> plannerCouncils = instanceRepository.findByType(InstanceType.PLANNERCOUNCIL);
            if (!plannerCouncils.isEmpty()) {
                Instance plannerCouncil = plannerCouncils.get(0); // Só existe um Conselho Planificador
                if (plannerCouncil.getLastEstimatesSavedAt() != null) {
                    Long plannerTimestamp = plannerCouncil.getLastEstimatesSavedAt();
                    Long committeePlannerTimestamp = committee.getLastPlannerEstimatesSyncedAt();

                    if (committeePlannerTimestamp == null || !committeePlannerTimestamp.equals(plannerTimestamp)) {
                        logger.info("Sincronizando dados do Conselho Planificador {} para comitê {}: planner_ts={}, committee_planner_ts={}",
                            plannerCouncil.getId(), committee.getId(), plannerTimestamp, committeePlannerTimestamp);

                        // Mover dados de planejamento (planning_*) para planificado (planified_*)
                        // e limpar os campos de planejamento
                        Optional<WorkersProposal> proposalForPlannerSync = workersProposalRepository.findById(proposalId);
                        if (proposalForPlannerSync.isPresent()) {
                            WorkersProposal wp = proposalForPlannerSync.get();

                            // Copiar planning -> planified
                            wp.setPlanifiedWorkerLimit(wp.getPlanningWorkerLimit());
                            wp.setPlanifiedWorkerHours(wp.getPlanningWorkerHours());
                            wp.setPlanifiedProductionTime(wp.getPlanningProductionTime());
                            wp.setPlanifiedNightShift(wp.getPlanningNightShift());
                            wp.setPlanifiedWeeklyScale(wp.getPlanningWeeklyScale());
                            wp.setPlanifiedSociallyNecessaryTimePerUnit(wp.getPlanningSociallyNecessaryTimePerUnit());

                            // Limpar campos de planejamento
                            wp.setPlanningWorkerLimit(null);
                            wp.setPlanningWorkerHours(null);
                            wp.setPlanningProductionTime(null);
                            wp.setPlanningNightShift(null);
                            wp.setPlanningWeeklyScale(null);
                            wp.setPlanningSociallyNecessaryTimePerUnit(null);

                            workersProposalRepository.save(wp);

                            // Atualizar o DTO que será retornado
                            if (committeeStateDTO.getWorkerProposal() != null) {
                                CommitteeStateDTO.WorkerProposalDTO wpDTO = committeeStateDTO.getWorkerProposal();
                                // Planificado recebe os valores que estavam em planejamento
                                wpDTO.setPlanifiedWorkerLimit(wp.getPlanifiedWorkerLimit());
                                wpDTO.setPlanifiedWorkerHours(wp.getPlanifiedWorkerHours());
                                wpDTO.setPlanifiedProductionTime(wp.getPlanifiedProductionTime());
                                wpDTO.setPlanifiedNightShift(wp.getPlanifiedNightShift());
                                wpDTO.setPlanifiedWeeklyScale(wp.getPlanifiedWeeklyScale());
                                wpDTO.setPlanifiedSociallyNecessaryTimePerUnit(wp.getPlanifiedSociallyNecessaryTimePerUnit());
                                // Planejamento fica vazio
                                wpDTO.setPlanningWorkerLimit(null);
                                wpDTO.setPlanningWorkerHours(null);
                                wpDTO.setPlanningProductionTime(null);
                                wpDTO.setPlanningNightShift(null);
                                wpDTO.setPlanningWeeklyScale(null);
                                wpDTO.setPlanningSociallyNecessaryTimePerUnit(null);
                            }

                            logger.info("Dados de planejamento movidos para planificado no comitê {}", committee.getId());
                        }

                        // Atualizar o timestamp de sincronização do comitê com o Conselho Planificador
                        committee.setLastPlannerEstimatesSyncedAt(plannerTimestamp);

                        // Novo ciclo de planificação: só resetar produção quando houver meta positiva válida.
                        BigDecimal newTargetQuantity = null;
                        if (committee.getSocialMaterialization() != null) {
                            Integer matId = committee.getSocialMaterialization().getId();
                            Optional<DemandVector> dvOpt = demandVectorRepository.findByInstanceIdAndSocialMaterializationId(
                                    committee.getId(), matId);

                            if (dvOpt.isPresent() && dvOpt.get().getDemand() != null
                                    && dvOpt.get().getDemand().compareTo(BigDecimal.ZERO) > 0) {
                                newTargetQuantity = dvOpt.get().getDemand();
                            } else {
                                Optional<DemandStock> dsOpt = demandStockRepository.findByInstanceIdAndSocialMaterializationId(
                                        committee.getId(), matId);
                                if (dsOpt.isPresent() && dsOpt.get().getDemand() != null
                                        && dsOpt.get().getDemand().compareTo(BigDecimal.ZERO) > 0) {
                                    newTargetQuantity = dsOpt.get().getDemand();
                                }
                            }
                        }

                        if (newTargetQuantity != null && newTargetQuantity.compareTo(BigDecimal.ZERO) > 0) {
                            committee.setProducedQuantity(BigDecimal.ZERO);
                            committee.setTargetQuantity(newTargetQuantity);
                            committeeStateDTO.setProducedQuantity(BigDecimal.ZERO);
                            committeeStateDTO.setTargetQuantity(newTargetQuantity);
                            logger.info(
                                "Sincronização do Planner aplicada ao comitê {}: targetQuantity={}, producedQuantity zerada.",
                                committee.getId(), newTargetQuantity
                            );
                        } else {
                            logger.warn(
                                "Sincronização do Planner no comitê {} sem meta positiva disponível (DemandVector/DemandStock). " +
                                "Mantendo producedQuantity={} e targetQuantity={} para evitar violação de constraint.",
                                committee.getId(), committee.getProducedQuantity(), committee.getTargetQuantity()
                            );
                            committeeStateDTO.setProducedQuantity(committee.getProducedQuantity());
                            committeeStateDTO.setTargetQuantity(committee.getTargetQuantity());
                        }

                        instanceRepository.save(committee);
                        logger.info("Timestamp de sincronização com Conselho Planificador atualizado para comitê {}: {}.", committee.getId(), plannerTimestamp);
                    }
                }
            }
            committeeStateDTO.setLastPlannerEstimatesSyncedAt(committee.getLastPlannerEstimatesSyncedAt());
            
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
                    
                    // Calcular dados de otimização apenas se houver valores válidos
                    if (proposal.getWorkerHours() != null && proposal.getWorkerHours().compareTo(BigDecimal.ZERO) > 0
                            && proposal.getWeeklyScale() != null && proposal.getWeeklyScale() > 0
                            && proposal.getWorkerLimit() != null && proposal.getWorkerLimit() > 0) {
                        
                        // Calcular horas disponíveis por trabalhador por dia
                        BigDecimal workerHoursPerDay = proposal.getWorkerHours().multiply(
                                proposal.getNightShift() ? new BigDecimal("2") : BigDecimal.ONE);
                        
                        // Calcular horas totais de trabalho disponíveis por semana
                        BigDecimal totalWeeklyHours = workerHoursPerDay.multiply(new BigDecimal(proposal.getWeeklyScale()));
                        
                        // Calcular trabalhadores necessários (apenas se totalWeeklyHours > 0)
                        if (totalWeeklyHours.compareTo(BigDecimal.ZERO) > 0) {
                            BigDecimal workersNeeded = totalHours.divide(totalWeeklyHours, 4, RoundingMode.CEILING);
                            optimizationData.put("workersNeeded", workersNeeded);
                            
                            // Calcular fábricas necessárias
                            BigDecimal factoriesNeeded = workersNeeded.divide(new BigDecimal(proposal.getWorkerLimit()), 4, RoundingMode.CEILING);
                            optimizationData.put("factoriesNeeded", factoriesNeeded);
                            
                            // Calcular tempo mínimo de produção em dias
                            BigDecimal factoryDailyHours = new BigDecimal(proposal.getWorkerLimit()).multiply(workerHoursPerDay);
                            if (factoriesNeeded.compareTo(BigDecimal.ZERO) > 0 && factoryDailyHours.compareTo(BigDecimal.ZERO) > 0) {
                                BigDecimal minimumProductionTimeInDays = totalHours.divide(
                                        factoriesNeeded.setScale(0, RoundingMode.CEILING).multiply(factoryDailyHours), 
                                        4, RoundingMode.CEILING);
                                optimizationData.put("minimumProductionTimeInDays", minimumProductionTimeInDays);
                            }
                        }
                    }
                    
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
        Map<String, BigDecimal> quantitiesByMaterialization = committee.getTechnologicalQuantitiesByMaterialization();
        
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
                if (quantitiesByMaterialization != null && quantitiesByMaterialization.get(String.valueOf(id)) != null) {
                    dto.setQuantity(quantitiesByMaterialization.get(String.valueOf(id)));
                }
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
                if (quantitiesByMaterialization != null && quantitiesByMaterialization.get(String.valueOf(id)) != null) {
                    dto.setQuantity(quantitiesByMaterialization.get(String.valueOf(id)));
                }
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
                if (quantitiesByMaterialization != null && quantitiesByMaterialization.get(String.valueOf(id)) != null) {
                    dto.setQuantity(quantitiesByMaterialization.get(String.valueOf(id)));
                }
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

            if (quantitiesByMaterialization != null && quantitiesByMaterialization.get(String.valueOf(mat.getId())) != null) {
                matDTO.setQuantity(quantitiesByMaterialization.get(String.valueOf(mat.getId())));
            }
            
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
                // Usa workerHours (Horas de Trabalho por Dia) da configuração de otimização
                BigDecimal totalHours = productionNeeded.multiply(BigDecimal.valueOf(
                    (Double) defaultConfig.get("workerHours")));
                defaultConfig.put("totalHours", totalHours);
                
                int committeeCount = (int) instanceRepository.countByTypeAndSocialMaterializationId(
                        InstanceType.COMMITTEE, materializationId);
                defaultConfig.put("committeeCount", committeeCount);
                
                defaultConfig.put("requiredProductionForCommittee", null);
                defaultConfig.put("estimatedParticipation", null);
                
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
            
            // Calcular totalHours = productionNeeded * workerHours (Horas de Trabalho por Dia)
            BigDecimal productionNeeded = optimizationConfig.getProductionGoal();
            BigDecimal workerHoursValue = optimizationConfig.getWorkerHours();
            BigDecimal totalHours;
            if (productionNeeded != null && workerHoursValue != null) {
                totalHours = productionNeeded.multiply(workerHoursValue);
            } else {
                totalHours = BigDecimal.ZERO;
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
            
            // Calcular Produção Necessária do comitê (Q_ij) e Participação Estimada
            // usando dados planificados do comitê e capacidades armazenadas
            BigDecimal requiredProductionForCommittee = null;
            BigDecimal estimatedParticipation = null;
            BigDecimal estimatedParticipationHours = null;
            
            WorkersProposal.WorkersProposalId wpId = new WorkersProposal.WorkersProposalId();
            wpId.setInstanceId(committeeId);
            Optional<WorkersProposal> wpOpt = workersProposalRepository.findById(wpId);
            
            if (wpOpt.isPresent()) {
                WorkersProposal wp = wpOpt.get();
                Integer planifiedWeeklyScale = wp.getPlanifiedWeeklyScale();
                BigDecimal planifiedWorkerHours = wp.getPlanifiedWorkerHours();
                Integer planifiedWorkerLimit = wp.getPlanifiedWorkerLimit();
                
                if (planifiedWeeklyScale != null && planifiedWorkerHours != null && planifiedWorkerLimit != null) {
                    // c_trabalhador = 4 semanas * escala_semanal * carga_horária_diária
                    BigDecimal monthlyWorkerCapacity = BigDecimal.valueOf(4)
                        .multiply(BigDecimal.valueOf(planifiedWeeklyScale))
                        .multiply(planifiedWorkerHours);
                    estimatedParticipationHours = monthlyWorkerCapacity;

                    // T_mensal = limite_trabalhadores * c_trabalhador
                    BigDecimal monthlyCommitteeCapacity = BigDecimal.valueOf(planifiedWorkerLimit)
                        .multiply(monthlyWorkerCapacity);
                    
                    // c_total_i: capacidade total da materialização
                    BigDecimal cTotalI = optimizationConfig.getTotalMaterializationCapacity();
                    
                    // Q_total_i: produção necessária total da materialização
                    BigDecimal qTotalI = optimizationConfig.getProductionGoal();
                    
                    // p_ij = T_mensal / c_total_i (produtividade do comitê)
                    // Q_ij = p_ij * Q_total_i (produção necessária para este comitê)
                    if (cTotalI != null && cTotalI.compareTo(BigDecimal.ZERO) > 0 && qTotalI != null) {
                        BigDecimal productivity = monthlyCommitteeCapacity.divide(cTotalI, 10, java.math.RoundingMode.HALF_UP);
                        requiredProductionForCommittee = productivity.multiply(qTotalI);
                    }
                    
                    // c_total: capacidade produtiva total de todos os comitês
                    BigDecimal cTotal = plannerCouncil.getTotalSocialProductionCapacity();
                    
                    // participacao_estimada = c_trabalhador / c_total
                    if (cTotal != null && cTotal.compareTo(BigDecimal.ZERO) > 0) {
                        estimatedParticipation = monthlyWorkerCapacity.divide(cTotal, 10, java.math.RoundingMode.HALF_UP);
                    }
                }
            }
            
            optimizationData.put("requiredProductionForCommittee", requiredProductionForCommittee);
            optimizationData.put("estimatedParticipation", estimatedParticipation);
            optimizationData.put("estimatedParticipationHours", estimatedParticipationHours);

            // Calcular Participação Estimada Localmente e Tempo para Conclusão
            // Base: encomendas pendentes do próprio comitê (dados locais, sem planificação global)
            BigDecimal estimatedLocalParticipationHours = null;
            BigDecimal estimatedLocalTimeToComplete = null;
            BigDecimal estimatedLocalTimeMonths = null;
            String estimatedLocalTimeUnit = null;

            if (wpOpt.isPresent()) {
                WorkersProposal wpLocal = wpOpt.get();
                Integer localWorkerLimit = wpLocal.getWorkerLimit();
                Integer localWeeklyScale = wpLocal.getWeeklyScale();
                BigDecimal localWorkerHours = wpLocal.getWorkerHours();
                BigDecimal localProductionTime = wpLocal.getProductionTime();

                if (localWorkerLimit != null && localWeeklyScale != null
                        && localWorkerHours != null && localWorkerLimit > 0) {

                    BigDecimal monthlyCapacityPerWorker = BigDecimal.valueOf(4)
                            .multiply(BigDecimal.valueOf(localWeeklyScale))
                            .multiply(localWorkerHours);
                    BigDecimal monthlyCommitteeCapacity = BigDecimal.valueOf(localWorkerLimit)
                            .multiply(monthlyCapacityPerWorker);

                    List<SupplyOrder> allSupplierOrders = supplyOrderRepository
                            .findBySupplierInstanceIdOrderByCreatedAtDesc(committeeId);

                    List<String> terminalStatuses = List.of(
                            "recusada", "horas liberadas", "recebida pelo demandante");

                    BigDecimal totalPendingHours = BigDecimal.ZERO;
                    for (SupplyOrder order : allSupplierOrders) {
                        String status = order.getOrderStatus();
                        if (status != null && terminalStatuses.contains(status)) continue;

                        Instance orderingInst = order.getOrderingInstance();
                        if (orderingInst != null && orderingInst.getId().equals(committeeId)) continue;

                        SocialMaterialization inputMat = order.getInputMaterialization();
                        BigDecimal qty = order.getQuantity() != null ? order.getQuantity() : BigDecimal.ZERO;

                        if (inputMat != null && SocialMaterializationType.PROJECT.equals(inputMat.getType())) {
                            totalPendingHours = totalPendingHours.add(qty);
                        } else if (localProductionTime != null) {
                            totalPendingHours = totalPendingHours.add(
                                    qty.multiply(localProductionTime));
                        }
                    }

                    if (totalPendingHours.compareTo(BigDecimal.ZERO) > 0) {
                        BigDecimal hoursPerWorker = totalPendingHours.divide(
                                BigDecimal.valueOf(localWorkerLimit), 10, RoundingMode.HALF_UP);

                        if (hoursPerWorker.compareTo(monthlyCapacityPerWorker) > 0) {
                            estimatedLocalParticipationHours = monthlyCapacityPerWorker
                                    .setScale(2, RoundingMode.HALF_UP);
                        } else {
                            estimatedLocalParticipationHours = hoursPerWorker
                                    .setScale(2, RoundingMode.HALF_UP);
                        }

                        BigDecimal ratio = totalPendingHours.divide(
                                monthlyCommitteeCapacity, 10, RoundingMode.HALF_UP);
                        if (ratio.compareTo(BigDecimal.valueOf(12)) >= 0) {
                            BigDecimal years = ratio.divide(BigDecimal.valueOf(12), 10, RoundingMode.HALF_UP);
                            int wholeYears = years.intValue();
                            BigDecimal remainingMonths = ratio
                                    .subtract(BigDecimal.valueOf(wholeYears * 12))
                                    .setScale(0, RoundingMode.HALF_UP);
                            estimatedLocalTimeToComplete = BigDecimal.valueOf(wholeYears);
                            estimatedLocalTimeMonths = remainingMonths;
                            estimatedLocalTimeUnit = "anos";
                        } else if (ratio.compareTo(BigDecimal.ONE) >= 0) {
                            estimatedLocalTimeToComplete = ratio.setScale(2, RoundingMode.HALF_UP);
                            estimatedLocalTimeUnit = "meses";
                        } else {
                            BigDecimal days = ratio.multiply(BigDecimal.valueOf(30))
                                    .setScale(0, RoundingMode.HALF_UP);
                            if (days.compareTo(BigDecimal.ONE) >= 0) {
                                estimatedLocalTimeToComplete = days;
                                estimatedLocalTimeUnit = "dias";
                            } else {
                                estimatedLocalTimeToComplete = totalPendingHours
                                        .setScale(0, RoundingMode.HALF_UP);
                                estimatedLocalTimeUnit = "horas";
                            }
                        }
                    }
                }
            }

            optimizationData.put("estimatedLocalParticipationHours", estimatedLocalParticipationHours);
            optimizationData.put("estimatedLocalTimeToComplete", estimatedLocalTimeToComplete);
            optimizationData.put("estimatedLocalTimeMonths", estimatedLocalTimeMonths);
            optimizationData.put("estimatedLocalTimeUnit", estimatedLocalTimeUnit);

            // Buscar Tempo Socialmente Necessário para Produzir Uma Unidade da linha do comitê
            OptimizationInputsResults committeeOptConfig = optimizationInputsResultsRepository
                    .findById_InstanceIdAndId_SocialMaterializationId(committeeId, materializationId)
                    .orElse(null);
            if (committeeOptConfig != null && committeeOptConfig.getSociallyNecessaryTimePerUnit() != null) {
                optimizationData.put("sociallyNecessaryTimePerUnit", committeeOptConfig.getSociallyNecessaryTimePerUnit());
            }

            // Incluir dados de CO2 se disponíveis na otimização do conselho central
            if (optimizationConfig.getCo2Allocated() != null) {
                optimizationData.put("co2Allocated", optimizationConfig.getCo2Allocated());
            }
            if (optimizationConfig.getCo2ShadowPrice() != null) {
                optimizationData.put("co2ShadowPrice", optimizationConfig.getCo2ShadowPrice());
            }

            // Incluir fator de emissão da materialização
            SocialMaterialization mat = materializationOpt.get();
            if (mat.getCo2EmissionFactor() != null) {
                optimizationData.put("co2EmissionFactor", mat.getCo2EmissionFactor());
            }

            // Dados de CO2 do conselho planificador
            if (plannerCouncil.getCo2EmissionLimit() != null) {
                optimizationData.put("co2EmissionLimit", plannerCouncil.getCo2EmissionLimit());
            }

            // Calcular alocação de CO2 do comitê (proporcional à capacidade)
            if (optimizationConfig.getCo2Allocated() != null
                    && optimizationConfig.getTotalMaterializationCapacity() != null
                    && optimizationConfig.getTotalMaterializationCapacity().compareTo(BigDecimal.ZERO) > 0) {

                if (wpOpt.isPresent()) {
                    WorkersProposal wp = wpOpt.get();
                    Integer wLimit = wp.getPlanifiedWorkerLimit();
                    BigDecimal wHours = wp.getPlanifiedWorkerHours();
                    Integer wScale = wp.getPlanifiedWeeklyScale();

                    if (wLimit != null && wHours != null && wScale != null) {
                        BigDecimal monthlyWorkerCap = BigDecimal.valueOf(4)
                            .multiply(BigDecimal.valueOf(wScale))
                            .multiply(wHours);
                        BigDecimal monthlyCommitteeCap = BigDecimal.valueOf(wLimit)
                            .multiply(monthlyWorkerCap);
                        BigDecimal productivity = monthlyCommitteeCap.divide(
                            optimizationConfig.getTotalMaterializationCapacity(), 10, RoundingMode.HALF_UP);
                        BigDecimal co2ForCommittee = productivity.multiply(optimizationConfig.getCo2Allocated())
                            .setScale(6, RoundingMode.HALF_UP);
                        optimizationData.put("co2AllocatedToCommittee", co2ForCommittee);
                    }
                }
            }

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

    /**
     * Endpoint para listar comitês que produzem uma dada materialização social.
     * Usado no modal de seleção de fornecedor na tabela Vetor Tecnológico.
     */
    @GetMapping("/producers-of/{materializationId}")
    public ResponseEntity<?> getProducersOfMaterialization(@PathVariable Integer materializationId) {
        try {
            List<Instance> producers = instanceRepository.findByTypeAndSocialMaterializationId(
                    InstanceType.COMMITTEE, materializationId);

            List<Map<String, Object>> result = new ArrayList<>();
            for (Instance producer : producers) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", producer.getId());
                item.put("committeeName", producer.getCommitteeName());
                item.put("targetQuantity", producer.getTargetQuantity());
                item.put("producedQuantity", producer.getProducedQuantity());
                result.add(item);
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Erro ao buscar produtores da materialização {}", materializationId, e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Endpoint para listar encomendas de produção recebidas por este comitê.
     * Lê da tabela supply_order.
     */
    @GetMapping("/{id}/incoming-orders")
    public ResponseEntity<?> getIncomingOrders(@PathVariable Integer id) {
        try {
            Optional<Instance> committeeOpt = instanceRepository.findById(id);
            if (!committeeOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }

            List<SupplyOrder> supplyOrders = supplyOrderRepository.findBySupplierInstanceIdOrderByCreatedAtDesc(id);
            List<Map<String, Object>> orders = new ArrayList<>();

            for (SupplyOrder so : supplyOrders) {
                Instance orderingCommittee = so.getOrderingInstance();
                if (orderingCommittee == null || orderingCommittee.getId().equals(id)) continue;

                Integer inputMaterializationId = so.getInputMaterialization().getId();

                Map<String, BigDecimal> quantities = orderingCommittee.getTechnologicalQuantitiesByMaterialization();
                BigDecimal inputQuantityPerUnit = BigDecimal.ZERO;
                if (quantities != null) {
                    BigDecimal q = quantities.get(String.valueOf(inputMaterializationId));
                    if (q != null) inputQuantityPerUnit = q;
                }

                String inputUnitName = "";
                if (so.getInputMaterialization() != null && so.getInputMaterialization().getMeasurementUnit() != null) {
                    inputUnitName = so.getInputMaterialization().getMeasurementUnit().getName();
                }

                Map<String, Object> order = new HashMap<>();
                order.put("orderId", so.getId());
                order.put("orderingCommitteeId", orderingCommittee.getId());
                order.put("orderingCommitteeName", orderingCommittee.getCommitteeName());
                order.put("inputMaterializationId", inputMaterializationId);
                order.put("outputMaterializationId", so.getOutputMaterialization().getId());
                order.put("demandedQuantity", so.getQuantity() != null ? so.getQuantity() : inputQuantityPerUnit);
                order.put("inputUnitName", inputUnitName);
                order.put("orderStatus", so.getOrderStatus() != null ? so.getOrderStatus() : "solicitada");
                order.put("createdAt", so.getCreatedAt() != null ? so.getCreatedAt().toString() : "");
                orders.add(order);
            }

            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            logger.error("Erro ao buscar encomendas para comitê {}", id, e);
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Histórico de pedidos de um insumo específico de um comitê.
     */
    @GetMapping("/{id}/orders/history/{inputMatId}")
    public ResponseEntity<?> getOrderHistory(
            @PathVariable Integer id,
            @PathVariable Integer inputMatId) {
        try {
            List<SupplyOrder> orders = supplyOrderRepository
                .findByOrderingInstanceIdAndInputMaterializationIdOrderByCreatedAtDesc(id, inputMatId);

            List<Map<String, Object>> result = new ArrayList<>();
            for (SupplyOrder so : orders) {
                String supplierName = "";
                if (so.getSupplierInstance() != null) {
                    supplierName = so.getSupplierInstance().getCommitteeName();
                }
                String inputUnitName = "";
                if (so.getInputMaterialization() != null && so.getInputMaterialization().getMeasurementUnit() != null) {
                    inputUnitName = so.getInputMaterialization().getMeasurementUnit().getName();
                }
                Map<String, Object> item = new HashMap<>();
                item.put("orderId", so.getId());
                item.put("supplierInstanceId", so.getSupplierInstance() != null ? so.getSupplierInstance().getId() : null);
                item.put("supplierName", supplierName);
                item.put("quantity", so.getQuantity());
                item.put("inputUnitName", inputUnitName);
                item.put("orderStatus", so.getOrderStatus());
                item.put("createdAt", so.getCreatedAt() != null ? so.getCreatedAt().toString() : "");
                result.add(item);
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Erro ao buscar histórico de pedidos", e);
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Criar um novo pedido (encomenda) na tabela supply_order.
     */
    @PostMapping("/{id}/orders/create")
    @Transactional
    public ResponseEntity<?> createOrder(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> payload) {
        try {
            Integer inputMatId = payload.get("inputMaterializationId") != null
                ? Integer.valueOf(payload.get("inputMaterializationId").toString()) : null;
            Integer outputMatId = payload.get("outputMaterializationId") != null
                ? Integer.valueOf(payload.get("outputMaterializationId").toString()) : null;
            Integer supplierId = payload.get("supplierInstanceId") != null
                ? Integer.valueOf(payload.get("supplierInstanceId").toString()) : null;
            BigDecimal quantity = payload.get("quantity") != null
                ? new BigDecimal(payload.get("quantity").toString()) : BigDecimal.ZERO;

            if (inputMatId == null || outputMatId == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Dados insuficientes"));
            }

            Optional<Instance> committeeOpt = instanceRepository.findById(id);
            if (!committeeOpt.isPresent()) return ResponseEntity.notFound().build();
            Instance committee = committeeOpt.get();

            Optional<SocialMaterialization> inputOpt = socialMaterializationRepository.findById(inputMatId);
            Optional<SocialMaterialization> outputOpt = socialMaterializationRepository.findById(outputMatId);

            if (!inputOpt.isPresent() || !outputOpt.isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Entidade não encontrada"));
            }

            SupplyOrder order = new SupplyOrder();
            order.setOrderingInstance(committee);
            order.setInputMaterialization(inputOpt.get());
            order.setOutputMaterialization(outputOpt.get());
            if (supplierId != null && supplierId > 0) {
                Optional<Instance> supplierOpt = instanceRepository.findById(supplierId);
                if (!supplierOpt.isPresent()) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Fornecedor não encontrado"));
                }
                order.setSupplierInstance(supplierOpt.get());
            }
            order.setQuantity(quantity);
            order.setOrderStatus("solicitada");
            order.setCreatedAt(LocalDateTime.now());
            supplyOrderRepository.save(order);

            logger.info("Pedido criado: committee={}, input={}, supplier={}, qty={}",
                id, inputMatId, supplierId, quantity);

            return ResponseEntity.ok(Map.of("success", true, "orderId", order.getId()));
        } catch (Exception e) {
            logger.error("Erro ao criar pedido", e);
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Atualiza o status de uma encomenda (supply_order).
     */
    @PutMapping("/{committeeId}/orders/status")
    @Transactional
    public ResponseEntity<?> updateOrderStatus(
            @PathVariable Integer committeeId,
            @RequestBody Map<String, Object> payload) {
        try {
            Integer orderId = null;
            if (payload.get("orderId") != null) {
                orderId = Integer.valueOf(payload.get("orderId").toString());
            }
            String newStatus = payload.get("orderStatus") != null
                ? payload.get("orderStatus").toString() : null;

            if (orderId == null || newStatus == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "orderId e orderStatus são obrigatórios"
                ));
            }

            Optional<SupplyOrder> orderOpt = supplyOrderRepository.findById(orderId);
            if (!orderOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }

            SupplyOrder order = orderOpt.get();
            order.setOrderStatus(newStatus);
            supplyOrderRepository.save(order);

            logger.info("Status da encomenda atualizado: orderId={}, status={}", orderId, newStatus);
            return ResponseEntity.ok(Map.of("success", true, "orderStatus", newStatus));
        } catch (Exception e) {
            logger.error("Erro ao atualizar status da encomenda", e);
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Distribui horas de trabalho para os trabalhadores associados a este comitê.
     */
    @PostMapping("/{committeeId}/distribute-hours")
    @Transactional
    public ResponseEntity<?> distributeHours(
            @PathVariable Integer committeeId,
            @RequestBody Map<String, Object> payload) {
        try {
            Integer orderId = null;
            if (payload.get("orderId") != null) {
                orderId = Integer.valueOf(payload.get("orderId").toString());
            }
            BigDecimal demandedQuantity = payload.get("demandedQuantity") != null
                ? new BigDecimal(payload.get("demandedQuantity").toString()) : BigDecimal.ZERO;

            if (orderId == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "orderId obrigatório"));
            }

            Optional<SupplyOrder> orderOpt = supplyOrderRepository.findById(orderId);
            if (!orderOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            SupplyOrder order = orderOpt.get();

            // Usar quantity do supply_order se não veio no payload
            if (demandedQuantity.compareTo(BigDecimal.ZERO) == 0 && order.getQuantity() != null) {
                demandedQuantity = order.getQuantity();
            }

            Optional<Instance> committeeOpt = instanceRepository.findById(committeeId);
            if (!committeeOpt.isPresent()) return ResponseEntity.notFound().build();

            // Buscar productionTime
            WorkersProposal.WorkersProposalId wpId = new WorkersProposal.WorkersProposalId();
            wpId.setInstanceId(committeeId);
            Optional<WorkersProposal> wpOpt = workersProposalRepository.findById(wpId);
            BigDecimal productionTime = BigDecimal.ONE;
            if (wpOpt.isPresent() && wpOpt.get().getProductionTime() != null) {
                productionTime = wpOpt.get().getProductionTime();
            }

            BigDecimal totalHours = demandedQuantity.multiply(productionTime);

            // --- Cadeia de arrecadação (otimizada com batch) ---
            Instance committee = committeeOpt.get();
            BigDecimal workersAmount = totalHours;
            Instance currentCouncil = committee.getPopularCouncilAssociatedWithCommitteeOrWorker();

            List<Instance> councilsToUpdate = new ArrayList<>();
            List<CouncilTransaction> transactions = new ArrayList<>();

            while (currentCouncil != null) {
                BigDecimal taxRate = currentCouncil.getTaxRate() != null
                    ? currentCouncil.getTaxRate() : BigDecimal.valueOf(50);
                BigDecimal taxAmount = workersAmount.multiply(taxRate.divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP))
                    .setScale(10, RoundingMode.HALF_UP);
                workersAmount = workersAmount.subtract(taxAmount).setScale(10, RoundingMode.HALF_UP);

                BigDecimal currentBalance = currentCouncil.getBalance() != null
                    ? currentCouncil.getBalance() : BigDecimal.ZERO;
                BigDecimal newBalance = currentBalance.add(taxAmount).setScale(10, RoundingMode.HALF_UP);
                currentCouncil.setBalance(newBalance);
                councilsToUpdate.add(currentCouncil);

                CouncilTransaction ct = new CouncilTransaction();
                ct.setCouncilId(currentCouncil.getId());
                ct.setAmount(taxAmount);
                ct.setTransactionType("CREDIT");
                ct.setDescription("Arrecadação do comitê: " + (committee.getCommitteeName() != null ? committee.getCommitteeName() : "#" + committeeId));
                ct.setSourceName(committee.getCommitteeName());
                ct.setBalanceAfter(newBalance);
                ct.setCreatedAt(LocalDateTime.now());
                transactions.add(ct);

                logger.info("Taxa aplicada: comitê={} → conselho={}, taxa={}%, valor={}, saldo_após={}",
                    committeeId, currentCouncil.getId(), taxRate, taxAmount, newBalance);

                // Subir hierarquia com guarda anti-loop
                Instance parent = currentCouncil.getPopularCouncilAssociatedWithPopularCouncil();
                if (parent != null && parent.getId().equals(currentCouncil.getId())) {
                    logger.warn("Loop detectado na hierarquia: conselho {} referencia a si mesmo. Parando.", currentCouncil.getId());
                    break;
                }
                currentCouncil = parent;
            }

            // Batch save: todas as atualizações de conselhos e transações de uma vez
            if (!councilsToUpdate.isEmpty()) {
                instanceRepository.saveAll(councilsToUpdate);
            }
            if (!transactions.isEmpty()) {
                councilTransactionRepository.saveAll(transactions);
            }

            // --- Distribuir o restante aos trabalhadores (native SQL bulk update, 1 query) ---
            int workerCount = instanceRepository.countWorkersByCommitteeId(committeeId);
            if (workerCount == 0) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Nenhum trabalhador associado"));
            }

            BigDecimal hoursPerWorker = workersAmount.divide(BigDecimal.valueOf(workerCount), 10, RoundingMode.HALF_UP)
                .setScale(10, RoundingMode.HALF_UP);
            instanceRepository.addHoursToCommitteeWorkers(committeeId, hoursPerWorker);

            // Atualizar status para "horas liberadas"
            order.setOrderStatus("horas liberadas");
            supplyOrderRepository.save(order);

            logger.info("Horas distribuídas: comitê={}, total={}, workers={}, worker_share={}, horas_por_worker={}",
                committeeId, totalHours, workerCount, workersAmount, hoursPerWorker);

            return ResponseEntity.ok(Map.of(
                "success", true, "totalHours", totalHours,
                "workersAmount", workersAmount,
                "workerCount", workerCount, "hoursPerWorker", hoursPerWorker
            ));
        } catch (Exception e) {
            logger.error("Erro ao distribuir horas", e);
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Retorna resumo de projetos ativos atribuídos a este comitê.
     */
    @GetMapping("/{id}/projects-summary")
    public ResponseEntity<?> getProjectsSummary(@PathVariable Integer id) {
        try {
            List<SupplyOrder> orders = supplyOrderRepository.findBySupplierInstanceIdOrderByCreatedAtDesc(id);

            BigDecimal totalHours = BigDecimal.ZERO;
            BigDecimal totalDeadline = BigDecimal.ZERO;
            int count = 0;

            for (SupplyOrder so : orders) {
                SocialMaterialization mat = so.getInputMaterialization();
                if (mat != null && mat.getType() == SocialMaterializationType.PROJECT) {
                    String status = so.getOrderStatus();
                    if (!"recusada".equals(status) && !"horas liberadas".equals(status)
                            && !"recebida pelo demandante".equals(status)) {
                        BigDecimal qty = so.getQuantity() != null ? so.getQuantity() : BigDecimal.ZERO;
                        totalHours = totalHours.add(qty);
                        if (mat.getValidityDeadline() != null) {
                            totalDeadline = totalDeadline.add(mat.getValidityDeadline());
                        }
                        count++;
                    }
                }
            }

            BigDecimal avgDeadline = count > 0 && totalDeadline.compareTo(BigDecimal.ZERO) > 0
                ? totalDeadline.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

            Map<String, Object> result = new HashMap<>();
            result.put("hasActiveProjects", count > 0);
            result.put("totalHours", totalHours);
            result.put("avgDeadline", avgDeadline);
            result.put("projectCount", count);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Erro em projects-summary", e);
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Retorna pedidos feitos POR esta instância (como demandante).
     */
    @GetMapping("/{id}/outgoing-orders")
    public ResponseEntity<?> getOutgoingOrders(@PathVariable Integer id) {
        try {
            List<SupplyOrder> orders = supplyOrderRepository.findByOrderingInstanceIdOrderByCreatedAtDesc(id);
            List<Map<String, Object>> result = new ArrayList<>();
            for (SupplyOrder so : orders) {
                Map<String, Object> item = new HashMap<>();
                item.put("orderId", so.getId());
                item.put("inputMaterializationId", so.getInputMaterialization().getId());
                item.put("outputMaterializationId", so.getOutputMaterialization().getId());
                item.put("supplierInstanceId", so.getSupplierInstance() != null ? so.getSupplierInstance().getId() : null);
                item.put("supplierName", so.getSupplierInstance() != null ? so.getSupplierInstance().getCommitteeName() : "");
                item.put("quantity", so.getQuantity());
                item.put("orderStatus", so.getOrderStatus());
                item.put("createdAt", so.getCreatedAt() != null ? so.getCreatedAt().toString() : "");
                String unitName = "";
                if (so.getInputMaterialization().getMeasurementUnit() != null) {
                    unitName = so.getInputMaterialization().getMeasurementUnit().getName();
                }
                item.put("inputUnitName", unitName);
                result.add(item);
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @DeleteMapping("/{committeeId}/orders/{orderId}")
    @Transactional
    public ResponseEntity<?> deleteOrder(@PathVariable Integer committeeId, @PathVariable Integer orderId) {
        try {
            Optional<SupplyOrder> orderOpt = supplyOrderRepository.findById(orderId);
            if (!orderOpt.isPresent()) return ResponseEntity.notFound().build();
            supplyOrderRepository.deleteById(orderId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Lista projetos públicos abertos para lances (supplier_instance_id = NULL, type = PROJECT).
     */
    @Transactional(readOnly = true)
    @GetMapping("/open-projects")
    public ResponseEntity<?> getOpenProjects() {
        try {
            List<SupplyOrder> allOrders = supplyOrderRepository.findAll();
            List<Map<String, Object>> open = new ArrayList<>();
            for (SupplyOrder so : allOrders) {
                if (so.getSupplierInstance() == null && so.getInputMaterialization() != null
                        && so.getInputMaterialization().getType() == SocialMaterializationType.PROJECT
                        && "solicitada".equals(so.getOrderStatus())) {
                    Map<String, Object> item = new HashMap<>();
                    item.put("orderId", so.getId());
                    item.put("projectName", so.getInputMaterialization().getName());
                    String councilName = "";
                    Instance ordInst = so.getOrderingInstance();
                    if (ordInst != null) {
                        councilName = ordInst.getCommitteeName() != null ? ordInst.getCommitteeName()
                            : ("Instância #" + ordInst.getId());
                    }
                    item.put("councilName", councilName);
                    item.put("councilId", so.getOrderingInstance().getId());
                    item.put("quantity", so.getQuantity());
                    item.put("createdAt", so.getCreatedAt() != null ? so.getCreatedAt().toString() : "");
                    open.add(item);
                }
            }
            return ResponseEntity.ok(open);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Comitê dá lance em um projeto aberto.
     */
    @PostMapping("/{committeeId}/projects/{orderId}/bid")
    @Transactional
    public ResponseEntity<?> placeBid(@PathVariable Integer committeeId, @PathVariable Integer orderId,
                                       @RequestBody Map<String, Object> body) {
        try {
            BigDecimal bidHours = new BigDecimal(body.get("bidHours").toString());

            // Validar se o lance não excede o investimento do projeto
            Optional<SupplyOrder> orderOpt = supplyOrderRepository.findById(orderId);
            if (!orderOpt.isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Projeto não encontrado"));
            }
            SupplyOrder order = orderOpt.get();
            if (order.getQuantity() != null && bidHours.compareTo(order.getQuantity()) > 0) {
                return ResponseEntity.badRequest().body(Map.of("success", false,
                    "message", "Lance excede o investimento máximo de " + order.getQuantity().toPlainString() + " h"));
            }

            // Verificar se já existe lance deste comitê
            if (projectBidRepository.findBySupplyOrderIdAndCommitteeId(orderId, committeeId).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("success", false,
                    "message", "Este comitê já enviou um lance para este projeto"));
            }

            ProjectBid bid = new ProjectBid();
            bid.setSupplyOrderId(orderId);
            bid.setCommitteeId(committeeId);
            bid.setBidHours(bidHours);
            projectBidRepository.save(bid);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PutMapping("/{committeeId}/projects/{orderId}/bid")
    @Transactional
    public ResponseEntity<?> updateBid(@PathVariable Integer committeeId, @PathVariable Integer orderId,
                                       @RequestBody Map<String, Object> body) {
        try {
            BigDecimal bidHours = new BigDecimal(body.get("bidHours").toString());
            Optional<ProjectBid> bidOpt = projectBidRepository.findBySupplyOrderIdAndCommitteeId(orderId, committeeId);
            if (!bidOpt.isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Lance não encontrado"));
            }
            Optional<SupplyOrder> orderOpt = supplyOrderRepository.findById(orderId);
            if (orderOpt.isPresent() && orderOpt.get().getQuantity() != null
                    && bidHours.compareTo(orderOpt.get().getQuantity()) > 0) {
                return ResponseEntity.badRequest().body(Map.of("success", false,
                    "message", "Lance excede o investimento máximo de " + orderOpt.get().getQuantity().toPlainString() + " h"));
            }
            ProjectBid bid = bidOpt.get();
            bid.setBidHours(bidHours);
            projectBidRepository.save(bid);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @DeleteMapping("/{committeeId}/projects/{orderId}/bid")
    @Transactional
    public ResponseEntity<?> removeBid(@PathVariable Integer committeeId, @PathVariable Integer orderId) {
        try {
            Optional<ProjectBid> bidOpt = projectBidRepository.findBySupplyOrderIdAndCommitteeId(orderId, committeeId);
            if (!bidOpt.isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Lance não encontrado"));
            }
            projectBidRepository.delete(bidOpt.get());
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}
