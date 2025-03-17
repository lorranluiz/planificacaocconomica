package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.WorkersProposal;
import xyz.planecon.model.entity.WorkersProposal.WorkersProposalId;

import java.util.List;

public interface WorkersProposalRepository extends JpaRepository<WorkersProposal, WorkersProposalId> {
    List<WorkersProposal> findByInstance(Instance instance);
}