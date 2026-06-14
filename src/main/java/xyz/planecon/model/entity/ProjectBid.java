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
@Table(name = "project_bid")
public class ProjectBid {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "supply_order_id", nullable = false)
    private Integer supplyOrderId;

    @Column(name = "committee_id", nullable = false)
    private Integer committeeId;

    @Column(name = "bid_hours", precision = 16, scale = 6, nullable = false)
    private BigDecimal bidHours;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
