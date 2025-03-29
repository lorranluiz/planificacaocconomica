package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import xyz.planecon.model.entity.TechnologicalTensor;
import xyz.planecon.model.entity.TechnologicalTensor.TechnologicalTensorId;

import jakarta.persistence.QueryHint;
import java.util.List;

@Repository
public interface TechnologicalTensorRepository extends JpaRepository<TechnologicalTensor, TechnologicalTensorId> {
    
    @Query("SELECT t FROM TechnologicalTensor t WHERE t.id.instanceId = :instanceId")
    @QueryHints({@QueryHint(name = "org.hibernate.cacheable", value = "true")})
    List<TechnologicalTensor> findByInstanceId(@Param("instanceId") Integer instanceId);
    
    @Query("SELECT t FROM TechnologicalTensor t WHERE t.id.instanceId = :instanceId AND " +
           "(t.id.inputSocialMaterializationId = :materializationId OR " +
           "t.id.outputSocialMaterializationId = :materializationId)")
    @QueryHints({@QueryHint(name = "org.hibernate.cacheable", value = "true")})
    List<TechnologicalTensor> findByInstanceIdAndMaterializationId(
            @Param("instanceId") Integer instanceId, 
            @Param("materializationId") Integer materializationId);
    
    @Query(value = "SELECT tt.id_instance, tt.id_production_input, tt.id_social_materialization, " +
           "tt.technical_coefficient_element_value, tt.created_at FROM technological_tensor tt " +
           "WHERE tt.id_instance = :instanceId", nativeQuery = true)
    List<Object[]> findMatrixDataByInstanceId(@Param("instanceId") Integer instanceId);

    List<TechnologicalTensor> findByInputSocialMaterialization_IdAndOutputSocialMaterialization_Id(
        Integer inputMaterializationId, 
        Integer outputMaterializationId
    );
}
