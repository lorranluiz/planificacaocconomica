package xyz.planecon.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import xyz.planecon.model.entity.TechnologicalTensor;
import xyz.planecon.model.entity.TechnologicalTensor.TechnologicalTensorId;

import java.util.List;

public interface TechnologicalTensorRepository extends CrudRepository<TechnologicalTensor, TechnologicalTensorId> {

    @Query("SELECT t FROM TechnologicalTensor t WHERE t.instance.id = :instanceId")
    List<TechnologicalTensor> findByInstanceId(@Param("instanceId") Integer instanceId);
    
    @Query("SELECT t FROM TechnologicalTensor t WHERE t.inputSocialMaterialization.id = :inputId AND t.outputSocialMaterialization.id = :outputId")
    List<TechnologicalTensor> findByInputAndOutput(
            @Param("inputId") Integer inputId,
            @Param("outputId") Integer outputId);
}
