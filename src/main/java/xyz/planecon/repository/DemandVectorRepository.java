package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.transaction.annotation.Transactional;

import xyz.planecon.model.entity.DemandVector;
import xyz.planecon.model.entity.DemandVector.DemandVectorId;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.SocialMaterialization;

import java.util.List;

@Repository
public interface DemandVectorRepository extends JpaRepository<DemandVector, DemandVectorId> {
    List<DemandVector> findByInstance(Instance instance);
    
    List<DemandVector> findBySocialMaterialization(SocialMaterialization socialMaterialization);

    @Cacheable("demandVectors")
    @Query("SELECT dv FROM DemandVector dv WHERE dv.instance.id = :instanceId")
    List<DemandVector> findByInstanceId(@Param("instanceId") Integer instanceId);
    
    @Cacheable("demandVectors")
    List<DemandVector> findAll();
    
    @Cacheable("demandVectors")
    @Query("SELECT dv FROM DemandVector dv JOIN FETCH dv.socialMaterialization JOIN FETCH dv.instance " +
           "WHERE dv.instance.id = :instanceId")
    List<DemandVector> findByInstanceIdWithJoinFetch(@Param("instanceId") Integer instanceId);
    
    @Query(value = "SELECT dv.id_social_materialization, dv.demand " +
                  "FROM demand_vector dv WHERE dv.id_instance = :instanceId", 
           nativeQuery = true)
    List<Object[]> findDemandValuesForInstance(@Param("instanceId") Integer instanceId);

    /**
     * Delete demand vector by social materialization ID and instance ID
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM DemandVector dv WHERE dv.id.socialMaterializationId = :materializationId AND dv.id.instanceId = :instanceId")
    void deleteByIdSocialMaterializationIdAndIdInstanceId(
        @Param("materializationId") Integer materializationId, 
        @Param("instanceId") Integer instanceId
    );
}
