package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.WorkerOrder;

import java.util.List;

@Repository
public interface WorkerOrderRepository extends JpaRepository<WorkerOrder, Integer> {
    List<WorkerOrder> findByWorkerIdOrderByOrderDateDesc(Integer workerId);
}
