package xyz.planecon.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import xyz.planecon.model.entity.*;
import xyz.planecon.model.enums.InstanceType;

import java.util.List;

public interface InstanceRepository extends CrudRepository<Instance, Integer> {
    
    List<Instance> findByType(InstanceType type);
    
    // Adicione este método para buscar instâncias por tipo
    List<Instance> findByType(String type);
    
    // Corrigir as consultas para usar os nomes corretos dos atributos
    @Query("SELECT i FROM Instance i WHERE i.popularCouncilAssociatedWithCommitteeOrWorker = :instance")
    List<Instance> findByPopularCouncilAssociatedWithCommitteeOrWorker(@Param("instance") Instance instance);
    
    @Query("SELECT i FROM Instance i WHERE i.popularCouncilAssociatedWithPopularCouncil = :instance")
    List<Instance> findByPopularCouncilAssociatedWithPopularCouncil(@Param("instance") Instance instance);
    
    // Método genérico que usa os nomes corretos dependendo do tipo da instância
    @Query("SELECT i FROM Instance i WHERE i.popularCouncilAssociatedWithCommitteeOrWorker = :instance OR i.popularCouncilAssociatedWithPopularCouncil = :instance")
    List<Instance> findByAnyAssociatedPopularCouncil(@Param("instance") Instance instance);
    
    // Métodos para acessar entidades relacionadas
    @Query("SELECT wp FROM WorkersProposal wp WHERE wp.instance.id = :instanceId")
    List<WorkersProposal> findWorkerProposalsByInstance(@Param("instanceId") Integer instanceId);
    
    @Query("SELECT ds FROM DemandStock ds WHERE ds.instance.id = :instanceId")
    List<DemandStock> findDemandStocksByInstance(@Param("instanceId") Integer instanceId);
    
    @Query("SELECT dv FROM DemandVector dv WHERE dv.instance.id = :instanceId")
    List<DemandVector> findDemandVectorsByInstance(@Param("instanceId") Integer instanceId);
}
