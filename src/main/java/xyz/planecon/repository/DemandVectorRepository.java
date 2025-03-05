package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.planecon.model.entity.DemandVector;
import xyz.planecon.model.entity.Instance;
import java.util.List;

public interface DemandVectorRepository extends JpaRepository<DemandVector, Integer> {
    List<DemandVector> findByInstance(Instance instance);
    // Métodos personalizados aqui, se necessário
}
