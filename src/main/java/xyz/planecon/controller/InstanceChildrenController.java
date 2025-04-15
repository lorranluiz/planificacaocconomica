package xyz.planecon.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.repository.InstanceRepository;

/**
 * Controller for retrieving child instances for both PLANNERCOUNCIL and POPULARCOUNCIL
 */
@RestController
@RequestMapping("/api/instance")
public class InstanceChildrenController {

    private static final Logger logger = LoggerFactory.getLogger(InstanceChildrenController.class);

    @Autowired
    private InstanceRepository instanceRepository;

    /**
     * Retrieves child instances for a given parent instance
     * This API supports both PLANNERCOUNCIL and POPULARCOUNCIL instance types
     * 
     * @param instanceId The ID of the parent instance
     * @param type Optional type of instance (PLANNERCOUNCIL, POPULARCOUNCIL, etc.)
     * @return List of child instances
     */
    @GetMapping("/{instanceId}/children")
    public ResponseEntity<List<Instance>> getInstanceChildren(
            @PathVariable Integer instanceId,
            @RequestParam(required = false) String type) {
        
        logger.info("Fetching child instances for instance ID: {}, type: {}", instanceId, type);
        
        try {
            // Find the parent instance
            Instance instance = instanceRepository.findById(instanceId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, 
                            "Instance not found: " + instanceId));
            
            // Check if the instance has the expected type, if type was specified
            if (type != null && !type.isEmpty() && !instance.getType().equals(type)) {
                logger.warn("Instance {} is not of expected type: {} (actual: {})", 
                        instanceId, type, instance.getType());
                
                // Return empty list instead of error for robustness
                return ResponseEntity.ok(new ArrayList<>());
            }
            
            // For PLANNERCOUNCIL or POPULARCOUNCIL, fetch associated instances
            List<Instance> childInstances;
            
            if ("PLANNERCOUNCIL".equals(instance.getType()) || 
                "POPULARCOUNCIL".equals(instance.getType())) {
                
                // Fetch instances that have this instance as parent
                childInstances = instanceRepository.findByPopularCouncilAssociatedWithPopularCouncil(instance);
                
                // Also fetch committees linked to the council
                List<Instance> committees = instanceRepository.findByPopularCouncilAssociatedWithCommitteeOrWorker(instance);
                
                // Combine lists, avoiding duplicates
                Set<Instance> allChildrenSet = new HashSet<>(childInstances);
                allChildrenSet.addAll(committees);
                
                childInstances = new ArrayList<>(allChildrenSet);
                
                logger.info("Found {} child instances for the {}: {}", 
                        childInstances.size(), instance.getType(), instanceId);
            } else {
                // For other types, return empty list
                childInstances = new ArrayList<>();
                logger.info("Instance type not supported for fetching children: {}", instance.getType());
            }
            
            return ResponseEntity.ok(childInstances);
        } catch (ResponseStatusException e) {
            logger.error("Instance not found: {}", instanceId);
            throw e;
        } catch (Exception e) {
            logger.error("Error fetching child instances: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
