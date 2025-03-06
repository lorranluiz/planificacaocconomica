package xyz.planecon.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.dto.UserRegistrationRequest;
import xyz.planecon.dto.UserResponse;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.User;
import xyz.planecon.model.enums.PronounType;
import xyz.planecon.model.enums.UserType;
import xyz.planecon.repository.UserRepository;
import xyz.planecon.service.InstanceService;
import xyz.planecon.service.UserService;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.repository.InstanceRepository;


@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private InstanceService instanceService;

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private InstanceRepository instanceRepository;
    
    @GetMapping
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Integer id) {
        return userRepository.findById(id)
                .map(user -> {
                    UserResponse response = UserResponse.fromEntity(user);
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody Map<String, Object> userData) {
        try {
            User user = new User();
            user.setUsername((String) userData.get("username"));
            user.setPassword((String) userData.get("password"));
            user.setName((String) userData.get("name"));
            user.setPronoun(PronounType.valueOf((String) userData.get("pronoun")));
            user.setType(UserType.valueOf((String) userData.get("type")));
            user.setCreatedAt(LocalDateTime.now());
            
            // Get instance
            Integer instanceId = Integer.valueOf(userData.get("instanceId").toString());
            Optional<Instance> instance = instanceService.getInstanceById(instanceId);
            
            if (instance.isPresent()) {
                user.setInstance(instance.get());
                return ResponseEntity.ok(userService.saveUser(user));
            } else {
                return ResponseEntity.badRequest().body("Instance not found");
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error creating user: " + e.getMessage());
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody UserRegistrationRequest request) {
        try {
// Verificar e imprimir dados recebidos (para debugging)
            System.out.println("Dados recebidos: " + request.toString());
            
            // Validar dados obrigatórios
            if (request.getName() == null || request.getName().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Nome é obrigatório"));
            }
            
            if (request.getUsername() == null || request.getUsername().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Nome de usuário é obrigatório"));
            }
            
            if (request.getPassword() == null || request.getPassword().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Senha é obrigatória"));
            }
            
            // Verificar se já existe usuário com o mesmo username
            User existingUser = userRepository.findByUsername(request.getUsername());
            if (existingUser != null) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("message", "Nome de usuário já está em uso"));
            }
            
            // Criar novo usuário
            User user = new User();
            user.setName(request.getName());
            user.setUsername(request.getUsername());
            user.setPassword(request.getPassword()); // Em produção, criptografar a senha
            user.setCreatedAt(LocalDateTime.now()); // Definindo a data de criação
            
            // Validar e definir tipo e pronome
            try {
                if (request.getType() == null) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Tipo de usuário é obrigatório"));
                }
                user.setType(UserType.valueOf(request.getType()));
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Tipo de usuário inválido: " + request.getType()));
            }
            
            try {
                if (request.getPronoun() == null) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Pronome é obrigatório"));
                }
                user.setPronoun(PronounType.valueOf(request.getPronoun()));
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Pronome inválido: " + request.getPronoun()));
            }
            
            // Se for COUNCILLOR, associar a uma instância
            if (user.getType() == UserType.COUNCILLOR) {
                Integer instanceId = request.getInstanceId();
                if (instanceId == null) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Conselheiros precisam estar associados a uma instância"));
                }
                
                Instance instance = instanceRepository.findById(instanceId).orElse(null);
                if (instance == null) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Instância não encontrada"));
                }
                
                // Verificar se a instância é um conselho ou comitê
                if (instance.getType() != InstanceType.COUNCIL && instance.getType() != InstanceType.COMMITTEE) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "message", "Conselheiros só podem ser associados a instâncias do tipo COUNCIL ou COMMITTEE"
                    ));
                }
                
                user.setInstance(instance);
            }
            
            // Salvar usuário
            User savedUser = userRepository.save(user);
            
            // Retornar resposta
            Map<String, Object> response = new HashMap<>();
            response.put("id", savedUser.getId());
            response.put("name", savedUser.getName());
            response.put("username", savedUser.getUsername());
            response.put("type", savedUser.getType().toString());
            response.put("pronoun", savedUser.getPronoun().toString());
            
            if (savedUser.getInstance() != null) {
                response.put("instanceId", savedUser.getInstance().getId());
                response.put("instanceType", savedUser.getInstance().getType().toString());
                if (savedUser.getInstance().getCommitteeName() != null) {
                    response.put("committeeName", savedUser.getInstance().getCommitteeName());
                }
            }
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Erro ao cadastrar usuário: " + e.getMessage()));
        }
    }
    
    @GetMapping("/types")
    public List<String> getUserTypes() {
                return Arrays.stream(UserType.values())
                .map(Enum::name)
                .toList();
    }
    
    @GetMapping("/pronouns")
    public List<String> getPronounTypes() {
                return Arrays.stream(PronounType.values())
                .map(Enum::name)
                .toList();
    }
    
    @GetMapping("/instances")
    public List<Instance> getAllInstances() {
        return instanceService.getAllInstances();
    }
}