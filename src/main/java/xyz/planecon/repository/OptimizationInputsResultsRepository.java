package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import xyz.planecon.model.entity.OptimizationInputsResults;
import xyz.planecon.model.entity.OptimizationInputsResults.OptimizationInputsResultsId;

import java.util.List;

@Repository
public interface OptimizationInputsResultsRepository extends JpaRepository<OptimizationInputsResults, OptimizationInputsResultsId> {
    // Correção: use id.instanceId em vez de instanceId
    List<OptimizationInputsResults> findById_InstanceId(Integer instanceId);
    
    // Para o método delete, é melhor usar um @Query explícito
    @Transactional
    @Modifying
    @Query("DELETE FROM OptimizationInputsResults o WHERE o.id.instanceId = :instanceId")
    void deleteByInstanceId(@Param("instanceId") Integer instanceId);
}