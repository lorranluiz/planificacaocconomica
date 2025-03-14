package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.dto.LoginRequest;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.User;
import xyz.planecon.repository.UserRepository;
import xyz.planecon.repository.InstanceRepository;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private InstanceRepository instanceRepository;

    // Endpoint de teste para verificar se o controlador está funcionando
    @GetMapping("/test")
    public ResponseEntity<Map<String, String>> testEndpoint() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "API de Autenticação está funcionando!");
        return ResponseEntity.ok(response);
    }

    // Atualizar a função login para retornar informações completas de pronome e tipo
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, Object> loginRequest) {
        try {
            String username = (String) loginRequest.get("username");
            String password = (String) loginRequest.get("password");
            
            if (username == null || password == null) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Nome de usuário e senha são obrigatórios");
                return ResponseEntity.badRequest().body(response);
            }
            
            User user = userRepository.findByUsername(username);
            
            if (user == null) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Usuário não encontrado");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            if (!password.equals(user.getPassword())) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Senha incorreta");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            Map<String, Object> response = new HashMap<>();
            Map<String, Object> userData = new HashMap<>();
            
            userData.put("id", user.getId());
            userData.put("username", user.getUsername());
            userData.put("name", user.getName());
            userData.put("type", user.getType().name());  // Retornar como string
            userData.put("pronoun", user.getPronoun().name());  // Retornar como string
            
            // Adicionar informações da instância se existir
            if (user.getInstance() != null) {
                Map<String, Object> instanceData = new HashMap<>();
                instanceData.put("id", user.getInstance().getId());
                instanceData.put("type", user.getInstance().getType().name());
                if (user.getInstance().getCommitteeName() != null) {
                    instanceData.put("committeeName", user.getInstance().getCommitteeName());
                }
                userData.put("instance", instanceData);
            }
            
            response.put("user", userData);
            response.put("token", UUID.randomUUID().toString());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> response = new HashMap<>();
            response.put("message", "Erro ao processar login: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
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
                
                // Se houver uma instância associada ao usuário
                if (user.getInstance() != null) {
                    Instance instance = instanceRepository.findById(user.getInstance().getId()).orElse(null);
                    
                    if (instance != null) {
                        Map<String, Object> instanceData = new HashMap<>();
                        instanceData.put("id", instance.getId());
                        instanceData.put("type", instance.getType().name());
                        
                        if (instance.getCommitteeName() != null) {
                            instanceData.put("committeeName", instance.getCommitteeName());
                        }
                        
                        response.put("instance", instanceData);
                    }
                }
                
                return ResponseEntity.ok(response);
            })
            .orElse(ResponseEntity.notFound().build());
    }
}