package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.WorkersProposal;
import xyz.planecon.model.entity.WorkersProposal.WorkersProposalId;

import java.util.List;

@Repository
public interface WorkersProposalRepository extends JpaRepository<WorkersProposal, WorkersProposalId> {
    List<WorkersProposal> findByInstance(Instance instance);
    
    @Query("SELECT wp FROM WorkersProposal wp WHERE wp.instance.id = :instanceId")
    List<WorkersProposal> findByInstanceId(@Param("instanceId") Integer instanceId);
}