package xyz.planecon.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.repository.InstanceRepository;
import xyz.planecon.service.InstanceService;
import xyz.planecon.dto.InstanceDto;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class InstanceController {
    private final InstanceService instanceService;

    @Autowired
    private InstanceRepository instanceRepository;

    @GetMapping("/instances")
    public ResponseEntity<List<InstanceDto>> getAllInstances() {
        List<Instance> instances = (List<Instance>) instanceRepository.findAll();
        List<InstanceDto> instanceDtos = instances.stream()
            .map(InstanceDto::fromEntity)
            .collect(Collectors.toList());
        return ResponseEntity.ok(instanceDtos);
    }

    @GetMapping("/instances/{id}")
    public ResponseEntity<InstanceDto> getInstanceById(@PathVariable Integer id) {
        return instanceService.getInstanceById(id)
                .map(instance -> ResponseEntity.ok(InstanceDto.fromEntity(instance)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/instances/type/{type}")
    public ResponseEntity<List<InstanceDto>> getInstancesByType(@PathVariable InstanceType type) {
        List<Instance> instances = instanceRepository.findByType(type);
        List<InstanceDto> instanceDtos = instances.stream()
            .map(InstanceDto::fromEntity)
            .collect(Collectors.toList());
        return ResponseEntity.ok(instanceDtos);
    }

    @PutMapping("/instances/{id}")
    public ResponseEntity<InstanceDto> updateInstance(@PathVariable Integer id, @RequestBody Instance instance) {
        if (!instanceService.getInstanceById(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }

        instance.setId(id);
        Instance savedInstance = instanceService.saveInstance(instance);
        return ResponseEntity.ok(InstanceDto.fromEntity(savedInstance));
    }
    
    @DeleteMapping("/instances/{id}")
    public ResponseEntity<Void> deleteInstance(@PathVariable Integer id) {
        if (!instanceService.getInstanceById(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }

        instanceRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
