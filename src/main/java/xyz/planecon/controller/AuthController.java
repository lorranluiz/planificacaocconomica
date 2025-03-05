package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.model.entity.User;
import xyz.planecon.repository.UserRepository;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginRequest) {
        String username = loginRequest.get("username");
        String password = loginRequest.get("password");
        
        if (username == null || password == null) {
            return ResponseEntity.badRequest().body("Nome de usuário e senha são obrigatórios");
        }
        
        User user = userRepository.findByUsername(username);
        
        if (user != null && user.getPassword().equals(password)) {
            // Em um sistema real, você usaria Spring Security e bcrypt para senhas
            // Aqui estamos simplificando para fins didáticos
            
            Map<String, Object> response = new HashMap<>();
            response.put("id", user.getId());
            response.put("username", user.getUsername());
            response.put("name", user.getName());
            response.put("type", user.getType().name());
            response.put("pronoun", user.getPronoun().name());
            
            // Dados da instância associada
            if (user.getInstance() != null) {
                response.put("instanceId", user.getInstance().getId());
                response.put("instanceType", user.getInstance().getType().name());
                if (user.getInstance().getCommitteeName() != null) {
                    response.put("committeeName", user.getInstance().getCommitteeName());
                }
            }
            
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(401).body("Nome de usuário ou senha incorretos");
        }
    }
    
    @GetMapping("/user/{id}")
    public ResponseEntity<?> getUserDetails(@PathVariable Integer id) {
        return userRepository.findById(id)
            .map(user -> {
                Map<String, Object> response = new HashMap<>();
                response.put("id", user.getId());
                response.put("username", user.getUsername());
                response.put("name", user.getName());
                response.put("type", user.getType().name());
                response.put("pronoun", user.getPronoun().name());
                return ResponseEntity.ok(response);
            })
            .orElse(ResponseEntity.notFound().build());
    }
}