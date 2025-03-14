package xyz.planecon.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
import java.util.ArrayList;
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
    public ResponseEntity<Page<UserResponse>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        // Validação dos parâmetros
        if (page < 0) {
            page = 0; // Garantir que página não seja negativa
        }
        
        // Limitar tamanho máximo para evitar sobrecarga
        if (size <= 0) {
            size = 10;
        } else if (size > 100) {
            size = 100; // Limitar tamanho máximo
        }
        
        // Cria um objeto Pageable para definir a página e o tamanho
        Pageable pageable = PageRequest.of(page, size);
        
        try {
            // Busca os usuários de forma paginada
            Page<User> userPage = userService.findAllPaginated(pageable);
            
            // Converte para DTO e retorna
            Page<UserResponse> responsePage = userPage.map(this::convertToUserResponse);
            
            return ResponseEntity.ok(responsePage);
        } catch (Exception e) {
            // Log e tratamento de erro
            e.printStackTrace();
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(null);
        }
    }

    // Método auxiliar para converter User para UserResponse
    private UserResponse convertToUserResponse(User user) {
        UserResponse response = UserResponse.fromEntity(user);
        
        // Garantir que createdAt nunca seja nulo
        if (response.getCreatedAt() == null) {
            // Usar a data atual como fallback se o registro não tiver data
            response.setCreatedAt(LocalDateTime.now());
        }
        
        return response;
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

    @GetMapping("/{id}/related-entities")
    public ResponseEntity<?> getUserRelatedEntities(@PathVariable Integer id) {
        try {
            User user = userRepository.findById(id).orElse(null);
            
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Usuário não encontrado"));
            }
            
            // Esta é uma implementação simplificada - em um cenário real,
            // você buscaria no banco de dados as entidades relacionadas a este usuário
            List<Map<String, Object>> relatedEntities = new ArrayList<>();
            
            // Adicionar instância do usuário, se existir
            if (user.getInstance() != null) {
                Map<String, Object> instanceInfo = new HashMap<>();
                instanceInfo.put("type", "Instance");
                instanceInfo.put("id", user.getInstance().getId());
                instanceInfo.put("name", user.getInstance().getCommitteeName());
                instanceInfo.put("instanceType", user.getInstance().getType().name());
                relatedEntities.add(instanceInfo);
            }
            
            // Aqui você adicionaria outras entidades relacionadas conforme necessário
            
            return ResponseEntity.ok(relatedEntities);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Erro ao buscar entidades relacionadas: " + e.getMessage()));
        }
    }
}