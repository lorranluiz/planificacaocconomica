package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.TechnologicalTensor;

import java.util.List;

public interface TechnologicalTensorRepository extends JpaRepository<TechnologicalTensor, TechnologicalTensor.TechnologicalTensorId> {
    List<TechnologicalTensor> findByInstance(Instance instance);
}
