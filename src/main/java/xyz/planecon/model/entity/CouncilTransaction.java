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
@Table(name = "council_transaction")
public class CouncilTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "council_id", nullable = false)
    private Integer councilId;

    @Column(name = "amount", precision = 20, scale = 10, nullable = false)
    private BigDecimal amount;

    @Column(name = "transaction_type", length = 10, nullable = false)
    private String transactionType;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "source_name", length = 255)
    private String sourceName;

    @Column(name = "balance_after", precision = 20, scale = 10, nullable = false)
    private BigDecimal balanceAfter;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
