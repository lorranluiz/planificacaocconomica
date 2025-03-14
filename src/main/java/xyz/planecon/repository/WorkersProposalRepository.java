package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.WorkersProposal;

import java.util.List;

public interface WorkersProposalRepository extends JpaRepository<WorkersProposal, Integer> {
    List<WorkersProposal> findByInstance(Instance instance);
}