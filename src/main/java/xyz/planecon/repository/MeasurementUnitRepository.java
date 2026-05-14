package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.MeasurementUnit;

import java.util.Optional;

@Repository
public interface MeasurementUnitRepository extends JpaRepository<MeasurementUnit, Integer> {
    Optional<MeasurementUnit> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);
}