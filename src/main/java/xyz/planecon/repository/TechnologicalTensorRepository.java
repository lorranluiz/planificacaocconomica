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
    
    // Adicione este método para encontrar tensores por instância e materialização
    @Query("SELECT t FROM TechnologicalTensor t WHERE t.instance.id = :instanceId AND " +
           "(t.id.inputSocialMaterializationId = :materializationId OR " +
           "t.id.outputSocialMaterializationId = :materializationId)")
    List<TechnologicalTensor> findByInstanceIdAndMaterializationId(
            @Param("instanceId") Integer instanceId, 
            @Param("materializationId") Integer materializationId);
    
    // Não altere outros métodos existentes
}
