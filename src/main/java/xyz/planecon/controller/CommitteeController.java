package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.CacheEvict;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import xyz.planecon.dto.CommitteeStateDTO;
import xyz.planecon.model.entity.*;
import xyz.planecon.repository.*;
import xyz.planecon.model.entity.TechnologicalTensor.TechnologicalTensorId;
import xyz.planecon.model.entity.DemandStock.DemandStockId;
import xyz.planecon.model.entity.DemandVector.DemandVectorId;
import xyz.planecon.model.enums.UserType;
import xyz.planecon.model.enums.PronounType;

import java.time.LocalDateTime;
import java.util.*;
import java.math.BigDecimal;

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

    /**
     * Endpoint para salvar o estado completo de um comitê em uma única transação.
     * 
     * @param committeeStateDTO DTO contendo todo o estado da página do comitê
     * @return ResponseEntity com o resultado da operação
     */
    @PostMapping("/save-state")
    @Transactional
    @CacheEvict(value = {"materializations", "instances", "technologicalMatrix", "demandVector", "planificationResults"}, allEntries = true)
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
                continue;
            }
            
            // Processar demanda
            if (matDTO.getDemand() != null) {
                saveDemandVector(committee, matDTO.getId(), matDTO.getDemand());
            }
            
            // Processar estoque
            if (matDTO.getStock() != null) {
                saveDemandStock(committee, matDTO.getId(), matDTO.getStock(), matDTO.getDemand());
            }
            
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
        // Excluir vetores de demanda
        DemandVectorId demandVectorId = new DemandVectorId(committeeId, materializationId);
        if (demandVectorRepository.existsById(demandVectorId)) {
            demandVectorRepository.deleteById(demandVectorId);
        }
        
        // Excluir estoques de demanda
        DemandStockId demandStockId = new DemandStockId(committeeId, materializationId);
        if (demandStockRepository.existsById(demandStockId)) {
            demandStockRepository.deleteById(demandStockId);
        }
        
        // Excluir tensores tecnológicos relacionados
        technologicalTensorRepository.deleteByInstanceIdAndMaterializationId(committeeId, materializationId);
        
        logger.info("Dados da materialização {} excluídos para comitê {}", materializationId, committeeId);
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
        List<CommitteeStateDTO.MaterializationStateDTO> materializationDTOs = new ArrayList<>();
        
        // Buscar todas as materializações que têm relação com este comitê
        
        // 1. Primeiro, buscar as materializações na matriz tecnológica (tensores)
        List<TechnologicalTensor> tensors = technologicalTensorRepository.findByInstanceId(committee.getId());
        
        // Mapa para deduplição
        Map<Integer, CommitteeStateDTO.MaterializationStateDTO> matMap = new HashMap<>();
        
        // Processar materializações de entrada dos tensores
        for (TechnologicalTensor tensor : tensors) {
            SocialMaterialization inputMat = tensor.getInputSocialMaterialization();
            SocialMaterialization outputMat = tensor.getOutputSocialMaterialization();
            
            // Processar materialização de entrada
            CommitteeStateDTO.MaterializationStateDTO inputMatDTO = matMap.get(inputMat.getId());
            if (inputMatDTO == null) {
                inputMatDTO = new CommitteeStateDTO.MaterializationStateDTO();
                inputMatDTO.setId(inputMat.getId());
                inputMatDTO.setName(inputMat.getName());
                inputMatDTO.setType(inputMat.getType().name());
                inputMatDTO.setTechnologicalTensors(new HashMap<>());
                matMap.put(inputMat.getId(), inputMatDTO);
            }
            
            // Adicionar tensor ao mapa de tensores da materialização
            inputMatDTO.getTechnologicalTensors().put(
                String.valueOf(outputMat.getId()),
                tensor.getTechnicalCoefficientElementValue()
            );
            
            // Também adicionar materialização de saída se ainda não foi processada
            if (!matMap.containsKey(outputMat.getId())) {
                CommitteeStateDTO.MaterializationStateDTO outputMatDTO = new CommitteeStateDTO.MaterializationStateDTO();
                outputMatDTO.setId(outputMat.getId());
                outputMatDTO.setName(outputMat.getName());
                outputMatDTO.setType(outputMat.getType().name());
                outputMatDTO.setTechnologicalTensors(new HashMap<>());
                matMap.put(outputMat.getId(), outputMatDTO);
            }
        }
        
        // 2. Agora, buscar os estoques e demandas
        List<DemandStock> stocks = demandStockRepository.findByInstance(committee);
        
        for (DemandStock stock : stocks) {
            SocialMaterialization mat = stock.getSocialMaterialization();
            
            // Buscar no mapa ou criar novo
            CommitteeStateDTO.MaterializationStateDTO matDTO = matMap.get(mat.getId());
            if (matDTO == null) {
                matDTO = new CommitteeStateDTO.MaterializationStateDTO();
                matDTO.setId(mat.getId());
                matDTO.setName(mat.getName());
                matDTO.setType(mat.getType().name());
                matDTO.setTechnologicalTensors(new HashMap<>());
                matMap.put(mat.getId(), matDTO);
            }
            
            // Adicionar dados de estoque e demanda
            matDTO.setStock(stock.getStock());
            matDTO.setDemand(stock.getDemand());
        }
        
        // 3. Buscar vetores de demanda (para o caso de materializações que têm só demanda sem estoque)
        List<DemandVector> demands = demandVectorRepository.findByInstanceId(committee.getId());
        
        for (DemandVector demand : demands) {
            SocialMaterialization mat = demand.getSocialMaterialization();
            
            // Buscar no mapa ou criar novo
            CommitteeStateDTO.MaterializationStateDTO matDTO = matMap.get(mat.getId());
            if (matDTO == null) {
                matDTO = new CommitteeStateDTO.MaterializationStateDTO();
                matDTO.setId(mat.getId());
                matDTO.setName(mat.getName());
                matDTO.setType(mat.getType().name());
                matDTO.setTechnologicalTensors(new HashMap<>());
                matMap.put(mat.getId(), matDTO);
            }
            
            // Adicionar dados de demanda (se ainda não foi definido pelo DemandStock)
            if (matDTO.getDemand() == null) {
                matDTO.setDemand(demand.getDemand() != null ? 
                    demand.getDemand() : BigDecimal.ZERO);
            }
        }
        
        // Converter mapa em lista
        return new ArrayList<>(matMap.values());
    }
}
