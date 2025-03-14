package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.planecon.model.entity.DemandStock;
import xyz.planecon.model.entity.Instance;

import java.util.List;

public interface DemandStockRepository extends JpaRepository<DemandStock, Integer> {
    List<DemandStock> findByInstance(Instance instance);
}
