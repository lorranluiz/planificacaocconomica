package xyz.planecon.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.entity.TechnologicalTensor;
import xyz.planecon.model.entity.TechnologicalTensorId;
import xyz.planecon.repository.InstanceRepository;
import xyz.planecon.repository.SocialMaterializationRepository;
import xyz.planecon.repository.TechnologicalTensorRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class TechnologicalTensorService {

    private final TechnologicalTensorRepository technologicalTensorRepository;
    private final SocialMaterializationRepository socialMaterializationRepository;
    private final InstanceRepository instanceRepository;
    private static final Logger logger = LoggerFactory.getLogger(TechnologicalTensorService.class);

    @Autowired
    public TechnologicalTensorService(
            TechnologicalTensorRepository technologicalTensorRepository,
            SocialMaterializationRepository socialMaterializationRepository,
            InstanceRepository instanceRepository) {
        this.technologicalTensorRepository = technologicalTensorRepository;
        this.socialMaterializationRepository = socialMaterializationRepository;
        this.instanceRepository = instanceRepository;
    }

    public List<TechnologicalTensor> findAll() {
        return (List<TechnologicalTensor>) technologicalTensorRepository.findAll();
    }

    public List<TechnologicalTensor> findByInstanceId(Integer instanceId) {
        return technologicalTensorRepository.findByInstanceId(instanceId);
    }

    public Optional<TechnologicalTensor> findById(TechnologicalTensorId id) {
        // Se estiver tentando buscar por ID
        Optional<TechnologicalTensor> tensiorOptional = technologicalTensorRepository.findById(new TechnologicalTensor.TechnologicalTensorId(
            id.getInputSocialMaterializationId(), 
            id.getOutputSocialMaterializationId()
        ));
        return tensiorOptional;
    }

    @Transactional
    public TechnologicalTensor save(TechnologicalTensor technologicalTensor) {
        // Ensure createdAt is set
        if (technologicalTensor.getCreatedAt() == null) {
            technologicalTensor.setCreatedAt(LocalDateTime.now());
        }
        return technologicalTensorRepository.save(technologicalTensor);
    }

    @Transactional
    public TechnologicalTensor create(
            Integer inputSocMatId, 
            Integer outputSocMatId, 
            BigDecimal coefficient,
            Integer instanceId) {
        
        SocialMaterialization input = socialMaterializationRepository.findById(inputSocMatId)
                .orElseThrow(() -> new RuntimeException("Input SocialMaterialization not found"));
        
        SocialMaterialization output = socialMaterializationRepository.findById(outputSocMatId)
                .orElseThrow(() -> new RuntimeException("Output SocialMaterialization not found"));
        
        Instance instance = instanceRepository.findById(instanceId)
                .orElseThrow(() -> new RuntimeException("Instance not found"));
        
        // Verificar se input e output são diferentes
        if (inputSocMatId.equals(outputSocMatId)) {
            throw new RuntimeException("Insumo e produto não podem ser os mesmos");
        }
        
        return TechnologicalTensor.create(input, output, coefficient, instance);
    }

    @Transactional
    public void delete(TechnologicalTensorId id) {
        // Se estiver verificando se um tensor existe
        boolean exists = technologicalTensorRepository.existsById(new TechnologicalTensor.TechnologicalTensorId(
            id.getInputSocialMaterializationId(), 
            id.getOutputSocialMaterializationId()
        ));
        
        // Try to find the entity first
        Optional<TechnologicalTensor> tensor = technologicalTensorRepository.findById(new TechnologicalTensor.TechnologicalTensorId(
            id.getInputSocialMaterializationId(), 
            id.getOutputSocialMaterializationId()
        ));
        if (tensor.isPresent()) {
            technologicalTensorRepository.delete(tensor.get());
        } else {
            throw new RuntimeException("TechnologicalTensor not found with id: " + id);
        }
    }

    public List<SocialMaterialization> findAllSocialMaterializations() {
        List<SocialMaterialization> result = new ArrayList<>();
        socialMaterializationRepository.findAll().forEach(result::add);
        return result;
    }

    public List<Instance> findAllInstances() {
        try {
            logger.info("Buscando todas as instâncias");
            List<Instance> result = new ArrayList<>();
            instanceRepository.findAll().forEach(result::add);
            logger.info("Encontradas {} instâncias", result.size());
            return result;
        } catch (Exception e) {
            logger.error("Erro ao buscar instâncias", e, e);
            return new ArrayList<>();
        }
    }

    public Optional<Instance> findInstanceById(Integer id) {
        return instanceRepository.findById(id);
    }
}