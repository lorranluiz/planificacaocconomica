package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.repository.InstanceRepository;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api")
public class InstanceSimpleController {

    @Autowired
    private InstanceRepository instanceRepository;
    
    // Alterando o caminho para evitar conflito
    @GetMapping("/instances-basic")
    public List<Map<String, Object>> getAllInstances() {
        // Buscar todas as instâncias e converter para uma lista simplificada
        return StreamSupport.stream(instanceRepository.findAll().spliterator(), false)
                .map(this::convertToSimpleMap)
                .collect(Collectors.toList());
    }
    
    private Map<String, Object> convertToSimpleMap(Instance instance) {
        Map<String, Object> result = new HashMap<>();
        result.put("id", instance.getId());
        result.put("type", instance.getType().toString());
        
        // Adicionar o nome do comitê se disponível
        if (instance.getCommitteeName() != null && !instance.getCommitteeName().isEmpty()) {
            result.put("committeeName", instance.getCommitteeName());
        }
        
        return result;
    }
}