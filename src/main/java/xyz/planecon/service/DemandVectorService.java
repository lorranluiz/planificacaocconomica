package xyz.planecon.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import xyz.planecon.model.entity.DemandVector;
import xyz.planecon.model.entity.DemandVector.DemandVectorId;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.repository.DemandVectorRepository;
import xyz.planecon.repository.InstanceRepository;
import xyz.planecon.repository.SocialMaterializationRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
public class DemandVectorService {

    private final DemandVectorRepository demandVectorRepository;
    private final SocialMaterializationRepository socMatRepository;
    private final InstanceRepository instanceRepository;
    
    @Autowired
    public DemandVectorService(
            DemandVectorRepository demandVectorRepository,
            SocialMaterializationRepository socMatRepository,
            InstanceRepository instanceRepository) {
        this.demandVectorRepository = demandVectorRepository;
        this.socMatRepository = socMatRepository;
        this.instanceRepository = instanceRepository;
    }
    
    public List<DemandVector> findByInstanceId(Integer instanceId) {
        return demandVectorRepository.findByInstanceId(instanceId);
    }
    
    public Optional<DemandVector> findById(DemandVectorId id) {
        return demandVectorRepository.findById(id);
    }
    
    @Transactional
    public DemandVector createOrUpdate(Integer socMatId, Integer instanceId, BigDecimal quantity) {
        // Buscar entidades relacionadas
        SocialMaterialization socMat = socMatRepository.findById(socMatId)
                .orElseThrow(() -> new RuntimeException("Social materialization not found: " + socMatId));
        
        Instance instance = instanceRepository.findById(instanceId)
                .orElseThrow(() -> new RuntimeException("Instance not found: " + instanceId));
        
        // Verificar se já existe
        DemandVectorId id = new DemandVectorId(instanceId, socMatId);
        Optional<DemandVector> existing = demandVectorRepository.findById(id);
        
        if (existing.isPresent()) {
            // Atualizar existente
            DemandVector demandVector = existing.get();
            demandVector.setDemand(quantity); // Alterado: setQuantity() → setDemand()
            return demandVectorRepository.save(demandVector);
        } else {
            // Criar novo
            DemandVector newDemandVector = DemandVector.create(socMat, instance, quantity);
            return demandVectorRepository.save(newDemandVector);
        }
    }
    
    @Transactional
    public void delete(DemandVectorId id) {
        demandVectorRepository.deleteById(id);
    }
    
    @Transactional
    public void deleteByMaterializationAndInstance(Integer socMatId, Integer instanceId) {
        demandVectorRepository.deleteByIdSocialMaterializationIdAndIdInstanceId(socMatId, instanceId);
    }
    
    // ... outros métodos existentes ...
}
