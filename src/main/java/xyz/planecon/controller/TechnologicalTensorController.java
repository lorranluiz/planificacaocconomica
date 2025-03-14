package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.model.entity.TechnologicalTensor;
import xyz.planecon.repository.TechnologicalTensorRepository;
import xyz.planecon.repository.InstanceRepository;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tensors")
public class TechnologicalTensorController {

    @Autowired
    private TechnologicalTensorRepository tensorRepository;
    
    @Autowired
    private InstanceRepository instanceRepository;

    @GetMapping("/by-instance/{instanceId}")
    public ResponseEntity<?> getTensorsByInstanceId(@PathVariable Integer instanceId) {
        try {
            // Verificar se a instância existe
            if (!instanceRepository.existsById(instanceId)) {
                return ResponseEntity.notFound().build();
            }
            
            // Buscar tensores por instância
            List<TechnologicalTensor> tensors = tensorRepository.findByInstanceId(instanceId);
            
            // Converter para formato simplificado para o frontend
            List<Map<String, Object>> result = tensors.stream().map(tensor -> {
                Map<String, Object> item = new HashMap<>();
                
                item.put("coefficient", tensor.getCoefficient().toString());
                
                // Incluir dados do input
                Map<String, Object> input = new HashMap<>();
                input.put("id", tensor.getInputSocialMaterialization().getId());
                input.put("name", tensor.getInputSocialMaterialization().getName());
                input.put("type", tensor.getInputSocialMaterialization().getType().toString());
                item.put("input", input);
                
                // Incluir dados do output
                Map<String, Object> output = new HashMap<>();
                output.put("id", tensor.getOutputSocialMaterialization().getId());
                output.put("name", tensor.getOutputSocialMaterialization().getName());
                output.put("type", tensor.getOutputSocialMaterialization().getType().toString());
                item.put("output", output);
                
                // Adicionar data de criação
                item.put("createdAt", tensor.getCreatedAt().toString());
                
                return item;
            }).collect(Collectors.toList());
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Erro ao buscar tensores: " + e.getMessage()));
        }
    }
}