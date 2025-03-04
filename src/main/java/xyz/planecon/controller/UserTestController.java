package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user-test")
public class UserTestController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PostMapping
    public ResponseEntity<Map<String, Object>> createUserTest(@RequestBody Map<String, String> userData) {
        try {
            // Extrair valores do mapa de dados
            String username = userData.getOrDefault("username", "");
            String password = userData.getOrDefault("password", "");
            String name = userData.getOrDefault("name", "");
            String pronoun = userData.getOrDefault("pronoun", "");
            String type = userData.getOrDefault("type", "");
            String instanceId = userData.getOrDefault("instanceId", "");
            String createdAt = LocalDateTime.now().toString(); // Usar uma string para data

            KeyHolder keyHolder = new GeneratedKeyHolder();

            // Inserir diretamente com SQL simples
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO user_test (username, password, name, pronoun, type, created_at, instance_id) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS
                );
                ps.setString(1, username);
                ps.setString(2, password);
                ps.setString(3, name);
                ps.setString(4, pronoun);
                ps.setString(5, type);
                ps.setString(6, createdAt);
                ps.setString(7, instanceId);
                return ps;
            }, keyHolder);

            // Obter ID gerado
            Integer id = (Integer) (keyHolder.getKeys().get("id"));

            // Preparar resposta
            Map<String, Object> response = new HashMap<>();
            response.put("id", id);
            response.put("message", "User test record created successfully");
            response.put("userData", userData);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // Log do erro
            e.printStackTrace();
            
            // Retornar erro
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to create user test record");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}