package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.OptimizationInputsResults;

import java.util.List;

import org.springframework.stereotype.Repository;

@Repository
public interface OptimizationInputsResultsRepository extends JpaRepository<OptimizationInputsResults, OptimizationInputsResults.OptimizationInputsResultsId> {
    List<OptimizationInputsResults> findByInstance(Instance instance);
}