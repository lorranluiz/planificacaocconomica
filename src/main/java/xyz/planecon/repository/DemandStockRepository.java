package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.jpa.repository.Modifying;

import xyz.planecon.model.entity.DemandStock;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.DemandStock.DemandStockId;

import java.util.List;
import java.util.Optional;

@Repository
public interface DemandStockRepository extends JpaRepository<DemandStock, DemandStockId> {

    @Cacheable("demandStocks")
    List<DemandStock> findByInstance(Instance instance);
    
    @Cacheable("demandStocks")
    @Query("SELECT ds FROM DemandStock ds JOIN FETCH ds.socialMaterialization WHERE ds.instance = :instance")
    List<DemandStock> findByInstanceWithMaterialization(@Param("instance") Instance instance);
    
    @Query(value = "SELECT ds.id_social_materialization, ds.stock, ds.demand " +
                  "FROM demand_stock ds WHERE ds.id_instance = :instanceId", 
           nativeQuery = true)
    List<Object[]> findStockValuesForInstance(@Param("instanceId") Integer instanceId);
    
    @Cacheable("demandStocks")
    @Query("SELECT ds FROM DemandStock ds WHERE ds.instance.id = :instanceId")
    List<DemandStock> findByInstanceId(@Param("instanceId") Integer instanceId);
    
    /**
     * Delete demand stock by social materialization ID and instance ID
     * Using a native query to avoid issues with composite key navigation
     */
    @Modifying
    @Transactional
    @Query(value = "DELETE FROM demand_stock WHERE id_social_materialization = :materializationId AND id_instance = :instanceId", 
           nativeQuery = true)
    void deleteByIdSocialMaterializationIdAndIdInstanceId(
        @Param("materializationId") Integer materializationId, 
        @Param("instanceId") Integer instanceId
    );

    @Query("SELECT ds FROM DemandStock ds WHERE ds.instance.id = :instanceId AND ds.socialMaterialization.id = :materializationId")
    Optional<DemandStock> findByInstanceIdAndSocialMaterializationId(
        @Param("instanceId") Integer instanceId, 
        @Param("materializationId") Integer materializationId
    );
}
