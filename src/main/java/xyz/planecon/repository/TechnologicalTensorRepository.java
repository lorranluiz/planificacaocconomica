package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.TechnologicalTensor;
import xyz.planecon.model.entity.TechnologicalTensor.TechnologicalTensorId;

import java.util.List;

@Repository
public interface TechnologicalTensorRepository extends JpaRepository<TechnologicalTensor, TechnologicalTensorId> {
    
    List<TechnologicalTensor> findByInstanceId(Integer instanceId);
    
    // Custom query to find tensors by instance and materialization
    @Query("SELECT t FROM TechnologicalTensor t WHERE t.instance.id = :instanceId AND " +
           "(t.inputSocialMaterialization.id = :materializationId OR t.outputSocialMaterialization.id = :materializationId)")
    List<TechnologicalTensor> findByInstanceIdAndMaterializationId(
            @Param("instanceId") Integer instanceId, 
            @Param("materializationId") Integer materializationId);
    
    // Não altere outros métodos existentes
}
