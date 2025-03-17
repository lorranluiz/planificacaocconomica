package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.WorkersProposal;
import xyz.planecon.model.entity.WorkersProposal.WorkersProposalId;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.repository.WorkersProposalRepository;
import xyz.planecon.repository.InstanceRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/workers-proposals")
public class WorkersProposalController {

    @Autowired
    private WorkersProposalRepository workersProposalRepository;
    
    @Autowired
    private InstanceRepository instanceRepository;

    @GetMapping
    public ResponseEntity<?> getAllWorkersProposals() {
        try {
            List<WorkersProposal> proposals = workersProposalRepository.findAll();
            
            // Usar uma estrutura de dados simples para evitar problemas de serialização
            List<Map<String, Object>> result = new ArrayList<>();
            
            for (WorkersProposal proposal : proposals) {
                Map<String, Object> item = new HashMap<>();
                
                // Adicionar ID da instância
                if (proposal.getId() != null) {
                    item.put("instanceId", proposal.getId().getInstanceId());
                }
                
                // Adicionar outros campos
                item.put("workerLimit", proposal.getWorkerLimit());
                item.put("workerHours", proposal.getWorkerHours());
                item.put("productionTime", proposal.getProductionTime());
                item.put("nightShift", proposal.getNightShift());
                item.put("weeklyScale", proposal.getWeeklyScale());
                item.put("createdAt", proposal.getCreatedAt());
                
                // Adicionar informações da instância de forma segura
                if (proposal.getInstance() != null) {
                    Map<String, Object> instanceInfo = new HashMap<>();
                    instanceInfo.put("id", proposal.getInstance().getId());
                    instanceInfo.put("name", proposal.getInstance().getCommitteeName());
                    item.put("instance", instanceInfo);
                } else {
                    item.put("instance", null);
                }
                
                result.add(item);
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Erro ao buscar propostas de trabalhadores: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    @PostMapping
    public ResponseEntity<?> createWorkersProposal(@RequestBody Map<String, Object> payload) {
        try {
            // Extrair e validar dados
            Integer instanceId = payload.get("instanceId") instanceof Number ? 
                ((Number) payload.get("instanceId")).intValue() : null;
            Integer workerLimit = payload.get("workerLimit") instanceof Number ? 
                ((Number) payload.get("workerLimit")).intValue() : null;
            BigDecimal workerHours = payload.get("workerHours") instanceof Number ? 
                BigDecimal.valueOf(((Number) payload.get("workerHours")).doubleValue()) : null;
            BigDecimal productionTime = payload.get("productionTime") instanceof Number ? 
                BigDecimal.valueOf(((Number) payload.get("productionTime")).doubleValue()) : null;
            Boolean nightShift = (Boolean) payload.get("nightShift");
            Integer weeklyScale = payload.get("weeklyScale") instanceof Number ? 
                ((Number) payload.get("weeklyScale")).intValue() : null;
            
            // Validar campos obrigatórios
            if (instanceId == null || workerLimit == null || workerHours == null || 
                productionTime == null || nightShift == null || weeklyScale == null) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("message", "Todos os campos são obrigatórios");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // Verificar se a instância existe e é do tipo comitê
            Optional<Instance> instanceOpt = instanceRepository.findById(instanceId);
            if (!instanceOpt.isPresent()) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("message", "Instância não encontrada com ID: " + instanceId);
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            Instance instance = instanceOpt.get();
            InstanceType instanceType = instance.getType();
            if (InstanceType.COMMITTEE != instanceType) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("message", "A instância deve ser do tipo COMMITTEE, tipo atual: " + instanceType);
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // Verificar valores numéricos
            if (workerLimit <= 0 || workerHours.compareTo(BigDecimal.ZERO) < 0 || 
                productionTime.compareTo(BigDecimal.ZERO) < 0 || weeklyScale < 1 || weeklyScale > 7) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("message", "Valores inválidos: limite de trabalhadores deve ser positivo, " +
                    "horas de trabalho e tempo de produção não podem ser negativos, e escala semanal deve ser entre 1 e 7");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // Verificar se já existe uma proposta feita por essa instância
            Optional<WorkersProposal> existingProposal = workersProposalRepository.findById(
                new WorkersProposalId(instanceId));
            
            // Criar ou atualizar a proposta
            WorkersProposal proposal;
            if (existingProposal.isPresent()) {
                proposal = existingProposal.get();
                proposal.setWorkerLimit(workerLimit);
                proposal.setWorkerHours(workerHours);
                proposal.setProductionTime(productionTime);
                proposal.setNightShift(nightShift);
                proposal.setWeeklyScale(weeklyScale);
            } else {
                proposal = new WorkersProposal();
                
                // Corrigido: usar o construtor que recebe o instanceId
                WorkersProposalId id = new WorkersProposalId(instanceId);
                proposal.setId(id);
                
                proposal.setWorkerLimit(workerLimit);
                proposal.setWorkerHours(workerHours);
                proposal.setProductionTime(productionTime);
                proposal.setNightShift(nightShift);
                proposal.setWeeklyScale(weeklyScale);
                proposal.setCreatedAt(LocalDateTime.now());
            }
            
            WorkersProposal saved = workersProposalRepository.save(proposal);
            
            // Retornar DTO
            Map<String, Object> result = new HashMap<>();
            result.put("instanceId", saved.getId().getInstanceId());
            result.put("workerLimit", saved.getWorkerLimit());
            result.put("workerHours", saved.getWorkerHours());
            result.put("productionTime", saved.getProductionTime());
            result.put("nightShift", saved.getNightShift());
            result.put("weeklyScale", saved.getWeeklyScale());
            result.put("createdAt", saved.getCreatedAt());
            
            if (saved.getInstance() != null) {
                Map<String, Object> instanceInfo = new HashMap<>();
                instanceInfo.put("id", saved.getInstance().getId());
                instanceInfo.put("name", saved.getInstance().getCommitteeName());
                result.put("instance", instanceInfo);
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Erro ao cadastrar proposta de trabalhadores: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}