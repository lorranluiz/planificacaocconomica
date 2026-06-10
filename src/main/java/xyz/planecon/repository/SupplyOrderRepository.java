package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.SupplyOrder;

import java.util.List;

@Repository
public interface SupplyOrderRepository extends JpaRepository<SupplyOrder, Integer> {

    @Query("SELECT so FROM SupplyOrder so WHERE so.supplierInstance.id = :supplierId ORDER BY so.createdAt DESC")
    List<SupplyOrder> findBySupplierInstanceIdOrderByCreatedAtDesc(@Param("supplierId") Integer supplierInstanceId);

    @Query("SELECT so FROM SupplyOrder so WHERE so.orderingInstance.id = :orderingId AND so.inputMaterialization.id = :inputId ORDER BY so.createdAt DESC")
    List<SupplyOrder> findByOrderingInstanceIdAndInputMaterializationIdOrderByCreatedAtDesc(
            @Param("orderingId") Integer orderingInstanceId,
            @Param("inputId") Integer inputMaterializationId);
}
