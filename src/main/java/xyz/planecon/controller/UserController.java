package xyz.planecon.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.User;
import xyz.planecon.model.enums.PronounType;
import xyz.planecon.model.enums.UserType;
import xyz.planecon.service.InstanceService;
import xyz.planecon.service.UserService;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;
    private final InstanceService instanceService;
    
    @GetMapping
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Integer id) {
        return userService.getUserById(id)
                .map(ResponseEntity::ok)
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