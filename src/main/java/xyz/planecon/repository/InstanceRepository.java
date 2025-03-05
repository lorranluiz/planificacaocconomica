package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import xyz.planecon.model.entity.*;
import xyz.planecon.model.enums.InstanceType;

import java.util.List;

public interface InstanceRepository extends JpaRepository<Instance, Integer> {
    
    List<Instance> findByType(InstanceType type);
    
    @Query("SELECT wp FROM WorkersProposal wp WHERE wp.instance.id = :instanceId")
    List<WorkersProposal> findWorkerProposalsByInstance(@Param("instanceId") Integer instanceId);
    
    @Query("SELECT ds FROM DemandStock ds WHERE ds.instance.id = :instanceId")
    List<DemandStock> findDemandStocksByInstance(@Param("instanceId") Integer instanceId);

    Iterable<Instance> findByAssociatedWorkerCommittee(Instance instance);
    Iterable<Instance> findByPopularCouncilAssociatedWithCommitteeOrWorker(Instance instance);
    Iterable<Instance> findByPopularCouncilAssociatedWithPopularCouncil(Instance instance);

}
