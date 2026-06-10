package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "supply_order")
public class SupplyOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ordering_instance_id", nullable = false)
    private Instance orderingInstance;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "input_materialization_id", nullable = false)
    private SocialMaterialization inputMaterialization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "output_materialization_id", nullable = false)
    private SocialMaterialization outputMaterialization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_instance_id")
    private Instance supplierInstance;

    @Column(name = "quantity", precision = 16, scale = 6)
    private BigDecimal quantity = BigDecimal.ZERO;

    @Column(name = "order_status", length = 50)
    private String orderStatus = "solicitada";

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
