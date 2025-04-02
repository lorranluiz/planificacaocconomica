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

    @Autowired
    private WorkersProposalRepository workersProposalRepository;

    @Autowired
    private InstanceRepository instanceRepository;

    @GetMapping("/instance/{instanceId}")
    public ResponseEntity<?> getByInstance(@PathVariable Integer instanceId) {
        try {
            Optional<Instance> instanceOpt = instanceRepository.findById(instanceId);
            if (instanceOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            WorkersProposalId id = new WorkersProposalId();
            id.setInstanceId(instanceId);

            Optional<WorkersProposal> proposal = workersProposalRepository.findById(id);
            if (proposal.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Map<String, Object> response = new HashMap<>();
            WorkersProposal prop = proposal.get();
            response.put("instanceId", prop.getInstance().getId());
            response.put("workerLimit", prop.getWorkerLimit());
            response.put("workerHours", prop.getWorkerHours());
            response.put("productionTime", prop.getProductionTime());
            response.put("weeklyScale", prop.getWeeklyScale());
            response.put("nightShift", prop.getNightShift());
            response.put("createdAt", prop.getCreatedAt());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> error = new HashMap<>();
            error.put("message", "Erro ao buscar proposta: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping
    public ResponseEntity<?> createOrUpdate(@RequestBody Map<String, Object> payload) {
        try {
            Integer instanceId = null;
            Integer workerLimit = null;
            BigDecimal workerHours = null;
            BigDecimal productionTime = null;
            Integer weeklyScale = null;
            Boolean nightShift = false;

            if (payload.get("instanceId") instanceof Number) {
                instanceId = ((Number) payload.get("instanceId")).intValue();
            } else if (payload.get("instanceId") instanceof String) {
                instanceId = Integer.parseInt((String) payload.get("instanceId"));
            }

            if (payload.get("workerLimit") instanceof Number) {
                workerLimit = ((Number) payload.get("workerLimit")).intValue();
            } else if (payload.get("workerLimit") instanceof String) {
                workerLimit = Integer.parseInt((String) payload.get("workerLimit"));
            }

            if (payload.get("workerHours") instanceof Number) {
                workerHours = new BigDecimal(payload.get("workerHours").toString());
            } else if (payload.get("workerHours") instanceof String) {
                workerHours = new BigDecimal((String) payload.get("workerHours"));
            }

            if (payload.get("productionTime") instanceof Number) {
                productionTime = new BigDecimal(payload.get("productionTime").toString());
            } else if (payload.get("productionTime") instanceof String) {
                productionTime = new BigDecimal((String) payload.get("productionTime"));
            }

            if (payload.get("weeklyScale") instanceof Number) {
                weeklyScale = ((Number) payload.get("weeklyScale")).intValue();
            } else if (payload.get("weeklyScale") instanceof String) {
                weeklyScale = Integer.parseInt((String) payload.get("weeklyScale"));
            }

            if (payload.get("nightShift") != null) {
                nightShift = Boolean.valueOf(payload.get("nightShift").toString());
            }

            if (instanceId == null || workerLimit == null || workerHours == null || productionTime == null || weeklyScale == null) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Todos os campos são obrigatórios");
                return ResponseEntity.badRequest().body(error);
            }

            Optional<Instance> instanceOpt = instanceRepository.findById(instanceId);
            if (instanceOpt.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Instância não encontrada");
                return ResponseEntity.badRequest().body(error);
            }

            Instance instance = instanceOpt.get();

            WorkersProposalId id = new WorkersProposalId();
            id.setInstanceId(instanceId);

            WorkersProposal proposal;
            Optional<WorkersProposal> existingProposal = workersProposalRepository.findById(id);

            if (existingProposal.isPresent()) {
                proposal = existingProposal.get();
            } else {
                proposal = new WorkersProposal();
                proposal.setId(id);
                proposal.setInstance(instance);
                proposal.setCreatedAt(LocalDateTime.now());
            }

            proposal.setWorkerLimit(workerLimit);
            proposal.setWorkerHours(workerHours);
            proposal.setProductionTime(productionTime);
            proposal.setWeeklyScale(weeklyScale);
            proposal.setNightShift(nightShift);

            WorkersProposal saved = workersProposalRepository.save(proposal);

            Map<String, Object> response = new HashMap<>();
            response.put("instanceId", saved.getInstance().getId());
            response.put("workerLimit", saved.getWorkerLimit());
            response.put("workerHours", saved.getWorkerHours());
            response.put("productionTime", saved.getProductionTime());
            response.put("weeklyScale", saved.getWeeklyScale());
            response.put("nightShift", saved.getNightShift());
            response.put("createdAt", saved.getCreatedAt());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> error = new HashMap<>();
            error.put("message", "Erro ao salvar proposta: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @DeleteMapping("/{instanceId}")
    public ResponseEntity<?> delete(@PathVariable Integer instanceId) {
        try {
            WorkersProposalId id = new WorkersProposalId(instanceId);
            if (workersProposalRepository.existsById(id)) {
                workersProposalRepository.deleteById(id);
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Erro ao excluir proposta: " + e.getMessage());
        }
    }
}