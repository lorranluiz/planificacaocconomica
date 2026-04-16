package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.server.ResponseStatusException;
import xyz.planecon.dto.EstimatesResponseDTO;
import xyz.planecon.dto.InstanceDto;
import xyz.planecon.dto.OptimizationConfigsResponseDTO;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.service.CouncilService;
import xyz.planecon.repository.InstanceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@RestController
@RequestMapping("/api/council")
public class CouncilController {

    @Autowired
    private CouncilService councilService;

    @Autowired
    private InstanceRepository instanceRepository;

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
            instanceRepository.save(council);
            
            logger.info("Timestamp de estimativas salvas atualizado para conselho {}: {}", instanceId, unixTimestamp);
            
            return ResponseEntity.ok(java.util.Map.of(
                "success", true,
                "lastEstimatesSavedAt", unixTimestamp
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
            @org.springframework.web.bind.annotation.RequestParam(name = "tampered", defaultValue = "false") boolean tampered) {
        logger.info("Marcando estimativas planificadas salvas para Conselho Planificador ID: {}, tampered: {}", instanceId, tampered);
        
        try {
            Instance plannerCouncil = instanceRepository.findById(instanceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conselho Planificador não encontrado: " + instanceId));
            
            long unixTimestamp = System.currentTimeMillis() / 1000L;
            plannerCouncil.setLastEstimatesSavedAt(unixTimestamp);

            // Campo de auditoria: registra se o usuário alterou dados após clicar em "Planificar"
            // antes de clicar em "Salvar Alterações". Usado para auditoria posterior.
            plannerCouncil.setPlanificationDataTampered(tampered);
            
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
}