package xyz.planecon.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.service.InstanceService;

import java.util.List;

@RestController
@RequestMapping("/api/instances")
@RequiredArgsConstructor
public class InstanceController {
    private final InstanceService instanceService;
    
    @GetMapping
    public List<Instance> getAllInstances() {
        return instanceService.getAllInstances();
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Instance> getInstanceById(@PathVariable Integer id) {
        return instanceService.getInstanceById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/type/{type}")
    public List<Instance> getInstancesByType(@PathVariable InstanceType type) {
        return instanceService.getInstancesByType(type);
    }
    
    @PostMapping
    public Instance createInstance(@RequestBody Instance instance) {
        return instanceService.saveInstance(instance);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Instance> updateInstance(@PathVariable Integer id, @RequestBody Instance instance) {
        if (!instanceService.getInstanceById(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        
        instance.setId(id);
        return ResponseEntity.ok(instanceService.saveInstance(instance));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInstance(@PathVariable Integer id) {
        if (!instanceService.getInstanceById(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        
        instanceService.deleteInstance(id);
        return ResponseEntity.noContent().build();
    }
}
