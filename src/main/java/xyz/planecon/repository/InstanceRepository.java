package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.*;
import xyz.planecon.model.enums.InstanceType;

import java.util.List;

@Repository
public interface InstanceRepository extends JpaRepository<Instance, Integer> {
    /**
     * Encontra todas as instâncias de um determinado tipo
     * @param type o tipo da instância (COUNCIL, COMMITTEE, WORKER)
     * @return lista de instâncias do tipo especificado
     */
    List<Instance> findByType(String type);
    
    /**
     * Retorna todas as instâncias do tipo COMMITTEE
     * @return lista de comitês
     */
    default List<Instance> findAllCommittees() {
        return findByType("COMMITTEE");
    }
    
    List<Instance> findByType(InstanceType type);
    
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
