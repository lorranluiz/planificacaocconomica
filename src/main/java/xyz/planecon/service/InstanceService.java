package xyz.planecon.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.repository.InstanceRepository;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class InstanceService {
    private final InstanceRepository instanceRepository;
    
    public List<Instance> getAllInstances() {
        return instanceRepository.findAll();
    }
    
    public Optional<Instance> getInstanceById(Integer id) {
        return instanceRepository.findById(id);
    }
    
    public List<Instance> getInstancesByType(InstanceType type) {
        return instanceRepository.findByType(type);
    }
    
    public List<Instance> getInstancesByCouncil(Instance council) {
        return instanceRepository.findByPopularCouncilAssociatedWithCommitteeOrWorker(council);
    }
    
    public Instance saveInstance(Instance instance) {
        return instanceRepository.save(instance);
    }
    
    public void deleteInstance(Integer id) {
        instanceRepository.deleteById(id);
    }
}
