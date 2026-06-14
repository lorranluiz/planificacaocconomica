package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.ProjectBid;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectBidRepository extends JpaRepository<ProjectBid, Integer> {

    List<ProjectBid> findBySupplyOrderIdOrderByBidHoursAsc(Integer supplyOrderId);

    Optional<ProjectBid> findBySupplyOrderIdAndCommitteeId(Integer supplyOrderId, Integer committeeId);
}
