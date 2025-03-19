package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.entity.Sector;
import xyz.planecon.model.enums.SocialMaterializationType;

import java.util.List;

@Repository
public interface SocialMaterializationRepository extends JpaRepository<SocialMaterialization, Integer> {
    List<SocialMaterialization> findByType(SocialMaterializationType type);
    
    List<SocialMaterialization> findBySector(Sector sector);

    // Suponho que existe uma tabela de junção ou alguma outra entidade que relacione
    // Instance com SocialMaterialization, como TechnologicalTensor ou outra entidade relacionada
    
    @Query("SELECT DISTINCT sm FROM SocialMaterialization sm " +
           "JOIN TechnologicalTensor tt ON tt.inputSocialMaterialization.id = sm.id OR tt.outputSocialMaterialization.id = sm.id " +
           "WHERE tt.instance.id = :instanceId")
    List<SocialMaterialization> findByInstanceId(@Param("instanceId") Integer instanceId);
}
