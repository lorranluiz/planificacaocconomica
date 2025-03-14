package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.Sector;

@Repository
public interface SectorRepository extends JpaRepository<Sector, Integer> {
    Sector findByName(String name);
}
