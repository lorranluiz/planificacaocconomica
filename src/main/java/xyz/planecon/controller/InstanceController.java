package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.model.enums.SocialMaterializationType;
import xyz.planecon.repository.InstanceRepository;
import xyz.planecon.model.entity.WorkerOrder;
import xyz.planecon.model.entity.WorkerOrderItem;
import xyz.planecon.repository.WorkerOrderRepository;
import xyz.planecon.repository.SocialMaterializationRepository;
import xyz.planecon.repository.WorkersProposalRepository;
import xyz.planecon.model.entity.WorkersProposal;
import xyz.planecon.service.InstanceService;
import xyz.planecon.dto.InstanceDto;
import xyz.planecon.dto.ErrorResponse;
import java.math.RoundingMode;

import jakarta.persistence.EntityManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@RestController
@RequestMapping("/api/instances") // Mudança da URL base
public class InstanceController {

    private final InstanceService instanceService;

    @Autowired
    public InstanceController(InstanceService instanceService) {
        this.instanceService = instanceService;
    }

    @Autowired
    private InstanceRepository instanceRepository;

    @Autowired
    private SocialMaterializationRepository socialMaterializationRepository;

    @Autowired
    private WorkersProposalRepository workersProposalRepository;

    @Autowired
    private WorkerOrderRepository workerOrderRepository;

    @Autowired
    private EntityManager entityManager;

