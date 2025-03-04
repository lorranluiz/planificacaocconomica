package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.DemandVector;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.SocialMaterialization;

import java.util.List;

@Repository
public interface DemandVectorRepository extends JpaRepository<DemandVector, DemandVector.DemandVectorId> {
    List<DemandVector> findByInstance(Instance instance);
    
    List<DemandVector> findBySocialMaterialization(SocialMaterialization socialMaterialization);
}
