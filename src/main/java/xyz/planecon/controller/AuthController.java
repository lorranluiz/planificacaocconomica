package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.dto.LoginRequest;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.User;
import xyz.planecon.repository.UserRepository;
import xyz.planecon.repository.InstanceRepository;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private InstanceRepository instanceRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        try {
            System.out.println("Tentativa de login com usuário: " + loginRequest.getUsername());
            
            // Buscar o usuário pelo nome de usuário
            User user = userRepository.findByUsername(loginRequest.getUsername());
            
            // Verificar se o usuário existe e a senha está correta
            if (user == null) {
                System.out.println("Usuário não encontrado: " + loginRequest.getUsername());
                return ResponseEntity.status(401).body(Map.of("message", "Nome de usuário ou senha incorretos"));
            }
            
            // Verificar a senha (em produção, deve-se usar criptografia)
            if (!user.getPassword().equals(loginRequest.getPassword())) {
                System.out.println("Senha incorreta para o usuário: " + loginRequest.getUsername());
                return ResponseEntity.status(401).body(Map.of("message", "Nome de usuário ou senha incorretos"));
            }
            
            // Montar resposta com dados do usuário
            Map<String, Object> response = new HashMap<>();
            response.put("id", user.getId());
            response.put("name", user.getName());
            response.put("username", user.getUsername());
            response.put("type", user.getType().toString());
            response.put("pronoun", user.getPronoun().toString());
            
            // Garantir que os dados da instância sejam carregados
            // Se um usuário estiver associado a uma instância
            if (user.getInstance() != null) {
                // Forçar o carregamento completo da instância
                Instance instance = instanceRepository.findById(user.getInstance().getId()).orElse(null);
                
                if (instance != null) {
                    response.put("instanceId", instance.getId());
                    response.put("instanceType", instance.getType().toString());
                    
                    // Adicionar URL para acessar os tensores tecnológicos desta instância
                    response.put("tensorsUrl", "/api/tensors/by-instance/" + instance.getId());
                    
                    if (instance.getCommitteeName() != null) {
                        response.put("committeeName", instance.getCommitteeName());
                    }
                    
                    if (instance.getWorkerEffectiveLimit() != null) {
                        response.put("workerEffectiveLimit", instance.getWorkerEffectiveLimit());
                    }
                    
                    // Incluir informações específicas do tipo de instância
                    if (instance.getEstimatedIndividualParticipationInSocialWork() != null) {
                        response.put("estimatedParticipation", 
                            instance.getEstimatedIndividualParticipationInSocialWork().toString());
                    }
                    
                    if (instance.getHoursAtElectronicPoint() != null) {
                        response.put("hoursAtElectronicPoint", 
                            instance.getHoursAtElectronicPoint().toString());
                    }
                    
                    if (instance.getProducedQuantity() != null) {
                        response.put("producedQuantity", 
                            instance.getProducedQuantity().toString());
                    }
                    
                    if (instance.getTargetQuantity() != null) {
                        response.put("targetQuantity", 
                            instance.getTargetQuantity().toString());
                    }
                    
                    // Informações sobre materialização social
                    if (instance.getSocialMaterialization() != null) {
                        Map<String, Object> materialData = new HashMap<>();
                        materialData.put("id", instance.getSocialMaterialization().getId());
                        materialData.put("name", instance.getSocialMaterialization().getName());
                        materialData.put("type", instance.getSocialMaterialization().getType().toString());
                        response.put("socialMaterialization", materialData);
                    }
                }
            }
            
            System.out.println("Login bem-sucedido para o usuário: " + loginRequest.getUsername() + 
                               ", detalhes da resposta: " + response);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Erro durante a autenticação: " + e.getMessage()));
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