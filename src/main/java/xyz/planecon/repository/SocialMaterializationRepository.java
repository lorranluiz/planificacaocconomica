package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import xyz.planecon.model.entity.MeasurementUnit;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.entity.Sector;
import xyz.planecon.model.enums.SocialMaterializationType;

import java.math.BigDecimal;
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

    boolean existsByMeasurementUnit_Id(Integer measurementUnitId);

    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE SocialMaterialization sm SET sm.name = :name, sm.type = :type, sm.sector = :sector, sm.measurementUnit = :measurementUnit, sm.standardQuantityPerUnit = :standardQuantityPerUnit WHERE sm.id = :id")
    int updateFieldsById(
            @Param("id") Integer id,
            @Param("name") String name,
            @Param("type") SocialMaterializationType type,
            @Param("sector") Sector sector,
           @Param("measurementUnit") MeasurementUnit measurementUnit,
           @Param("standardQuantityPerUnit") BigDecimal standardQuantityPerUnit);
}
