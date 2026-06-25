package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.SupplyOrder;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface SupplyOrderRepository extends JpaRepository<SupplyOrder, Integer> {

    @Query("SELECT so FROM SupplyOrder so WHERE so.supplierInstance.id = :supplierId ORDER BY so.createdAt DESC")
    List<SupplyOrder> findBySupplierInstanceIdOrderByCreatedAtDesc(@Param("supplierId") Integer supplierInstanceId);

    @Query("SELECT so FROM SupplyOrder so WHERE so.orderingInstance.id = :orderingId AND so.inputMaterialization.id = :inputId ORDER BY so.createdAt DESC")
    List<SupplyOrder> findByOrderingInstanceIdAndInputMaterializationIdOrderByCreatedAtDesc(
            @Param("orderingId") Integer orderingInstanceId,
            @Param("inputId") Integer inputMaterializationId);

    @Query("SELECT so FROM SupplyOrder so WHERE so.orderingInstance.id = :orderingId ORDER BY so.createdAt DESC")
    List<SupplyOrder> findByOrderingInstanceIdOrderByCreatedAtDesc(@Param("orderingId") Integer orderingInstanceId);

    @Query(value = 
        "SELECT DISTINCT so.input_materialization_id FROM supply_order so " +
        "JOIN instance i ON so.ordering_instance_id = i.id " +
        "WHERE i.popular_council_associated_with_committee_or_worker = :councilId " +
        "OR i.popular_council_associated_with_popular_council = :councilId " +
        "OR so.ordering_instance_id = :councilId",
        nativeQuery = true)
    List<Integer> findInputMatIdsByCouncilChildren(@Param("councilId") Integer councilId);

    /**
     * Soma das quantidades das ordens aceitas em produção para um dado fornecedor.
     */
    @Query("SELECT COALESCE(SUM(so.quantity), 0) FROM SupplyOrder so " +
           "WHERE so.supplierInstance.id = :supplierId AND so.orderStatus = 'aceita em produção'")
    BigDecimal sumAcceptedQuantitiesBySupplierId(@Param("supplierId") Integer supplierId);
}
