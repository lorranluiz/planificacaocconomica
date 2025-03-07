package xyz.planecon.config;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import xyz.planecon.model.entity.*;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.model.enums.PronounType;
import xyz.planecon.model.enums.UserType;
import xyz.planecon.repository.InstanceRepository;
import xyz.planecon.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Gerador de usuários para população massiva do banco de dados
 */
@Component
public class UserGenerator {

    private final UserRepository userRepository;
    private final InstanceRepository instanceRepository;
    private final PasswordEncoder passwordEncoder;
    private final Random random = new Random();
    
    // Listas para gerar nomes de pessoas
    private final List<String> firstNames = Arrays.asList(
            "Sofia", "Miguel", "Alice", "Arthur", "Helena", "Bernardo", "Valentina", "Heitor", 
            "Laura", "Davi", "Isabella", "Lorenzo", "Manuela", "Théo", "Júlia", "Pedro", 
            "Heloísa", "Gabriel", "Luiza", "Enzo", "Maria", "Matheus", "Cecília", "Lucas"
    );
    
    private final List<String> lastNames = Arrays.asList(
            "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira",
            "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes"
    );
    
    private final List<String> usernames = Arrays.asList(
            "user", "worker", "planner", "council", "coordinator", "manager", "analyst",
            "producer", "developer", "organizer", "facilitator", "committee", "rep"
    );
    
    // Probabilidades para tipos de usuários
    private static final double COUNCILLOR_PROBABILITY = 0.20;   // 20% conselheiros
    private static final double NON_COUNCILLOR_PROBABILITY = 0.80;   // 80% não-conselheiros
    
    public UserGenerator(
            UserRepository userRepository,
            InstanceRepository instanceRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.instanceRepository = instanceRepository;
        this.passwordEncoder = passwordEncoder;
    }
    
    /**
     * Gera usuários em massa e associa às instâncias correspondentes
     */
    public List<User> generateUsers(int count, Map<String, List<Instance>> instanceMap) {
        System.out.println("Gerando " + count + " usuários...");
        
        // Lista para armazenar os usuários criados
        List<User> users = new ArrayList<>();
        Set<String> usedUsernames = new HashSet<>();
        
        // Separar as instâncias por tipo
        List<Instance> councils = instanceMap.get("councils");
        List<Instance> committees = instanceMap.get("committees");
        
        // Criar usuários para conselhos (COUNCILLOR)
        int councillorCount = (int) Math.ceil(count * COUNCILLOR_PROBABILITY);
        int councillorForCouncilsCount = Math.min(councillorCount * 2 / 3, councils.size());
        int councillorForCommitteesCount = Math.min(councillorCount - councillorForCouncilsCount, committees.size());
        
        // Associar conselheiros aos conselhos
        for (int i = 0; i < councillorForCouncilsCount; i++) {
            Instance council = councils.get(i % councils.size());
            User councillorUser = createUserWithType(UserType.COUNCILLOR, usedUsernames, council);
            users.add(councillorUser);
        }
        
        // Associar conselheiros aos comitês
        for (int i = 0; i < councillorForCommitteesCount; i++) {
            Instance committee = committees.get(i % committees.size());
            User councillorUser = createUserWithType(UserType.COUNCILLOR, usedUsernames, committee);
            users.add(councillorUser);
        }
        
        // Resto dos usuários como não-conselheiros (NON_COUNCILLOR)
        int remainingUsers = count - users.size();
        
        System.out.println("Gerando " + remainingUsers + " usuários do tipo NON_COUNCILLOR...");
        for (int i = 0; i < remainingUsers; i++) {
            // Criar usuário do tipo NON_COUNCILLOR
            User nonCouncillorUser = createUserWithType(UserType.NON_COUNCILLOR, usedUsernames, null);
            users.add(nonCouncillorUser);
            
            if (i > 0 && i % 100 == 0) {
                System.out.println("  - Criados " + i + " trabalhadores não-conselheiros...");
            }
        }
        
        System.out.println("Usuários criados com sucesso:");
        System.out.println("  - COUNCILLOR: " + (councillorForCouncilsCount + councillorForCommitteesCount));
        System.out.println("    - Associados a conselhos: " + councillorForCouncilsCount);
        System.out.println("    - Associados a comitês: " + councillorForCommitteesCount);
        System.out.println("  - NON_COUNCILLOR: " + remainingUsers);
        System.out.println("  - Total: " + users.size());
        
        return users;
    }
    
