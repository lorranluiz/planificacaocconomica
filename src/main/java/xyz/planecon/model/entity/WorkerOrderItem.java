package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "worker_order_item")
public class WorkerOrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private WorkerOrder order;

    @Column(name = "social_materialization_id", nullable = false)
    private Integer socialMaterializationId;

    @Column(name = "product_name", nullable = false, length = 150)
    private String productName;

    @Column(name = "product_type", nullable = false, length = 20)
    private String productType;

    @Column(name = "price", nullable = false, precision = 20, scale = 2)
    private BigDecimal price;

    @Column(name = "quantity", nullable = false)
    private Integer quantity = 1;

    @Column(name = "subtotal", nullable = false, precision = 20, scale = 2)
    private BigDecimal subtotal;
}
