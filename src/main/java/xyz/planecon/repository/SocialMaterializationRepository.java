package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.entity.Sector;
import xyz.planecon.model.enums.SocialMaterializationType;

import java.util.List;

@Repository
public interface SocialMaterializationRepository extends JpaRepository<SocialMaterialization, Integer> {
    List<SocialMaterialization> findByType(SocialMaterializationType type);
    
    List<SocialMaterialization> findBySector(Sector sector);
}
