package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.DemandVector;
import xyz.planecon.model.entity.DemandVector.DemandVectorId;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.SocialMaterialization;

import java.util.List;

@Repository
public interface DemandVectorRepository extends JpaRepository<DemandVector, DemandVectorId> {
    List<DemandVector> findByInstance(Instance instance);
    
    List<DemandVector> findBySocialMaterialization(SocialMaterialization socialMaterialization);

    // Adicionar este método com uma consulta explícita
    @Query("SELECT dv FROM DemandVector dv WHERE dv.instance.id = :instanceId")
    List<DemandVector> findByInstanceId(@Param("instanceId") Integer instanceId);
    
    // Método para excluir entradas por ID de materialização e instância
    void deleteByIdSocialMaterializationIdAndIdInstanceId(Integer socialMaterializationId, Integer instanceId);
    
    // Query para buscar o vetor de demanda de uma instância específica
    @Query("SELECT dv FROM DemandVector dv WHERE dv.instance.id = :instanceId")
    List<DemandVector> findAllByInstanceId(@Param("instanceId") Integer instanceId);
}
