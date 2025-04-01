package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.WorkersProposal;
import xyz.planecon.model.entity.WorkersProposal.WorkersProposalId;
import xyz.planecon.repository.InstanceRepository;
import xyz.planecon.repository.WorkersProposalRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/workers-proposal")
public class WorkersProposalController {

    private final WorkersProposalRepository proposalRepository;
    private final InstanceRepository instanceRepository;

    @Autowired
    public WorkersProposalController(WorkersProposalRepository proposalRepository,
                                    InstanceRepository instanceRepository) {
        this.proposalRepository = proposalRepository;
        this.instanceRepository = instanceRepository;
    }

    @GetMapping("/instance/{instanceId}")
    public ResponseEntity<?> getByInstance(@PathVariable Integer instanceId) {
        try {
            Optional<Instance> instanceOpt = instanceRepository.findById(instanceId);
            if (instanceOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            List<WorkersProposal> proposals = proposalRepository.findByInstanceId(instanceId);
            if (proposals.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            // Retorna a primeira proposta encontrada (normalmente só existe uma por comitê)
            WorkersProposal proposal = proposals.get(0);
            
            Map<String, Object> result = new HashMap<>();
            result.put("instanceId", proposal.getInstance().getId());
            result.put("workerLimit", proposal.getWorkerLimit());
            result.put("workerHours", proposal.getWorkerHours());
            result.put("productionTime", proposal.getProductionTime());
            result.put("weeklyScale", proposal.getWeeklyScale());
            result.put("nightShift", proposal.getNightShift());
            result.put("createdAt", proposal.getCreatedAt());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Erro ao buscar proposta: " + e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> createOrUpdate(@RequestBody Map<String, Object> request) {
        try {
            // Extrair dados da requisição
            Integer instanceId = (Integer) request.get("instanceId");
            Integer workerLimit = (Integer) request.get("workerLimit");
            Object workerHoursObj = request.get("workerHours");
            Object productionTimeObj = request.get("productionTime");
            Integer weeklyScale = (Integer) request.get("weeklyScale");
            Boolean nightShift = (Boolean) request.get("nightShift");
            
            // Validações básicas
            if (instanceId == null || workerLimit == null || 
                workerHoursObj == null || productionTimeObj == null || 
                weeklyScale == null || nightShift == null) {
                return ResponseEntity.badRequest()
                    .body("Todos os campos são obrigatórios");
            }
            
            // Conversão para BigDecimal
            BigDecimal workerHours = convertToBigDecimal(workerHoursObj);
            BigDecimal productionTime = convertToBigDecimal(productionTimeObj);
            
            // Validações adicionais
            if (workerLimit <= 0) {
                return ResponseEntity.badRequest()
                    .body("O limite de trabalhadores deve ser maior que zero");
            }
            
            if (workerHours.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest()
                    .body("As horas de trabalho devem ser maiores que zero");
            }
            
            if (productionTime.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest()
                    .body("O tempo de produção deve ser maior que zero");
            }
            
            if (weeklyScale < 1 || weeklyScale > 7) {
                return ResponseEntity.badRequest()
                    .body("A escala semanal deve estar entre 1 e 7 dias");
            }
            
            // Buscar instância
            Optional<Instance> instanceOpt = instanceRepository.findById(instanceId);
            if (instanceOpt.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body("Instância não encontrada: " + instanceId);
            }
            
            // Criar ID composto
            WorkersProposalId id = new WorkersProposalId(instanceId);
            
            // Verificar se já existe proposta para esta instância
            WorkersProposal proposal;
            Optional<WorkersProposal> existingProposal = proposalRepository.findById(id);
            
            if (existingProposal.isPresent()) {
                // Atualizar existente
                proposal = existingProposal.get();
            } else {
                // Criar nova proposta
                proposal = new WorkersProposal();
                proposal.setId(id);
                proposal.setInstance(instanceOpt.get());
                proposal.setCreatedAt(LocalDateTime.now());
            }
            
            // Atualizar dados
            proposal.setWorkerLimit(workerLimit);
            proposal.setWorkerHours(workerHours);
            proposal.setProductionTime(productionTime);
            proposal.setWeeklyScale(weeklyScale);
            proposal.setNightShift(nightShift);
            
            // Salvar
            WorkersProposal saved = proposalRepository.save(proposal);
            
            // Preparar resposta
            Map<String, Object> result = new HashMap<>();
            result.put("instanceId", saved.getInstance().getId());
            result.put("workerLimit", saved.getWorkerLimit());
            result.put("workerHours", saved.getWorkerHours());
            result.put("productionTime", saved.getProductionTime());
            result.put("weeklyScale", saved.getWeeklyScale());
            result.put("nightShift", saved.getNightShift());
            result.put("createdAt", saved.getCreatedAt());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Erro ao salvar proposta: " + e.getMessage());
        }
    }
    
    @DeleteMapping("/{instanceId}")
    public ResponseEntity<?> delete(@PathVariable Integer instanceId) {
        try {
            WorkersProposalId id = new WorkersProposalId(instanceId);
            if (proposalRepository.existsById(id)) {
                proposalRepository.deleteById(id);
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Erro ao excluir proposta: " + e.getMessage());
        }
    }
    
    // Método auxiliar para converter para BigDecimal
    private BigDecimal convertToBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        
        if (value instanceof BigDecimal) {
            return (BigDecimal) value;
        }
        
        if (value instanceof Number) {
            return new BigDecimal(((Number) value).toString());
        }
        
        if (value instanceof String) {
            try {
                return new BigDecimal((String) value);
            } catch (NumberFormatException e) {
                return BigDecimal.ZERO;
            }
        }
        
        return BigDecimal.ZERO;
    }
}