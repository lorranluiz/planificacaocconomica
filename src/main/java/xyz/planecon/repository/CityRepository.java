package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.City;

import java.util.Optional;

@Repository
public interface CityRepository extends JpaRepository<City, String> {
    Optional<City> findByCode(String code);
    Optional<City> findByNameIgnoreCase(String name);
}
