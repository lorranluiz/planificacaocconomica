package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.enums.InstanceType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Repository
public interface InstanceRepository extends JpaRepository<Instance, Integer> {
    List<Instance> findByType(InstanceType type);
    
    @Query("SELECT i FROM Instance i WHERE i.popularCouncilAssociatedWithCommitteeOrWorker = :council")
    List<Instance> findInstancesByCouncil(@Param("council") Instance council);
    
    List<Instance> findByCommitteeName(String name);

    @Query("SELECT i FROM Instance i WHERE i.popularCouncilAssociatedWithCommitteeOrWorker = :instance")
    List<Instance> findByPopularCouncilAssociatedWithCommitteeOrWorker(@Param("instance") Instance instance);
}
