package xyz.planecon.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.repository.InstanceRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@Service
public class InstanceService {

    @Autowired
    private InstanceRepository instanceRepository;

    public List<Instance> getAllInstances() {
        // Converter Iterable para List usando StreamSupport
        return StreamSupport.stream(instanceRepository.findAll().spliterator(), false)
                .collect(Collectors.toList());
    }

    public Optional<Instance> getInstanceById(Integer id) {
        return instanceRepository.findById(id);
    }
    
    // Adicionar este método para corrigir o erro de compilação
    public Instance saveInstance(Instance instance) {
        return instanceRepository.save(instance);
    }
}