    /**
     * Endpoint específico para obter detalhes de uma instância WORKER por ID
     * @param id ID da instância worker
     * @return Dados da instância worker
     */
    @GetMapping("/{id}/worker")
    public ResponseEntity<?> getWorkerInstanceById(@PathVariable Integer id) {
        try {
            // Buscar a instância por ID
            InstanceDto instance = instanceService.findWorkerInstanceById(id);
            return ResponseEntity.ok(instance);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse("Worker não encontrado com o ID: " + id, e.getMessage()));
        }
    }

    /**
     * Lista todas as instâncias, com filtro opcional por tipo
     */
    @GetMapping
    public ResponseEntity<List<InstanceDto>> getAllInstances(
            @RequestParam(required = false) String type) {
        
        List<InstanceDto> instances;
        
        if (type != null && !type.isEmpty()) {
            // Converter string para enum InstanceType
            try {
                InstanceType instanceType = InstanceType.valueOf(type);
                instances = instanceService.findAllByType(instanceType);
            } catch (IllegalArgumentException e) {
                // Em caso de tipo inválido, retorna lista vazia
                instances = new ArrayList<>();
            }
        } else {
            instances = instanceService.findAll();
        }
        
        return ResponseEntity.ok(instances);
    }

    @GetMapping("/types")
    public ResponseEntity<?> getInstanceTypes() {
        try {
            List<Map<String, Object>> types = Arrays.stream(InstanceType.values())
                    .filter(type -> type != InstanceType.WORKER)
                    .map(type -> {
                        Map<String, Object> typeInfo = new HashMap<>();
                        typeInfo.put("name", type.name());
                        typeInfo.put("description", getInstanceTypeDescription(type));
                        return typeInfo;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(types);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Erro ao buscar tipos de instância: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getInstanceById(@PathVariable Integer id) {
        try {
            Optional<Instance> instanceOpt = instanceRepository.findById(id);
            if (instanceOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok(convertToDto(instanceOpt.get()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Erro ao buscar instância: " + e.getMessage()));
        }
    }

    @GetMapping("/by-type/{type}")
    public ResponseEntity<?> getInstancesByType(@PathVariable String type) {
        try {
            InstanceType instanceType = InstanceType.valueOf(type.toUpperCase());
            List<Instance> instances = StreamSupport
                .stream(instanceRepository.findByType(instanceType).spliterator(), false)
                .collect(Collectors.toList());
                
            List<Map<String, Object>> result = instances.stream()
                    .map(this::convertToDto)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tipo de instância inválido: " + type));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Erro ao buscar instâncias por tipo: " + e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createInstance(@RequestBody Map<String, Object> payload) {
        try {
            if (!payload.containsKey("type")) {
                return ResponseEntity.badRequest().body(Map.of("message", "O tipo de instância é obrigatório"));
            }

            String typeStr = (String) payload.get("type");
            InstanceType type;
            try {
                type = InstanceType.valueOf(typeStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("message", "Tipo de instância inválido: " + typeStr));
            }
            
            if (type == InstanceType.WORKER) {
                return ResponseEntity.badRequest().body(Map.of(
                    "message", "Instâncias do tipo WORKER são criadas automaticamente ao registrar usuários e não podem ser criadas diretamente."
                ));
            }

            Instance instance = new Instance();
            instance.setType(type);
            instance.setCreatedAt(LocalDateTime.now());

            if (payload.containsKey("committeeName")) {
                instance.setCommitteeName((String) payload.get("committeeName"));
            }

            if (payload.containsKey("socialMaterializationId")) {
                Integer socialMaterializationId = (Integer) payload.get("socialMaterializationId");
                Optional<SocialMaterialization> socMatOpt = socialMaterializationRepository.findById(socialMaterializationId);
                
                if (socMatOpt.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "message", "Materialização social não encontrada com ID: " + socialMaterializationId
                    ));
                }
                
                instance.setSocialMaterialization(socMatOpt.get());
            }

            if (payload.containsKey("producedQuantity")) {
                String producedQty = payload.get("producedQuantity").toString();
                instance.setProducedQuantity(new BigDecimal(producedQty));
            }

            if (payload.containsKey("targetQuantity")) {
                String targetQty = payload.get("targetQuantity").toString();
                instance.setTargetQuantity(new BigDecimal(targetQty));
            }

            if (payload.containsKey("workerEffectiveLimit")) {
                instance.setWorkerEffectiveLimit((Integer) payload.get("workerEffectiveLimit"));
            }

            if (payload.containsKey("totalSocialWorkOfThisJurisdiction")) {
                instance.setTotalSocialWorkOfThisJurisdiction((Integer) payload.get("totalSocialWorkOfThisJurisdiction"));
            }

            if (payload.containsKey("popularCouncilAssociatedWithCommitteeOrWorkerId")) {
                Integer councilId = (Integer) payload.get("popularCouncilAssociatedWithCommitteeOrWorkerId");
                Optional<Instance> councilOpt = instanceRepository.findById(councilId);
                
                if (councilOpt.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "message", "Conselho popular não encontrado com ID: " + councilId
                    ));
                }
                
                instance.setPopularCouncilAssociatedWithCommitteeOrWorker(councilOpt.get());
            }

            if (payload.containsKey("popularCouncilAssociatedWithPopularCouncilId")) {
                Integer councilId = (Integer) payload.get("popularCouncilAssociatedWithPopularCouncilId");
                Optional<Instance> councilOpt = instanceRepository.findById(councilId);
                
                if (councilOpt.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "message", "Conselho popular associado não encontrado com ID: " + councilId
                    ));
                }
                
                instance.setPopularCouncilAssociatedWithPopularCouncil(councilOpt.get());
            }

            if (payload.containsKey("associatedWorkerCommitteeId")) {
                Integer committeeId = (Integer) payload.get("associatedWorkerCommitteeId");
                Optional<Instance> committeeOpt = instanceRepository.findById(committeeId);
                
                if (committeeOpt.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "message", "Comitê de trabalhadores não encontrado com ID: " + committeeId
                    ));
                }
                
                instance.setAssociatedWorkerCommittee(committeeOpt.get());
            }

            instance.setIdAssociatedWorkerResidentsAssociation(null);            

            switch (type) {
                case COMMITTEE:
                    final Integer councilId = (Integer) payload.get("popularCouncilAssociatedWithCommitteeOrWorkerId");
                    final Integer socialMatId = (Integer) payload.get("socialMaterializationId");
                    final Integer totalSocialWork = (Integer) payload.get("totalSocialWorkOfThisJurisdiction");
                    final Object producedQty = payload.get("producedQuantity");
                    final Object targetQty = payload.get("targetQuantity");
                    
                    if (councilId == null || socialMatId == null || 
                        totalSocialWork == null || producedQty == null || targetQty == null) {
                        return ResponseEntity.badRequest().body(Map.of(
                            "message", "Para comitês, todos os campos marcados com * são obrigatórios"
                        ));
                    }
                    
                    BigDecimal produced = new BigDecimal(producedQty.toString());
                    BigDecimal target = new BigDecimal(targetQty.toString());
                    
                    if (target.compareTo(produced) <= 0) {
                        return ResponseEntity.badRequest().body(Map.of(
                            "message", "A quantidade meta deve ser maior que a quantidade produzida"
                        ));
                    }
                    
                    Optional<Instance> councilOpt = instanceRepository.findById(councilId);
                    if (councilOpt.isEmpty() || councilOpt.get().getType() != InstanceType.POPULARCOUNCIL) {
                        return ResponseEntity.badRequest().body(Map.of(
                            "message", "Conselho popular não encontrado ou inválido com ID: " + councilId
                        ));
                    }
                    
                    Optional<SocialMaterialization> matOpt = socialMaterializationRepository.findById(socialMatId);
                    if (matOpt.isEmpty()) {
                        return ResponseEntity.badRequest().body(Map.of(
                            "message", "Materialização social não encontrada com ID: " + socialMatId
                        ));
                    }
                    
                    instance.setPopularCouncilAssociatedWithCommitteeOrWorker(councilOpt.get());
                    instance.setTotalSocialWorkOfThisJurisdiction(totalSocialWork);
                    instance.setSocialMaterialization(matOpt.get());
                    instance.setProducedQuantity(produced);
                    instance.setTargetQuantity(target);
                    
                    if (payload.containsKey("workerEffectiveLimit")) {
                        instance.setWorkerEffectiveLimit((Integer) payload.get("workerEffectiveLimit"));
                    }
                    break;
            }

            Instance savedInstance = instanceRepository.save(instance);
            return ResponseEntity.ok(convertToDto(savedInstance));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Erro ao criar instância: " + e.getMessage()));
        }
    }

    @GetMapping("/councils")
    public ResponseEntity<?> getAllCouncils() {
        try {
            List<Instance> councils = StreamSupport
                .stream(instanceRepository.findByType(InstanceType.POPULARCOUNCIL).spliterator(), false)
                .collect(Collectors.toList());
                
            List<Map<String, Object>> result = councils.stream()
                    .map(this::convertToDto)
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Erro ao buscar conselhos: " + e.getMessage()));
        }
    }

    @GetMapping("/committees")
    public ResponseEntity<?> getAllCommitteeInstances() {
        try {
            List<Instance> committees = instanceRepository.findAllCommittees();
            
            List<Map<String, Object>> result = new ArrayList<>();
            for (Instance committee : committees) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", committee.getId());
                item.put("name", committee.getCommitteeName());
                item.put("type", committee.getType());
                result.add(item);
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Erro ao buscar instâncias de comitê: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @GetMapping("/workers")
    public ResponseEntity<?> getAllWorkers() {
        try {
            List<Instance> workers = StreamSupport
                .stream(instanceRepository.findByType(InstanceType.WORKER).spliterator(), false)
                .collect(Collectors.toList());
                
            List<Map<String, Object>> result = workers.stream()
                    .map(this::convertToDto)
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Erro ao buscar trabalhadores: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/produced-quantity")
    public ResponseEntity<?> updateProducedQuantity(@PathVariable Integer id, @RequestBody Map<String, Object> payload) {
        try {
            Optional<Instance> instanceOpt = instanceRepository.findById(id);
            if (!instanceOpt.isPresent()) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Instância não encontrada");
                return ResponseEntity.status(404).body(response);
            }
            
            Instance instance = instanceOpt.get();
            
            BigDecimal producedQuantity = null;
            
            if (payload.get("producedQuantity") instanceof Number) {
                producedQuantity = new BigDecimal(payload.get("producedQuantity").toString());
            } else if (payload.get("producedQuantity") instanceof String) {
                producedQuantity = new BigDecimal((String) payload.get("producedQuantity"));
            } else {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Quantidade produzida inválida");
                return ResponseEntity.badRequest().body(response);
            }
            
            instance.setProducedQuantity(producedQuantity);
            Instance saved = instanceRepository.save(instance);
            
            Map<String, Object> response = new HashMap<>();
            response.put("id", saved.getId());
            response.put("producedQuantity", saved.getProducedQuantity());
            if (saved.getTargetQuantity() != null) {
                response.put("targetQuantity", saved.getTargetQuantity());
                response.put("remainingQuantity", saved.getTargetQuantity().subtract(saved.getProducedQuantity()));
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> response = new HashMap<>();
            response.put("message", "Erro ao atualizar quantidade produzida: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @Transactional(readOnly = true)
    private Integer getResidentsAssociationIdDirectly(Integer instanceId) {
        try {
            Object result = entityManager.createNativeQuery(
                "SELECT id_associated_worker_residents_association FROM instance WHERE id = :id")
                .setParameter("id", instanceId)
                .getSingleResult();
            
            return (result != null) ? ((Number) result).intValue() : null;
        } catch (Exception e) {
            System.err.println("Erro ao obter id_associated_worker_residents_association para instance " + 
                instanceId + ": " + e.getMessage());
            return null;
        }
    }

    private Map<String, Object> convertToDto(Instance instance) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", instance.getId());
        dto.put("type", instance.getType().toString());
        dto.put("typeName", getInstanceTypeDescription(instance.getType()));
        dto.put("createdAt", instance.getCreatedAt());
        
        if (instance.getCommitteeName() != null) {
            dto.put("committeeName", instance.getCommitteeName());
        }
        
        if (instance.getWorkerEffectiveLimit() != null) {
            dto.put("workerEffectiveLimit", instance.getWorkerEffectiveLimit());
        }
        
        if (instance.getProducedQuantity() != null) {
            dto.put("producedQuantity", instance.getProducedQuantity());
        }
        
        if (instance.getTargetQuantity() != null) {
            dto.put("targetQuantity", instance.getTargetQuantity());
        }
        
        if (instance.getTotalSocialWorkOfThisJurisdiction() != null) {
            dto.put("totalSocialWorkOfThisJurisdiction", instance.getTotalSocialWorkOfThisJurisdiction());
        }
        
        if (instance.getSocialMaterialization() != null) {
            Map<String, Object> matInfo = new HashMap<>();
            matInfo.put("id", instance.getSocialMaterialization().getId());
            matInfo.put("name", instance.getSocialMaterialization().getName());
            matInfo.put("type", instance.getSocialMaterialization().getType().toString());
            dto.put("socialMaterialization", matInfo);
        }
        
        if (instance.getPopularCouncilAssociatedWithCommitteeOrWorker() != null) {
            Map<String, Object> council = new HashMap<>();
            council.put("id", instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getId());
            council.put("type", instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getType().toString());
            council.put("committeeName", instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getCommitteeName());
            dto.put("popularCouncilAssociatedWithCommitteeOrWorker", council);
        }
        
        if (instance.getPopularCouncilAssociatedWithPopularCouncil() != null) {
            Map<String, Object> council = new HashMap<>();
            council.put("id", instance.getPopularCouncilAssociatedWithPopularCouncil().getId());
            council.put("type", instance.getPopularCouncilAssociatedWithPopularCouncil().getType().toString());
            council.put("committeeName", instance.getPopularCouncilAssociatedWithPopularCouncil().getCommitteeName());
            dto.put("popularCouncilAssociatedWithPopularCouncil", council);
        }
        
        if (instance.getAssociatedWorkerCommittee() != null) {
            Map<String, Object> committee = new HashMap<>();
            committee.put("id", instance.getAssociatedWorkerCommittee().getId());
            committee.put("type", instance.getAssociatedWorkerCommittee().getType().toString());
            committee.put("committeeName", instance.getAssociatedWorkerCommittee().getCommitteeName());
            dto.put("associatedWorkerCommittee", committee);
        }
        
        dto.put("associatedWorkerResidentsAssociation", null);
        
        return dto;
    }
    
    private String getInstanceTypeDescription(InstanceType type) {
        if (type == InstanceType.POPULARCOUNCIL) {
            return "Conselho Popular";
        } else if (type == InstanceType.COMMITTEE) {
            return "Comitê de Trabalhadores";
        } else if (type == InstanceType.WORKER) {
            return "Trabalhador";
        } else {
            return type.toString();
        }
    }

    /**
     * Retorna todas as instâncias filhas de uma dada instância
     */
    @GetMapping("/{id}/children")
    public ResponseEntity<?> getChildInstances(@PathVariable Integer id) {
        try {
            Instance instance = instanceRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Instância não encontrada: " + id));

            List<Instance> children = new ArrayList<>();
            children.addAll(instanceRepository.findByPopularCouncilAssociatedWithCommitteeOrWorker(instance));
            children.addAll(instanceRepository.findByPopularCouncilAssociatedWithPopularCouncil(instance));

            // Workers associados como membros de um comitê
            List<Instance> workerMembers = instanceRepository.findByAssociatedWorkerCommitteeId(id);
            for (Instance w : workerMembers) {
                if (children.stream().noneMatch(c -> c.getId().equals(w.getId()))) {
                    children.add(w);
                }
            }

            // Filtrar para não incluir a própria instância
            children = children.stream()
                    .filter(c -> !c.getId().equals(id))
                    .collect(Collectors.toList());

            List<Map<String, Object>> result = children.stream().map(c -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", c.getId());
                map.put("type", c.getType() != null ? c.getType().toString() : "");
                map.put("typeName", c.getType() != null ? getInstanceTypeDescription(c.getType()) : "");
                map.put("committeeName", c.getCommitteeName());
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Erro ao buscar instâncias filhas", e.getMessage()));
        }
    }

    /**
     * Retorna os trabalhadores associados a um comitê.
     */
    @GetMapping("/{id}/workers")
    public ResponseEntity<?> getCommitteeWorkers(@PathVariable Integer id) {
        try {
            List<Instance> workers = instanceRepository.findByAssociatedWorkerCommitteeId(id);
            List<Map<String, Object>> result = new ArrayList<>();
            for (Instance w : workers) {
                Map<String, Object> map = new HashMap<>();
                map.put("id", w.getId());
                map.put("name", w.getCommitteeName() != null ? w.getCommitteeName() : ("Trabalhador #" + w.getId()));
                map.put("hoursAtElectronicPoint", w.getHoursAtElectronicPoint());
                map.put("sociallyConfirmedWorkTime", w.getSociallyConfirmedWorkTime());
                result.add(map);
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Erro ao buscar trabalhadores", e.getMessage()));
        }
    }

    /**
     * Exclui uma instância e todos os seus dados relacionados
     */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteInstance(@PathVariable Integer id) {
        try {
            Instance instance = instanceRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Instância não encontrada: " + id));

            // Verificar se tem instâncias filhas
            List<Instance> children = new ArrayList<>();
            children.addAll(instanceRepository.findByPopularCouncilAssociatedWithCommitteeOrWorker(instance));
            children.addAll(instanceRepository.findByPopularCouncilAssociatedWithPopularCouncil(instance));

            List<Instance> workerMembers = instanceRepository.findByAssociatedWorkerCommitteeId(id);
            for (Instance w : workerMembers) {
                if (children.stream().noneMatch(c -> c.getId().equals(w.getId()))) {
                    children.add(w);
                }
            }
            children = children.stream().filter(c -> !c.getId().equals(id)).collect(Collectors.toList());

            if (!children.isEmpty()) {
                Map<String, Object> errorBody = new HashMap<>();
                errorBody.put("message", "Esta instância possui instâncias filhas associadas. Exclua-as primeiro.");
                errorBody.put("childCount", children.size());
                return ResponseEntity.status(HttpStatus.CONFLICT).body(errorBody);
            }

            // Excluir dados relacionados via native queries
            entityManager.createNativeQuery("DELETE FROM demand_vector WHERE id_instance = :id")
                    .setParameter("id", id).executeUpdate();
            entityManager.createNativeQuery("DELETE FROM demand_stock WHERE id_instance = :id")
                    .setParameter("id", id).executeUpdate();
            entityManager.createNativeQuery("DELETE FROM technological_tensor WHERE id_instance = :id")
                    .setParameter("id", id).executeUpdate();
            entityManager.createNativeQuery("DELETE FROM optimization_inputs_results WHERE id_instance = :id")
                    .setParameter("id", id).executeUpdate();
            entityManager.createNativeQuery("DELETE FROM workers_proposal WHERE instance_id = :id")
                    .setParameter("id", id).executeUpdate();

            // Excluir a instância
            instanceRepository.delete(instance);

            return ResponseEntity.ok(Map.of("message", "Instância excluída com sucesso", "id", id));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Erro ao excluir instância", e.getMessage()));
        }
    }

    /**
     * Retorna a soma total de horas trabalhadas de todos os trabalhadores.
     */
    @GetMapping("/total-worker-hours")
    public ResponseEntity<?> getTotalWorkerHours() {
        try {
            java.math.BigDecimal total = instanceRepository.sumWorkerHours();
            return ResponseEntity.ok(Map.of("totalWorkerHours", total != null ? total : BigDecimal.ZERO));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erro ao calcular total de horas: " + e.getMessage()));
        }
    }

    /**
     * Endpoint para a loja do trabalhador: retorna materializações com preço = tempo de produção direto.
     * Preço = productionTime (horas).
     */
    @GetMapping("/{workerId}/shop")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getWorkerShopData(@PathVariable Integer workerId) {
        try {
            // Buscar o trabalhador
            Instance worker = instanceRepository.findById(workerId)
                .orElse(null);
            if (worker == null || worker.getType() != InstanceType.WORKER) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Trabalhador não encontrado com ID: " + workerId));
            }

            // Buscar todas as materializações
            List<SocialMaterialization> materializations = socialMaterializationRepository.findAll();

            // Para cada materialização, calcular o tempo de produção médio
            List<Map<String, Object>> products = new ArrayList<>();
            for (SocialMaterialization mat : materializations) {
                // Pular materializações do tipo PROJECT (só Produtos e Serviços na loja)
                if (mat.getType() == SocialMaterializationType.PROJECT) continue;

                // Buscar comitês que produzem esta materialização
                List<Instance> committees = instanceRepository.findByTypeAndSocialMaterializationId(
                    InstanceType.COMMITTEE, mat.getId());

                // Calcular tempo de produção médio dos comitês
                BigDecimal avgProductionTime = BigDecimal.ZERO;
                int count = 0;
                for (Instance committee : committees) {
                    List<WorkersProposal> proposals = workersProposalRepository.findByInstanceId(committee.getId());
                    if (!proposals.isEmpty()) {
                        WorkersProposal wp = proposals.get(0);
                        BigDecimal pt = wp.getProductionTime();
                        if (pt != null && pt.compareTo(BigDecimal.ZERO) > 0) {
                            avgProductionTime = avgProductionTime.add(pt);
                            count++;
                        }
                    }
                }
                if (count > 0) {
                    avgProductionTime = avgProductionTime.divide(BigDecimal.valueOf(count), 4, RoundingMode.HALF_UP);
                }

                Map<String, Object> product = new HashMap<>();
                product.put("id", mat.getId());
                product.put("name", mat.getName());
                product.put("type", mat.getType().toString());
                product.put("price", avgProductionTime.setScale(4, RoundingMode.HALF_UP));
                product.put("productionTime", avgProductionTime);
                products.add(product);
            }

            Map<String, Object> result = new HashMap<>();
            result.put("products", products);
            BigDecimal confirmedTime = worker.getSociallyConfirmedWorkTime() != null
                ? worker.getSociallyConfirmedWorkTime() : BigDecimal.ZERO;
            result.put("sociallyConfirmedWorkTime", confirmedTime);
            result.put("workerHours", worker.getHoursAtElectronicPoint());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erro ao carregar dados da loja: " + e.getMessage()));
        }
    }

    /**
     * Retorna o histórico de pedidos de um trabalhador.
     */
    @GetMapping("/{workerId}/orders")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getWorkerOrders(@PathVariable Integer workerId) {
        try {
            Instance worker = instanceRepository.findById(workerId).orElse(null);
            if (worker == null || worker.getType() != InstanceType.WORKER) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Trabalhador não encontrado com ID: " + workerId));
            }

            List<WorkerOrder> orders = workerOrderRepository.findByWorkerIdOrderByOrderDateDesc(workerId);
            List<Map<String, Object>> result = new ArrayList<>();

            for (WorkerOrder order : orders) {
                Map<String, Object> orderMap = new HashMap<>();
                orderMap.put("id", order.getId());
                orderMap.put("date", order.getOrderDate().toString());
                orderMap.put("total", order.getTotal());
                orderMap.put("status", order.getStatus());

                List<Map<String, Object>> itemsList = new ArrayList<>();
                for (WorkerOrderItem item : order.getItems()) {
                    Map<String, Object> itemMap = new HashMap<>();
                    itemMap.put("id", item.getSocialMaterializationId());
                    itemMap.put("name", item.getProductName());
                    itemMap.put("type", item.getProductType());
                    itemMap.put("price", item.getPrice());
                    itemMap.put("quantity", item.getQuantity());
                    itemMap.put("subtotal", item.getSubtotal());
                    itemsList.add(itemMap);
                }
                orderMap.put("items", itemsList);
                result.add(orderMap);
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erro ao carregar pedidos: " + e.getMessage()));
        }
    }

    /**
     * Cria um novo pedido para o trabalhador, deduzindo do Tempo de Trabalho Socialmente Confirmado.
     */
    @PostMapping("/{workerId}/orders")
    @Transactional
    public ResponseEntity<?> createWorkerOrder(@PathVariable Integer workerId, @RequestBody Map<String, Object> body) {
        try {
            Instance worker = instanceRepository.findById(workerId).orElse(null);
            if (worker == null || worker.getType() != InstanceType.WORKER) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Trabalhador não encontrado com ID: " + workerId));
            }

            // Verificar saldo (Tempo de Trabalho Socialmente Confirmado)
            BigDecimal currentConfirmedTime = worker.getSociallyConfirmedWorkTime();
            if (currentConfirmedTime == null) {
                currentConfirmedTime = BigDecimal.ZERO;
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) body.get("items");
            if (items == null || items.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "O pedido deve conter pelo menos um item"));
            }

            // Calcular total e criar itens
            BigDecimal orderTotal = BigDecimal.ZERO;
            WorkerOrder order = new WorkerOrder();
            order.setWorker(worker);
            order.setStatus("pending");

            for (Map<String, Object> itemData : items) {
                Integer matId = ((Number) itemData.get("id")).intValue();
                String name = (String) itemData.get("name");
                String type = (String) itemData.get("type");
                BigDecimal price = new BigDecimal(itemData.get("price").toString());
                int quantity = ((Number) itemData.get("quantity")).intValue();
                BigDecimal subtotal = price.multiply(BigDecimal.valueOf(quantity));

                WorkerOrderItem orderItem = new WorkerOrderItem();
                orderItem.setOrder(order);
                orderItem.setSocialMaterializationId(matId);
                orderItem.setProductName(name);
                orderItem.setProductType(type);
                orderItem.setPrice(price);
                orderItem.setQuantity(quantity);
                orderItem.setSubtotal(subtotal);
                order.getItems().add(orderItem);

                orderTotal = orderTotal.add(subtotal);
            }

            // Verificar saldo suficiente
            if (orderTotal.compareTo(currentConfirmedTime) > 0) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Saldo insuficiente"));
            }

            order.setTotal(orderTotal);

            // Deduzir do Tempo de Trabalho Socialmente Confirmado
            BigDecimal newConfirmedTime = currentConfirmedTime.subtract(orderTotal);
            worker.setSociallyConfirmedWorkTime(newConfirmedTime);

            // Salvar pedido e atualizar trabalhador
            workerOrderRepository.save(order);
            instanceRepository.save(worker);

            // Retornar resposta
            Map<String, Object> response = new HashMap<>();
            response.put("orderId", order.getId());
            response.put("total", order.getTotal());
            response.put("status", order.getStatus());
            response.put("newConfirmedTime", newConfirmedTime.setScale(2, RoundingMode.HALF_UP));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erro ao criar pedido: " + e.getMessage()));
        }
    }

    /**
     * Resgata as horas do ponto eletrônico como participação social.
     * Incrementa estimatedIndividualParticipationInSocialWork com (workerHours / totalWorkerHours) × totalSocialWork
     * e zera hoursAtElectronicPoint.
     */
    @PostMapping("/{workerId}/redeem-participation")
    @Transactional
    public ResponseEntity<?> redeemParticipation(@PathVariable Integer workerId) {
        try {
            Instance worker = instanceRepository.findById(workerId).orElse(null);
            if (worker == null || worker.getType() != InstanceType.WORKER) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Trabalhador não encontrado com ID: " + workerId));
            }

            BigDecimal workerHours = worker.getHoursAtElectronicPoint();
            if (workerHours == null || workerHours.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Não há horas no ponto eletrônico para resgatar"));
            }

            // Mesma lógica do shop endpoint para totalSocialWork e totalWorkerHours
            Instance plannerCouncil = instanceRepository.findById(1).orElse(null);

            BigDecimal totalSocialWork = BigDecimal.ZERO;
            if (plannerCouncil != null) {
                if (plannerCouncil.getTotalSocialWork() != null
                        && plannerCouncil.getTotalSocialWork().compareTo(BigDecimal.ZERO) > 0) {
                    totalSocialWork = plannerCouncil.getTotalSocialWork();
                } else if (plannerCouncil.getTotalSocialWorkOfThisJurisdiction() != null
                        && plannerCouncil.getTotalSocialWorkOfThisJurisdiction() > 0) {
                    totalSocialWork = BigDecimal.valueOf(plannerCouncil.getTotalSocialWorkOfThisJurisdiction());
                }
            }
            if (totalSocialWork.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Trabalho social total não disponível para calcular participação"));
            }

            BigDecimal totalWorkerHours = (plannerCouncil != null && plannerCouncil.getTotalWorkerHours() != null)
                ? plannerCouncil.getTotalWorkerHours()
                : instanceRepository.sumWorkerHours();
            if (totalWorkerHours == null || totalWorkerHours.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Total de horas dos trabalhadores não disponível"));
            }

            // increment = workerHours / totalWorkerHours × totalSocialWork  (anterior)
            // Agora: increment = workerHours / totalWorkerHours
            // Mantido como comentário acima a fórmula antiga para registro.
            BigDecimal increment = workerHours
                .divide(totalWorkerHours, 15, RoundingMode.HALF_UP);

            BigDecimal currentParticipation = worker.getEstimatedIndividualParticipationInSocialWork();
            if (currentParticipation == null) {
                currentParticipation = BigDecimal.ZERO;
            }
            BigDecimal newParticipation = currentParticipation.add(increment);

            worker.setEstimatedIndividualParticipationInSocialWork(newParticipation);
            worker.setHoursAtElectronicPoint(BigDecimal.ZERO);
            instanceRepository.save(worker);

            // Escala: 1600000 / 4 = 400000 (%4e5)
            long numeroAproximadoDeTrabalhadores = 1600000L;
            BigDecimal socialWorkAndCostScale = BigDecimal.valueOf(numeroAproximadoDeTrabalhadores)
                .divide(BigDecimal.valueOf(4));

            BigDecimal newBalance = newParticipation.multiply(socialWorkAndCostScale)
                .setScale(2, RoundingMode.HALF_UP);

            Map<String, Object> response = new HashMap<>();
            response.put("newParticipation", newParticipation);
            response.put("newBalance", newBalance);
            response.put("newHours", BigDecimal.ZERO);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erro ao resgatar participação: " + e.getMessage()));
        }
    }

    /**
     * Bate ponto somando horas ao ponto eletrônico do trabalhador.
     */
    @PostMapping("/{workerId}/add-hours")
    @Transactional
    public ResponseEntity<?> addWorkerHours(@PathVariable Integer workerId, @RequestBody Map<String, Object> payload) {
        try {
            if (!payload.containsKey("hoursToAdd")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Campo hoursToAdd é obrigatório"));
            }

            BigDecimal hoursToAdd = new BigDecimal(payload.get("hoursToAdd").toString());
            if (hoursToAdd.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "O valor de horas deve ser maior que zero"));
            }

            Instance worker = instanceRepository.findById(workerId).orElse(null);
            if (worker == null || worker.getType() != InstanceType.WORKER) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Trabalhador não encontrado com ID: " + workerId));
            }

            BigDecimal currentHours = worker.getHoursAtElectronicPoint();
            if (currentHours == null) {
                currentHours = BigDecimal.ZERO;
            }

            BigDecimal newHours = currentHours.add(hoursToAdd);
            worker.setHoursAtElectronicPoint(newHours);
            instanceRepository.save(worker);

            return ResponseEntity.ok(Map.of("workerId", worker.getId(), "hoursAtElectronicPoint", newHours));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Valor de horas inválido"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erro ao somar horas: " + e.getMessage()));
        }
    }

    /**
     * Cancela e exclui um pedido pendente, ressarcindo o valor ao trabalhador.
     */
    @DeleteMapping("/{workerId}/orders/{orderId}")
    @Transactional
    public ResponseEntity<?> cancelWorkerOrder(@PathVariable Integer workerId, @PathVariable Integer orderId) {
        try {
            Instance worker = instanceRepository.findById(workerId).orElse(null);
            if (worker == null || worker.getType() != InstanceType.WORKER) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Trabalhador não encontrado com ID: " + workerId));
            }

            WorkerOrder order = workerOrderRepository.findById(orderId).orElse(null);
            if (order == null || !order.getWorker().getId().equals(workerId)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Pedido não encontrado com ID: " + orderId));
            }

            if (!"pending".equals(order.getStatus())) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Apenas pedidos com status pendente podem ser cancelados"));
            }

            // Escala: 1600000 / 4 = 400000 (%4e5)
            long numeroAproximadoDeTrabalhadores = 1600000L;
            BigDecimal socialWorkAndCostScale = BigDecimal.valueOf(numeroAproximadoDeTrabalhadores)
                .divide(BigDecimal.valueOf(4));

            // Ressarcir o valor: newParticipation = current + (orderTotal / scale)
            BigDecimal currentParticipation = worker.getEstimatedIndividualParticipationInSocialWork();
            if (currentParticipation == null) {
                currentParticipation = BigDecimal.ZERO;
            }
            BigDecimal refund = order.getTotal().divide(socialWorkAndCostScale, 10, RoundingMode.HALF_UP);
            BigDecimal newParticipation = currentParticipation.add(refund);
            worker.setEstimatedIndividualParticipationInSocialWork(newParticipation);

            // Excluir o pedido e salvar o trabalhador
            workerOrderRepository.delete(order);
            instanceRepository.save(worker);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Pedido cancelado e valor ressarcido com sucesso");
            response.put("newParticipation", newParticipation);
            response.put("newBalance", newParticipation.multiply(socialWorkAndCostScale).setScale(2, RoundingMode.HALF_UP));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erro ao cancelar pedido: " + e.getMessage()));
        }
    }
}
