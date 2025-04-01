package xyz.planecon.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.repository.SocialMaterializationRepository;

import java.util.List;
import java.util.Optional;

@Service
public class SocialMaterializationService {

    private final SocialMaterializationRepository materializationRepository;

    @Autowired
    public SocialMaterializationService(SocialMaterializationRepository materializationRepository) {
        this.materializationRepository = materializationRepository;
    }

    public List<SocialMaterialization> findAll() {
        return materializationRepository.findAll();
    }

    public Optional<SocialMaterialization> findById(Integer id) {
        return materializationRepository.findById(id);
    }

    @Transactional
    public SocialMaterialization save(SocialMaterialization materialization) {
        return materializationRepository.save(materialization);
    }

    @Transactional
    public void delete(Integer id) {
        materializationRepository.deleteById(id);
    }
}