    /**
     * Cria um usuário com configurações de acordo com o tipo
     */
    private User createUserWithType(UserType userType, Set<String> usedUsernames, Instance instance) {
        String firstName = firstNames.get(random.nextInt(firstNames.size()));
        String lastName = lastNames.get(random.nextInt(lastNames.size()));
        String fullName = firstName + " " + lastName;
        
        String username = generateUniqueUsername(firstName, lastName, usedUsernames);
        usedUsernames.add(username);
        
        // Determinar tipo de pronome com distribuição mais realista
        PronounType pronounType;
        
        // Dar 15% de chance para THEY_THEM
        double randomValue = random.nextDouble();
        if (randomValue < 0.15) {
            pronounType = PronounType.THEY_THEM;
        } else {
            // Para o restante, tentar inferir baseado no nome (método simples)
            // ou escolher randomicamente
            if (isProbablyFeminineName(firstName)) {
                pronounType = PronounType.SHE_HER;
            } else {
                pronounType = PronounType.HE_HIM;
            }
        }
        
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode("password")); 
        user.setName(fullName);  // Em vez de setFullName
        user.setType(userType);
        user.setPronoun(pronounType);  // Em vez de setPronounType
        user.setCreatedAt(LocalDateTime.now());
        user.setInstance(instance);
        
        return userRepository.save(user);
    }
    
    /**
     * Método simples para tentar inferir se um nome é tipicamente feminino
     */
    private boolean isProbablyFeminineName(String firstName) {
        // Lista de nomes tipicamente femininos que não seguem o padrão
        List<String> femaleExceptions = Arrays.asList(
                "isabel", "raquel", "carmen", "ingrid", "ruth", "débora", 
                "rachel", "vivian", "marian", "ellen", "carol", "agnes"
        );
        
        // Lista de nomes tipicamente masculinos que terminam em 'a', 'e', etc
        List<String> maleExceptions = Arrays.asList(
                "andrea", "jose", "felipe", "jorge", "mike", "jake", "luke", "dante"
        );
        
        String nameLower = firstName.toLowerCase();
        
        // Verificar exceções específicas
        if (femaleExceptions.contains(nameLower)) {
            return true;
        }
        
        if (maleExceptions.contains(nameLower)) {
            return false;
        }
        
        // Regra geral: nomes terminados em 'a' ou algumas terminações específicas
        // são mais provavelmente femininos
        return nameLower.endsWith("a") || nameLower.endsWith("ina") || 
               nameLower.endsWith("ana") || nameLower.endsWith("na") ||
               nameLower.endsWith("la") || nameLower.endsWith("ia");
    }
    
    /**
     * Gera um nome completo aleatório combinando nomes e sobrenomes
     */
    private String generateFullName() {
        return firstNames.get(random.nextInt(firstNames.size())) + " " + 
               lastNames.get(random.nextInt(lastNames.size()));
    }
    
    /**
     * Gera um nome de usuário único baseado no nome real
     */
    private String generateUniqueUsername(String firstName, String lastName, Set<String> usedUsernames) {
        // Tenta inicialmente com primeiro nome + sobrenome
        String baseUsername = (firstName + lastName).toLowerCase()
                .replaceAll("[^a-z0-9]", "")
                .substring(0, Math.min(12, firstName.length() + lastName.length()));
        String username = baseUsername;
        
        // Se já existir, adiciona um sufixo aleatório
        int attempts = 0;
        while (usedUsernames.contains(username) && attempts < 50) {
            String randomPart = usernames.get(random.nextInt(usernames.size()));
            username = baseUsername + random.nextInt(1000) + randomPart;
            username = username.substring(0, Math.min(20, username.length()));
            attempts++;
        }
        
        // Se ainda houver colisão após várias tentativas, gere um nome totalmente aleatório
        if (usedUsernames.contains(username)) {
            username = UUID.randomUUID().toString().substring(0, 12);
        }
        
        return username;
    }
    
    /**
     * Associa usuários do tipo NON_COUNCILLOR às instâncias WORKER criadas
     */
    public void associateWorkersToInstances(List<User> users, List<Instance> workerInstances) {
        List<User> nonCouncillorUsers = users.stream()
                .filter(u -> u.getType() == UserType.NON_COUNCILLOR && u.getInstance() == null)
                .toList();
        
        System.out.println("Associando " + Math.min(nonCouncillorUsers.size(), workerInstances.size()) + 
                         " usuários NON_COUNCILLOR às suas instâncias...");
        
        for (int i = 0; i < Math.min(nonCouncillorUsers.size(), workerInstances.size()); i++) {
            User user = nonCouncillorUsers.get(i);
            Instance instance = workerInstances.get(i);
            
            user.setInstance(instance);
            userRepository.save(user);
            
            if (i > 0 && i % 100 == 0) {
                System.out.println("  - Associados " + i + " trabalhadores não-conselheiros...");
            }
        }
    }
    
    public List<String> getFirstNames() {
        return firstNames;
    }

    public List<String> getLastNames() {
        return lastNames;
    }
}