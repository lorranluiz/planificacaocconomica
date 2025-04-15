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
}