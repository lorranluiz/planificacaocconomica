package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.Sector;
import xyz.planecon.model.entity.User;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.model.enums.PronounType;
import xyz.planecon.model.enums.UserType;
import xyz.planecon.repository.InstanceRepository;
import xyz.planecon.repository.SectorRepository;
import xyz.planecon.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.List;
import java.util.ArrayList;
import java.util.Random;
import java.math.BigDecimal;
import java.math.RoundingMode;

@RestController
@RequestMapping("/api")
public class UserTestController {
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private InstanceRepository instanceRepository;
    
    @Autowired
    private SectorRepository sectorRepository;

    @PostMapping("/user-test")
    public ResponseEntity<?> createUserTest(@RequestBody Map<String, Object> userData) {
        try {
            // Extrair dados do request
            String username = (String) userData.get("username");
            String password = (String) userData.get("password");
            String name = (String) userData.get("name");
            String pronounStr = (String) userData.get("pronoun");
            String typeStr = (String) userData.get("type");
            Integer instanceId = (Integer) userData.get("instanceId"); // Pode ser null para NON_COUNCILLOR
            
            // Validar dados obrigatórios
            if (username == null || username.isEmpty() || 
                password == null || password.isEmpty() ||
                name == null || name.isEmpty() ||
                pronounStr == null || typeStr == null) {
                return ResponseEntity.badRequest().body("Campos obrigatórios não preenchidos.");
            }
            
            // Converter strings para enums
            PronounType pronoun = PronounType.valueOf(pronounStr);
            UserType type = UserType.valueOf(typeStr);
            
            Instance instance = null;
            
            // Tratamento diferenciado com base no tipo de usuário
            if (type == UserType.COUNCILLOR) {
                // Para COUNCILLOR, uma instância existente deve ser fornecida
                if (instanceId == null) {
                    return ResponseEntity.badRequest()
                        .body("É necessário fornecer uma instância para usuários do tipo COUNCILLOR");
                }
                
                // Buscar instância
                Optional<Instance> optionalInstance = instanceRepository.findById(instanceId);
                if (!optionalInstance.isPresent()) {
                    return ResponseEntity.badRequest().body("Instância não encontrada com ID: " + instanceId);
                }
                instance = optionalInstance.get();
                
                // Validar o tipo da instância para COUNCILLOR
                if (instance.getType() != InstanceType.COUNCIL && instance.getType() != InstanceType.COMMITTEE) {
                    return ResponseEntity.badRequest()
                        .body("Usuários COUNCILLOR só podem ser associados a instâncias do tipo COUNCIL ou COMMITTEE.");
                }
            } else if (type == UserType.NON_COUNCILLOR) {
                // Para NON_COUNCILLOR, criar uma nova instância WORKER
                
                // 1. Primeiro, buscar um comitê para associar à nova instância WORKER
                List<Instance> committees = (List<Instance>) instanceRepository.findByType(InstanceType.COMMITTEE);
                if (committees.isEmpty()) {
                    return ResponseEntity.badRequest()
                        .body("Não foi possível criar usuário NON_COUNCILLOR: nenhum comitê (COMMITTEE) encontrado para associação.");
                }
                
                // 2. Selecionar um comitê aleatoriamente
                Instance committee = committees.get(new Random().nextInt(committees.size()));
                
                // 3. Buscar um setor aleatório
                List<Sector> sectors = (List<Sector>) sectorRepository.findAll();
                if (sectors.isEmpty()) {
                    return ResponseEntity.badRequest().body("Nenhum setor encontrado para criar a instância WORKER.");
                }
                Sector sector = sectors.get(new Random().nextInt(sectors.size()));
                
                // 4. Criar a instância WORKER
                instance = new Instance();
                instance.setType(InstanceType.WORKER);
                instance.setCommitteeName(name + "'s Workstation");
                instance.setWorkerEffectiveLimit(null); // Deve ser NULL para WORKER
                instance.setCreatedAt(LocalDateTime.now());
                
                // Referências para o comitê associado
                instance.setPopularCouncilAssociatedWithCommitteeOrWorker(committee);
                instance.setAssociatedWorkerCommittee(committee);
                
                // Valores típicos para um trabalhador
                BigDecimal participation = new BigDecimal("0.0000001").add(
                    new BigDecimal(new Random().nextDouble() * 0.0000005)
                ).setScale(15, RoundingMode.HALF_UP);
                instance.setEstimatedIndividualParticipationInSocialWork(participation);
                
                instance.setHoursAtElectronicPoint(new BigDecimal(5 + new Random().nextInt(45)));
                
                // Salvar a instância
                instance = instanceRepository.save(instance);
            } else {
                return ResponseEntity.badRequest().body("Tipo de usuário inválido.");
            }
            
            // Criar usuário
            User user = new User();
            user.setUsername(username);
            user.setPassword(password);
            user.setName(name);
            user.setType(type);
            user.setPronoun(pronoun);
            user.setInstance(instance);
            user.setCreatedAt(LocalDateTime.now());
            
            // Salvar usuário
            User savedUser = userRepository.save(user);
            
            // Retornar apenas os dados essenciais para evitar loops de referência
            Map<String, Object> response = new HashMap<>();
            response.put("id", savedUser.getId());
            response.put("username", savedUser.getUsername());
            response.put("name", savedUser.getName());
            response.put("type", savedUser.getType().name());
            response.put("pronoun", savedUser.getPronoun().name());
            response.put("instanceId", instance.getId());
            response.put("instanceType", instance.getType().name());
            response.put("createdAt", savedUser.getCreatedAt());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Valor inválido para enum: " + e.getMessage());
        } catch (Exception e) {
            e.printStackTrace(); // Para debug
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erro ao criar usuário: " + e.getMessage());
        }
    }

    @GetMapping("/instances-simple")
    public ResponseEntity<?> getAllInstancesSimple() {
        try {
            List<Instance> instances = (List<Instance>) instanceRepository.findAll();
            List<Map<String, Object>> simplifiedInstances = new ArrayList<>();
            
            for (Instance instance : instances) {
                Map<String, Object> map = new HashMap<>();
                map.put("id", instance.getId());
                map.put("type", instance.getType().name());
                map.put("committeeName", instance.getCommitteeName());
                simplifiedInstances.add(map);
            }
            
            return ResponseEntity.ok(simplifiedInstances);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Erro ao listar instâncias: " + e.getMessage());
        }
    }
}