package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import xyz.planecon.model.enums.UserType;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "\"user\"")  // Usando aspas duplas para escapar a palavra-chave SQL
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column
    private String name;

    @Column
    private String pronoun;

    //@Enumerated(EnumType.STRING)
    //@Column(name = "type", columnDefinition = "user_type", nullable = false)
    @Column(name = "type")
    private UserType type;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToOne
    @JoinColumn(name = "id_instance")
    private Instance instance;
}
