package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import xyz.planecon.model.enums.UserType;
import xyz.planecon.model.enums.PronounType; // Certifique-se que este import existe
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

    @Enumerated(EnumType.STRING)
    @Column(name = "pronoun", nullable = false)
    private PronounType pronoun;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private UserType type;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToOne
    @JoinColumn(name = "id_instance")
    private Instance instance;

    // Setters
    public void setUsername(String username) {
        this.username = username;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setType(UserType type) {
        this.type = type;
    }

    public void setPronoun(PronounType pronoun) {
        this.pronoun = pronoun;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setInstance(Instance instance) {
        this.instance = instance;
    }

    // Getters
    public Integer getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getPassword() {
        return password;
    }

    public UserType getType() {
        return type;
    }

    public PronounType getPronoun() {
        return pronoun;
    }

    public Instance getInstance() {
        return instance;
    }
}
