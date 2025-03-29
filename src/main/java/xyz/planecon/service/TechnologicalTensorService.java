package xyz.planecon.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.entity.TechnologicalTensor;
import xyz.planecon.model.entity.TechnologicalTensor.TechnologicalTensorId; // Corrigido: Usar classe interna
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
        // Usamos um método de verificação em vez de instanceof
        Integer instanceId = getInstanceIdSafely(id);
        
        if (instanceId == null) {
            // Tenta buscar usando apenas input e output (para compatibilidade)
            List<TechnologicalTensor> tensors = technologicalTensorRepository.findByInputSocialMaterialization_IdAndOutputSocialMaterialization_Id(
                id.getInputSocialMaterializationId(), 
                id.getOutputSocialMaterializationId()
            );
            return tensors.isEmpty() ? Optional.empty() : Optional.of(tensors.get(0));
        } else {
            // Busca completa com instância, input e output
            return technologicalTensorRepository.findById(
                new TechnologicalTensorId(
                    instanceId,
                    id.getInputSocialMaterializationId(),
                    id.getOutputSocialMaterializationId()
                )
            );
        }
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
        // Usamos o mesmo método de verificação aqui
        Integer instanceId = getInstanceIdSafely(id);
        
        if (instanceId == null) {
            List<TechnologicalTensor> tensors = technologicalTensorRepository.findByInputSocialMaterialization_IdAndOutputSocialMaterialization_Id(
                id.getInputSocialMaterializationId(), 
                id.getOutputSocialMaterializationId()
            );
            
            if (tensors.isEmpty()) {
                throw new RuntimeException("TechnologicalTensor not found with id: " + id);
            }
            
            // Excluir todos os tensores encontrados
            for (TechnologicalTensor tensor : tensors) {
                technologicalTensorRepository.delete(tensor);
            }
        } else {
            // Verificar se existe com o ID completo
            Optional<TechnologicalTensor> tensor = technologicalTensorRepository.findById(
                new TechnologicalTensorId(
                    instanceId,
                    id.getInputSocialMaterializationId(),
                    id.getOutputSocialMaterializationId()
                )
            );
            if (tensor.isPresent()) {
                technologicalTensorRepository.delete(tensor.get());
            } else {
                throw new RuntimeException("TechnologicalTensor not found with id: " + id);
            }
        }
    }
    
    @Transactional
    public int deleteByMaterializationAndInstance(Integer materializationId, Integer instanceId) {
        logger.info("Excluindo tensores para materialização {} na instância {}", materializationId, instanceId);
        
        // Buscar todos os tensores relacionados a esta materialização na instância especificada
        List<TechnologicalTensor> tensorsToDelete = 
            technologicalTensorRepository.findByInstanceIdAndMaterializationId(instanceId, materializationId);
        
        logger.info("Encontrados {} tensores para excluir", tensorsToDelete.size());
        
        int deletedCount = 0;
        if (!tensorsToDelete.isEmpty()) {
            // Excluir cada tensor individualmente para garantir que todos os callbacks sejam acionados
            for (TechnologicalTensor tensor : tensorsToDelete) {
                try {
                    // Usar o ID correto para exclusão
                    TechnologicalTensorId id = tensor.getId();
                    logger.debug("Excluindo tensor com ID: [{}, {}]", 
                        id.getInputSocialMaterializationId(), 
                        id.getOutputSocialMaterializationId());
                    
                    technologicalTensorRepository.delete(tensor);
                    deletedCount++;
                } catch (Exception e) {
                    logger.error("Erro ao excluir tensor: {}", e.getMessage(), e);
                }
            }
        }
        
        logger.info("Excluídos {} tensores com sucesso", deletedCount);
        return deletedCount;
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

    // Adicionar este método auxiliar para obter o instanceId de forma segura
    private Integer getInstanceIdSafely(TechnologicalTensorId id) {
        try {
            // Tentamos acessar instanceId usando reflection para evitar erros de tipos
            java.lang.reflect.Method method = id.getClass().getMethod("getInstanceId");
            return (Integer) method.invoke(id);
        } catch (Exception e) {
            // Se falhar, assumimos que é null
            return null;
        }
    }
}