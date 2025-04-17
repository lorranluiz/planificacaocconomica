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
import java.util.Optional;

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

    @Query("SELECT dv FROM DemandVector dv WHERE dv.instance.id = :instanceId AND dv.socialMaterialization.id = :materializationId")
    Optional<DemandVector> findByInstanceIdAndSocialMaterializationId(
        @Param("instanceId") Integer instanceId, 
        @Param("materializationId") Integer materializationId
    );

    /**
     * Busca todos os vetores de demanda das instâncias filhas de um conselho
     * Inclui tanto comitês e trabalhadores quanto conselhos filhos
     * 
     * @param councilId ID do conselho pai
     * @return Lista de vetores de demanda de todas as instâncias filhas
     */
    @Query(value = "SELECT dv.* FROM demand_vector dv " +
           "JOIN instance i ON dv.instance_id = i.id " +
           "WHERE i.popular_council_associated_with_committee_or_worker = :councilId " +
           "OR i.popular_council_associated_with_popular_council = :councilId", 
           nativeQuery = true)
    List<DemandVector> findAllByParentCouncilId(@Param("councilId") Integer councilId);
    
    /**
     * Calcula a média de demandas por materialização para todas as instâncias filhas de um conselho
     * 
     * @param councilId ID do conselho pai
     * @return Lista de objetos contendo o ID da materialização e a média de demanda
     */
    @Query(value = "SELECT dv.id_social_materialization as materializationId, AVG(dv.demand) as averageDemand " +
           "FROM demand_vector dv " +
           "JOIN instance i ON dv.id_instance = i.id " +
           "WHERE i.popular_council_associated_with_committee_or_worker = :councilId " +
           "OR i.popular_council_associated_with_popular_council = :councilId " +
           "GROUP BY dv.id_social_materialization", 
           nativeQuery = true)
    List<Object[]> calculateAverageDemandsByMaterializationForCouncilChildren(@Param("councilId") Integer councilId);

    /**
     * Calcula as demandas médias por materialização para as instâncias POPULARCOUNCIL filhas de um conselho
     * 
     * @param councilId ID do conselho pai
     * @return Lista de arrays de objetos contendo [matId, avgDemand]
     */
    @Query(value = 
        "SELECT " +
        "    dv.id_social_materialization AS matId, " +
        "    AVG(dv.demand) AS avgDemand " +
        "FROM demand_vector dv " +
        "JOIN instance i ON dv.id_instance = i.id " +
        "WHERE i.type = 'POPULARCOUNCIL' AND " +
        "      i.popular_council_associated_with_popular_council = :councilId " +
        "GROUP BY dv.id_social_materialization",
        nativeQuery = true)
    List<Object[]> calculateAverageDemandsByMaterializationForPopularCouncilChildren(@Param("councilId") Integer councilId);
}
