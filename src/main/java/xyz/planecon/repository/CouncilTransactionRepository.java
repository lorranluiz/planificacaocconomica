package xyz.planecon.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.CouncilTransaction;

@Repository
public interface CouncilTransactionRepository extends JpaRepository<CouncilTransaction, Integer> {

    Page<CouncilTransaction> findByCouncilIdOrderByCreatedAtDesc(Integer councilId, Pageable pageable);

    @Query("SELECT ct FROM CouncilTransaction ct WHERE ct.councilId = :councilId " +
           "AND (:search IS NULL OR LOWER(ct.sourceName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(ct.description) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY ct.createdAt DESC")
    Page<CouncilTransaction> findByCouncilIdWithSearch(
            @Param("councilId") Integer councilId,
            @Param("search") String search,
            Pageable pageable);
}
