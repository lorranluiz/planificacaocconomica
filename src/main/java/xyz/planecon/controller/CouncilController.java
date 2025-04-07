package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import xyz.planecon.dto.EstimatesResponseDTO;
import xyz.planecon.dto.InstanceDto;
import xyz.planecon.service.CouncilService;

import java.util.List;

@RestController
@RequestMapping("/api/council")
public class CouncilController {

    @Autowired
    private CouncilService councilService;

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
}