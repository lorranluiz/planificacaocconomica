package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.DemandStock;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.SocialMaterialization;

import java.util.List;
import java.util.Optional;

@Repository
public interface DemandStockRepository extends JpaRepository<DemandStock, DemandStock.DemandStockId> {
    List<DemandStock> findByInstance(Instance instance);
    
    List<DemandStock> findBySocialMaterialization(SocialMaterialization socialMaterialization);
    
    Optional<DemandStock> findByInstanceAndSocialMaterialization(Instance instance, SocialMaterialization socialMaterialization);
}
