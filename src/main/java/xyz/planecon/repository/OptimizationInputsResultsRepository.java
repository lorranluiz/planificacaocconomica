package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import xyz.planecon.model.entity.OptimizationInputsResults;
import xyz.planecon.model.entity.OptimizationInputsResults.OptimizationInputsResultsId;
import xyz.planecon.model.entity.Instance;

import java.util.List;
import java.util.Optional;

@Repository
public interface OptimizationInputsResultsRepository extends JpaRepository<OptimizationInputsResults, OptimizationInputsResultsId> {
    // Correção: use id.instanceId em vez de instanceId
    @Query("SELECT o FROM OptimizationInputsResults o WHERE o.id.instanceId = :instanceId")
    List<OptimizationInputsResults> findById_InstanceId(@Param("instanceId") Integer instanceId);
    
    // Para o método delete, é melhor usar um @Query explícito
    @Transactional
    @Modifying
    @Query("DELETE FROM OptimizationInputsResults o WHERE o.id.instanceId = :instanceId")
    void deleteByInstanceId(@Param("instanceId") Integer instanceId);

    // Adicione este método ao repositório
    List<OptimizationInputsResults> findByInstance(Instance instance);
    
    // Corrected method that uses the path to the ID fields directly in the method name
    Optional<OptimizationInputsResults> findById_InstanceIdAndId_SocialMaterializationId(
            Integer instanceId, Integer socialMaterializationId);

    // Use explicit query to avoid method name parsing issues
    @Query("SELECT o FROM OptimizationInputsResults o WHERE o.id.instanceId = :instanceId AND o.id.socialMaterializationId = :materializationId")
    Optional<OptimizationInputsResults> findByInstanceIdAndMaterializationId(
            @Param("instanceId") Integer instanceId, 
            @Param("materializationId") Integer materializationId);
}