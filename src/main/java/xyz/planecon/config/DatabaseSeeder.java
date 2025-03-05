package xyz.planecon.config;

import jakarta.transaction.Transactional;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import xyz.planecon.model.entity.*;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.model.enums.PronounType;
import xyz.planecon.model.enums.SocialMaterializationType;
import xyz.planecon.model.enums.UserType;
import xyz.planecon.repository.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.time.Duration;
import java.util.List;
import java.util.Random;
import java.util.ArrayList;
import java.util.Collections;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.stream.Collectors;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    @PersistenceContext
    private EntityManager entityManager;

    private final InstanceRepository instanceRepository;
    private final SocialMaterializationRepository socialMaterializationRepository;
    private final UserRepository userRepository;
    private final WorkersProposalRepository workersProposalRepository;
    private final SectorRepository sectorRepository;
    private final DemandStockRepository demandStockRepository;
    private final DemandVectorRepository demandVectorRepository;
    private final OptimizationInputsResultsRepository optimizationInputsResultsRepository;
    private final TechnologicalTensorRepository technologicalTensorRepository;
    
    private final Random random = new Random();

    public DatabaseSeeder(
            InstanceRepository instanceRepository,
            SocialMaterializationRepository socialMaterializationRepository,
            UserRepository userRepository,
            WorkersProposalRepository workersProposalRepository,
            SectorRepository sectorRepository,
            DemandStockRepository demandStockRepository,
            DemandVectorRepository demandVectorRepository,
            OptimizationInputsResultsRepository optimizationInputsResultsRepository,
            TechnologicalTensorRepository technologicalTensorRepository
    ) {
        this.instanceRepository = instanceRepository;
        this.socialMaterializationRepository = socialMaterializationRepository;
        this.userRepository = userRepository;
        this.workersProposalRepository = workersProposalRepository;
        this.sectorRepository = sectorRepository;
        this.demandStockRepository = demandStockRepository;
        this.demandVectorRepository = demandVectorRepository;
        this.optimizationInputsResultsRepository = optimizationInputsResultsRepository;
        this.technologicalTensorRepository = technologicalTensorRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        // Verificar se o banco de dados já está populado
        if (isDatabasePopulated()) {
            System.out.println("Banco de dados já está populado. Pulando etapa de seed.");
            return;
        }
        
        System.out.println("Iniciando população do banco de dados...");
        
        // Remover temporariamente as constraints para permitir a criação inicial
        try {
            entityManager.createNativeQuery("ALTER TABLE instance DROP CONSTRAINT IF EXISTS chk_council_columns").executeUpdate();
            entityManager.createNativeQuery("ALTER TABLE instance DROP CONSTRAINT IF EXISTS chk_worker_columns").executeUpdate();
            entityManager.createNativeQuery("ALTER TABLE instance DROP CONSTRAINT IF EXISTS chk_worker_effective_limit").executeUpdate();
        } catch (Exception e) {
            System.err.println("Erro ao remover constraint: " + e.getMessage());
        }

        // Create sectors - Garantindo que todos tenham created_at
        List<String> sectorNames = Arrays.asList(
                "Manufacturing", "Agriculture", "Education", 
                "Healthcare", "Technology", "Transportation",
                "Energy", "Construction", "Textiles", "Food Processing"
        );
        
        // Garantir que created_at seja definido para todos os setores
        for (String name : sectorNames) {
            Sector sector = new Sector();
            sector.setName(name);
            sector.setCreatedAt(LocalDateTime.now()); // Definindo o timestamp
            sectorRepository.save(sector);
        }
        
        // Verificar se todos os setores têm created_at definido
        List<Sector> sectors = (List<Sector>) sectorRepository.findAll();
        for (Sector sector : sectors) {
            if (sector.getCreatedAt() == null) {
                sector.setCreatedAt(LocalDateTime.now());
                sectorRepository.save(sector);
            }
        }
        
        // Primeiro criar instâncias do tipo COUNCIL para poder referenciar depois
        Instance earthCouncil = new Instance();
        earthCouncil.setType(InstanceType.COUNCIL);
        earthCouncil.setWorkerEffectiveLimit(null); // COUNCIL não deve ter worker_effective_limit
        earthCouncil.setTotalSocialWorkOfThisJurisdiction(9000 + random.nextInt(41000));
        earthCouncil.setCreatedAt(LocalDateTime.now());
        instanceRepository.save(earthCouncil); // Salvar primeiro para obter o ID
        
        // Agora que temos o ID, podemos definir a auto-referência
        earthCouncil.setPopularCouncilAssociatedWithPopularCouncil(earthCouncil);
        instanceRepository.save(earthCouncil);
        
        // Criar os outros conselhos que referenciam o central
        Instance regionalCouncil = createInstance(InstanceType.COUNCIL, null, null, sectors.get(1), 
                earthCouncil.getId(), new BigDecimal(9000 + random.nextInt(41000)), null, null, null);
        
        Instance educationCouncil = createInstance(InstanceType.COUNCIL, null, null, sectors.get(2), 
                earthCouncil.getId(), new BigDecimal(9000 + random.nextInt(41000)), null, null, null);
        
        Instance energyCouncil = createInstance(InstanceType.COUNCIL, null, null, sectors.get(6), 
                regionalCouncil.getId(), new BigDecimal(9000 + random.nextInt(41000)), null, null, null);
        
        Instance foodCouncil = createInstance(InstanceType.COUNCIL, null, null, sectors.get(9), 
                earthCouncil.getId(), new BigDecimal(9000 + random.nextInt(41000)), null, null, null);
        
        List<Instance> councilInstances = Arrays.asList(earthCouncil, regionalCouncil, educationCouncil, energyCouncil, foodCouncil);
        
        // Criar social materializations
        createSocialMaterialization("Steel Components", SocialMaterializationType.PRODUCT, sectors.get(0));
        createSocialMaterialization("Organic Vegetables", SocialMaterializationType.PRODUCT, sectors.get(1));
        createSocialMaterialization("Educational Programs", SocialMaterializationType.SERVICE, sectors.get(2));
        createSocialMaterialization("Preventive Healthcare", SocialMaterializationType.SERVICE, sectors.get(3));
        createSocialMaterialization("Software Applications", SocialMaterializationType.PRODUCT, sectors.get(4));
        createSocialMaterialization("Public Transit", SocialMaterializationType.SERVICE, sectors.get(5));
        createSocialMaterialization("Solar Panels", SocialMaterializationType.PRODUCT, sectors.get(6));
        createSocialMaterialization("Prefabricated Housing", SocialMaterializationType.PRODUCT, sectors.get(7));
        createSocialMaterialization("Clothing Items", SocialMaterializationType.PRODUCT, sectors.get(8));
        createSocialMaterialization("Processed Foods", SocialMaterializationType.PRODUCT, sectors.get(9));
        
        List<SocialMaterialization> socialMaterializations = (List<SocialMaterialization>) socialMaterializationRepository.findAll();
        
        // Criar comitês com referências a conselhos e social materializations
        List<String> committeeNames = Arrays.asList(
                "Factory Planning Committee", "Agricultural Development Committee", 
                "Healthcare Planning Committee", "Software Development Committee", 
                "Building Materials Committee", "Transport Planning Committee"
        );
        
        List<Instance> committeeInstances = new ArrayList<>();
        
        for (int i = 0; i < committeeNames.size(); i++) {
            SocialMaterialization sm = socialMaterializations.get(i % socialMaterializations.size());
            Instance council = councilInstances.get(i % councilInstances.size());
            
            // Valores para produced_quantity e target_quantity
            BigDecimal producedQuantity = new BigDecimal(random.nextInt(800) + 200);
            BigDecimal targetQuantity = producedQuantity.add(new BigDecimal(random.nextInt(500) + 100));
            
            // Para COMMITTEE, definimos worker_effective_limit
            Instance committee = createInstance(
                InstanceType.COMMITTEE, 
                committeeNames.get(i), 
                20 + random.nextInt(20),  // worker_effective_limit - apenas para COMMITTEE
                sectors.get(i % sectors.size()),
                council.getId(),
                new BigDecimal(9000 + random.nextInt(41000)),
                sm.getId(),
                producedQuantity,
                targetQuantity
            );
            
            committeeInstances.add(committee);
        }
        
        // REMOVIDO: Criação manual de instâncias WORKER sem associação com usuários
        // As instâncias WORKER serão criadas apenas associadas a usuários NON_COUNCILLOR
        
        // Resto do código mantido como está...
        List<Instance> instances = (List<Instance>) instanceRepository.findAll();
        
        // Selecionar instâncias apropriadas para cada tipo de usuário
        List<Instance> councilAndCommitteeInstances = instances.stream()
            .filter(i -> i.getType() == InstanceType.COUNCIL || i.getType() == InstanceType.COMMITTEE)
            .collect(Collectors.toList());

        List<Instance> workerInstances = instances.stream()
            .filter(i -> i.getType() == InstanceType.WORKER)
            .collect(Collectors.toList());

        // Criar usuários COUNCILLOR para instâncias COUNCIL ou COMMITTEE
        createUser("professor_liu", "Liu Wei", UserType.COUNCILLOR, PronounType.THEY_THEM, councilAndCommitteeInstances.get(0));
        createUser("energy_admin", "Jordan Taylor", UserType.COUNCILLOR, PronounType.THEY_THEM, councilAndCommitteeInstances.get(1));
        createUser("food_planner", "Miguel Santos", UserType.COUNCILLOR, PronounType.HE_HIM, councilAndCommitteeInstances.get(2));

        // Obter os comitês para associar às novas instâncias WORKER
        List<Instance> filteredCommitteeInstances = instances.stream()
            .filter(i -> i.getType() == InstanceType.COMMITTEE)
            .collect(Collectors.toList());

        // Para cada usuário NON_COUNCILLOR, criar uma instância WORKER dedicada
        createNonCouncillorUser("carlos_metal", "Carlos Rodriguez", PronounType.HE_HIM, sectors.get(0), filteredCommitteeInstances.get(0));
        createNonCouncillorUser("ana_farmer", "Ana Martinez", PronounType.SHE_HER, sectors.get(1), filteredCommitteeInstances.get(1));
        createNonCouncillorUser("dr_johnson", "Sarah Johnson", PronounType.SHE_HER, sectors.get(2), filteredCommitteeInstances.get(0));
        createNonCouncillorUser("dev_patel", "Raj Patel", PronounType.HE_HIM, sectors.get(4), filteredCommitteeInstances.get(1));
        createNonCouncillorUser("transport_coord", "Maria Gonzalez", PronounType.SHE_HER, sectors.get(5), filteredCommitteeInstances.get(0));
        createNonCouncillorUser("architect_chen", "Chen Li", PronounType.HE_HIM, sectors.get(7), filteredCommitteeInstances.get(1));
        createNonCouncillorUser("textile_lead", "Fatima Ahmed", PronounType.SHE_HER, sectors.get(8), filteredCommitteeInstances.get(0));
        createNonCouncillorUser("factory_coord", "Elena Petrova", PronounType.SHE_HER, sectors.get(0), filteredCommitteeInstances.get(1));
        
        // Obter lista atualizada de todas as instâncias após criar usuários NON_COUNCILLOR e suas instâncias WORKER
        instances = (List<Instance>) instanceRepository.findAll();
        
        // Instâncias worker agora vêm apenas das criadas junto com os usuários NON_COUNCILLOR
        workerInstances = instances.stream()
            .filter(i -> i.getType() == InstanceType.WORKER)
            .collect(Collectors.toList());
        
        // Criar propostas utilizando apenas instâncias WORKER que já estão associadas a usuários
        if (!workerInstances.isEmpty()) {
            for (int i = 0; i < Math.min(8, workerInstances.size()); i++) {
                Instance workerInstance = workerInstances.get(i % workerInstances.size());
                createWorkerProposal(
                    workerInstance,
                    200 + random.nextInt(600),
                    new BigDecimal(2 + random.nextInt(3)),
                    new BigDecimal("0." + (15 + random.nextInt(25))),
                    random.nextBoolean(),
                    3 + random.nextInt(2)
                );
            }
        }
        
        // Create demand_stock e demand_vector usando todos os tipos de instâncias
        // (não apenas WORKER, pois essas operações não violam nossa regra)
        List<Instance> allInstances = instances.stream()
            .filter(i -> i.getType() == InstanceType.COUNCIL || i.getType() == InstanceType.COMMITTEE || i.getType() == InstanceType.WORKER)
            .collect(Collectors.toList());
        
        // Criar demand_stock para diferentes materializações - uma instância diferente para cada
        List<Instance> instancesForDemandStock = new ArrayList<>(allInstances);
        Collections.shuffle(instancesForDemandStock); // Embaralha para aleatoriedade
        for (int i = 0; i < Math.min(socialMaterializations.size(), instancesForDemandStock.size()); i++) {
            createDemandStock(socialMaterializations.get(i), new BigDecimal(1000 + random.nextInt(9000)), instancesForDemandStock.get(i));
        }
        
        // Criar demand_vector para diferentes materializações - uma instância diferente para cada
        List<Instance> instancesForDemandVector = new ArrayList<>(allInstances);
        Collections.shuffle(instancesForDemandVector); // Embaralha para aleatoriedade
        for (int i = 0; i < Math.min(socialMaterializations.size(), instancesForDemandVector.size()); i++) {
            createDemandVector(socialMaterializations.get(i), new BigDecimal(500 + random.nextInt(1500)), instancesForDemandVector.get(i));
        }
        
        // Resto do código continua igual...
        // Create workers proposals
        createWorkerProposal(instances.get(0), 800, new BigDecimal("2"), new BigDecimal("0.3"), false, 4);
        createWorkerProposal(instances.get(1), 500, new BigDecimal("3"), new BigDecimal("0.5"), false, 3);
        createWorkerProposal(instances.get(3), 1200, new BigDecimal("4"), new BigDecimal("0.25"), false, 3);
        createWorkerProposal(instances.get(4), 500, new BigDecimal("2"), new BigDecimal("0.15"), true, 3);
        createWorkerProposal(instances.get(5), 300, new BigDecimal("4"), new BigDecimal("0.22"), true, 3);
        createWorkerProposal(instances.get(7), 250, new BigDecimal("2"), new BigDecimal("0.4"), false, 4);
        createWorkerProposal(instances.get(8), 400, new BigDecimal("3"), new BigDecimal("0.18"), false, 3);
        createWorkerProposal(instances.get(10), 1500, new BigDecimal("2"), new BigDecimal("0.27"), true, 4);
        
        // Criar optimization_inputs_results
        for (int i = 0; i < 5; i++) {
            createOptimizationInputsResults(
                instances.get(random.nextInt(instances.size())), // Instance
                socialMaterializations.get(random.nextInt(socialMaterializations.size())), // SocialMaterialization
                random.nextInt(1500) + 1, // WorkerLimit
                new BigDecimal(random.nextDouble() * 2).setScale(2, BigDecimal.ROUND_HALF_UP), // WorkerHours
                new BigDecimal(random.nextDouble() * 0.2).setScale(2, BigDecimal.ROUND_HALF_UP), // ProductionTime
                random.nextBoolean(), // NightShift
                random.nextInt(4) + 1, // WeeklyScale
                random.nextInt(4) + 1, // PlannedWeeklyScale
                new BigDecimal(random.nextDouble() * 5000).setScale(2, BigDecimal.ROUND_HALF_UP), // ProductionGoal
                new BigDecimal(random.nextDouble() * 10000).setScale(2, BigDecimal.ROUND_HALF_UP), // TotalHours
                random.nextInt(1000) + 1, // WorkersNeeded
                random.nextInt(100) + 1, // FactoriesNeeded
                random.nextInt(400) + 1, // TotalShifts
                new BigDecimal(random.nextDouble() * 10).setScale(2, BigDecimal.ROUND_HALF_UP), // MinimumProductionTime
                Duration.ofDays(random.nextInt(365) + 1), // TotalEmploymentPeriod
                new BigDecimal(random.nextDouble() * 1000).setScale(2, BigDecimal.ROUND_HALF_UP) // PlannedFinalDemand
            );
        }
        
        // Criar technological_tensor entre diferentes materializations
        for (int i = 0; i < socialMaterializations.size(); i++) {
            for (int j = 0; j < socialMaterializations.size(); j++) {
                if (i != j && random.nextBoolean()) { // Não criar para todos os pares, apenas alguns aleatórios
                    // Valores entre 0.000001 e 0.009
                    double minValue = 0.000001;
                    double maxValue = 0.009;
                    double meanValue = (minValue + maxValue) / 2; // ~0.0045
                    
                    // Usando uma combinação de distribuições para concentrar valores em torno da média
                    double value;
                    if (random.nextDouble() < 0.7) {
                        // 70% dos valores serão mais próximos da média
                        // Usando a média como base e adicionando/subtraindo um desvio menor
                        double deviation = (maxValue - minValue) * 0.3 * random.nextDouble();
                        value = meanValue + (random.nextBoolean() ? deviation : -deviation);
                    } else {
                        // 30% dos valores serão distribuídos em todo o intervalo
                        value = minValue + (random.nextDouble() * (maxValue - minValue));
                    }
                    
                    // Garantir que o valor está dentro dos limites desejados
                    value = Math.max(minValue, Math.min(maxValue, value));
                    
                    // Converter para BigDecimal com 6 casas decimais
                    BigDecimal randomCoefficient = new BigDecimal(value).setScale(6, BigDecimal.ROUND_HALF_UP);
                    
                    // Selecionar uma instância aleatória já existente
                    Instance randomInstance = instances.get(random.nextInt(instances.size()));
                    
                    createTechnologicalTensor(
                        socialMaterializations.get(i), 
                        socialMaterializations.get(j),
                        randomCoefficient,
                        randomInstance
                    );
                }
            }
        }
        
        // Recriar a constraint no final
        try {
            entityManager.createNativeQuery(
                "ALTER TABLE instance ADD CONSTRAINT chk_council_columns " +
                "CHECK (type != 'COUNCIL' OR (" +
                "total_social_work_of_this_jurisdiction IS NOT NULL AND " +
                "popular_council_associated_with_popular_council IS NOT NULL))"
            ).executeUpdate();
            
            entityManager.createNativeQuery(
                "ALTER TABLE instance ADD CONSTRAINT chk_worker_columns " +
                "CHECK (type != 'WORKER' OR (" +
                "popular_council_associated_with_committee_or_worker IS NOT NULL AND " +
                "id_associated_worker_committee IS NOT NULL AND " +
                "id_associated_worker_residents_association = 0 AND " +  // deve ser exatamente 0
                "estimated_individual_participation_in_social_work IS NOT NULL AND " +
                "hours_at_electronic_point IS NOT NULL))"
            ).executeUpdate();
            
            // Adicionar constraint para worker_effective_limit
            entityManager.createNativeQuery(
                "ALTER TABLE instance ADD CONSTRAINT chk_worker_effective_limit " +
                "CHECK ((type = 'COMMITTEE' AND worker_effective_limit IS NOT NULL) OR " +
                "(type != 'COMMITTEE' AND worker_effective_limit IS NULL))"
            ).executeUpdate();
        } catch (Exception e) {
            System.err.println("Erro ao recriar constraint: " + e.getMessage());
        }
        
        System.out.println("Banco de dados populado com sucesso!");
    }
    
    /**
     * Verifica se o banco de dados já está populado verificando a existência de registros
     * nas principais tabelas.
     * 
     * @return true se o banco já estiver populado, false caso contrário
     */
    private boolean isDatabasePopulated() {
        // Verificar se existem registros em tabelas essenciais
        Long instanceCount = (Long) entityManager.createQuery("SELECT COUNT(i) FROM Instance i").getSingleResult();
        Long sectorCount = (Long) entityManager.createQuery("SELECT COUNT(s) FROM Sector s").getSingleResult();
        Long userCount = (Long) entityManager.createQuery("SELECT COUNT(u) FROM User u").getSingleResult();
        Long socialMaterializationCount = (Long) entityManager.createQuery("SELECT COUNT(sm) FROM SocialMaterialization sm").getSingleResult();
        
        // Se alguma das tabelas principais já tiver registros, consideramos que o banco está populado
        boolean populated = (instanceCount > 0 || sectorCount > 0 || userCount > 0 || socialMaterializationCount > 0);
        
        if (populated) {
            System.out.println("Banco de dados verificado: já contém dados");
            System.out.println("- Instâncias: " + instanceCount);
            System.out.println("- Setores: " + sectorCount);
            System.out.println("- Usuários: " + userCount);
            System.out.println("- Materializações Sociais: " + socialMaterializationCount);
        } else {
            System.out.println("Banco de dados verificado: está vazio, necessário popular");
        }
        
        return populated;
    }
    
    private Instance createInstance(InstanceType type, String name, Integer workerLimit, Sector sector) {
        // Este método deveria chamar a versão mais completa com valores nulos para os parâmetros adicionais
        return createInstance(type, name, workerLimit, sector, null, 
                              type == InstanceType.COMMITTEE || type == InstanceType.COUNCIL ? 
                              new BigDecimal(9000 + random.nextInt(41000)) : null, 
                              null, null, null, null, null, null, null);
    }
    
    private SocialMaterialization createSocialMaterialization(String name, SocialMaterializationType type, Sector sector) {
        SocialMaterialization sm = new SocialMaterialization();
        sm.setName(name);
        sm.setType(type);
        sm.setSector(sector);
        sm.setCreatedAt(LocalDateTime.now());  // Define o timestamp atual
        socialMaterializationRepository.save(sm);
        return sm;
    }
    
    // Atualizar método createUser para criar uma instância WORKER automaticamente para usuários NON_COUNCILLOR
    private User createUser(String username, String name, UserType type, PronounType pronoun, Instance instance) {
        // Validar a relação entre o tipo de usuário e o tipo de instância
        boolean isValid = false;
        
        if (type == UserType.COUNCILLOR && 
            (instance.getType() == InstanceType.COUNCIL || instance.getType() == InstanceType.COMMITTEE)) {
            isValid = true;
        } else if (type == UserType.NON_COUNCILLOR && instance.getType() == InstanceType.WORKER) {
            // Verificar se essa instância WORKER já está associada a outro usuário
            Long existingUserCount = (Long) entityManager.createQuery("SELECT COUNT(u) FROM User u WHERE u.instance.id = :instanceId")
                    .setParameter("instanceId", instance.getId())
                    .getSingleResult();
            if (existingUserCount > 0) {
                System.err.println("Aviso: A instância WORKER com ID " + instance.getId() + 
                                  " já está associada a outro usuário. NON_COUNCILLOR deve ter uma instância WORKER única.");
                return null; // Não criar o usuário
            }
            isValid = true;
        }
        
        if (!isValid) {
            System.err.println("Aviso: Tentativa de criar usuário com tipo incompatível com a instância. " +
                              "Tipo de usuário: " + type + ", Tipo de instância: " + instance.getType() + 
                              ". COUNCILLOR só pode pertencer a COUNCIL/COMMITTEE. NON_COUNCILLOR só pode pertencer a WORKER.");
            return null; // Não criar o usuário
        }
        
        User user = new User();
        user.setUsername(username);
        user.setPassword("securepass" + username.length() + "!"); // Senha única e segura
        user.setName(name);
        user.setType(type);
        user.setPronoun(pronoun);
        user.setInstance(instance);
        user.setCreatedAt(LocalDateTime.now());  // Define o timestamp atual
        userRepository.save(user);
        return user;
    }
    
    // Novo método para criar um usuário NON_COUNCILLOR com nova instância WORKER
    private User createNonCouncillorUser(String username, String name, PronounType pronoun, 
                                        Sector sector, Instance associatedCommittee) {
        // Criar uma nova instância WORKER específica para este usuário
        String workerName = name + "'s Workstation";
        
        // Obter uma instância de comitê para associação
        if (associatedCommittee == null) {
            List<Instance> committees = (List<Instance>) instanceRepository.findByType(InstanceType.COMMITTEE);
            if (!committees.isEmpty()) {
                associatedCommittee = committees.get(random.nextInt(committees.size()));
            } else {
                System.err.println("Erro: Nenhum comitê encontrado para associar à nova instância WORKER.");
                return null;
            }
        }
        
        // Criar a instância WORKER
        Instance workerInstance = createInstance(
            InstanceType.WORKER, 
            workerName, 
            null,  // worker_effective_limit deve ser null para WORKER
            sector,
            associatedCommittee.getId(),  // popular_council_associated_with_committee_or_worker 
            null,  // totalSocialWork (null para WORKER)
            null,  // socialMaterializationId
            null,  // producedQuantity
            null,  // targetQuantity
            associatedCommittee.getId(),  // id_associated_worker_committee (mesmo ID do conselho associado)
            0,     // id_associated_worker_residents_association (deve ser 0)
            new BigDecimal(0.0000000001 + (0.0000004999 * random.nextDouble()))
                .setScale(15, BigDecimal.ROUND_HALF_UP),  // estimated_individual_participation
            new BigDecimal(5 + random.nextInt(46))  // hours_at_electronic_point
        );
        
        // Criar o usuário e associá-lo à nova instância
        return createUser(username, name, UserType.NON_COUNCILLOR, pronoun, workerInstance);
    }
    
    private WorkersProposal createWorkerProposal(Instance instance, Integer workerLimit, 
                                               BigDecimal workerHours, BigDecimal productionTime, 
                                               Boolean nightShift, Integer weeklyScale) {
        WorkersProposal.WorkersProposalId proposalId = new WorkersProposal.WorkersProposalId();
        proposalId.setInstanceId(instance.getId());
        
        WorkersProposal proposal = new WorkersProposal();
        proposal.setId(proposalId);
        proposal.setInstance(instance);
        proposal.setWorkerLimit(workerLimit);
        proposal.setWorkerHours(workerHours);
        proposal.setProductionTime(productionTime);
        proposal.setNightShift(nightShift);
        proposal.setWeeklyScale(weeklyScale);
        proposal.setCreatedAt(LocalDateTime.now());  // Define o timestamp atual
        workersProposalRepository.save(proposal);
        return proposal;
    }
    
    private DemandStock createDemandStock(SocialMaterialization socialMaterialization, BigDecimal demand, Instance instance) {
        DemandStock demandStock = new DemandStock();
        demandStock.setSocialMaterialization(socialMaterialization);
        demandStock.setInstance(instance);
        demandStock.setDemand(demand);
        
        // Adicionar um valor para o campo stock que não pode ser nulo
        BigDecimal stockValue = new BigDecimal(random.nextInt(5000) + 500);
        demandStock.setStock(stockValue);
        
        demandStock.setCreatedAt(LocalDateTime.now());  // Define o timestamp atual
        demandStockRepository.save(demandStock);
        return demandStock;
    }
    
    private DemandVector createDemandVector(SocialMaterialization socialMaterialization, BigDecimal demand, Instance instance) {
        DemandVector demandVector = new DemandVector();
        demandVector.setSocialMaterialization(socialMaterialization);
        demandVector.setInstance(instance);
        demandVector.setDemand(demand); // Define o valor da demanda passado como parâmetro
        demandVector.setCreatedAt(LocalDateTime.now());  // Define o timestamp atual
        demandVectorRepository.save(demandVector);
        return demandVector;
    }

    private OptimizationInputsResults createOptimizationInputsResults(
        Instance instance,
        SocialMaterialization socialMaterialization,
        Integer workerLimit,
        BigDecimal workerHours,
        BigDecimal productionTime,
        Boolean nightShift,
        Integer weeklyScale,
        Integer plannedWeeklyScale,
        BigDecimal productionGoal,
        BigDecimal totalHours,
        Integer workersNeeded,
        Integer factoriesNeeded,
        Integer totalShifts,
        BigDecimal minimumProductionTime,
        Duration totalEmploymentPeriod,
        BigDecimal plannedFinalDemand) {
        
        OptimizationInputsResults optimizationInputsResults = new OptimizationInputsResults();
        OptimizationInputsResults.OptimizationInputsResultsId id = new OptimizationInputsResults.OptimizationInputsResultsId();
        id.setInstanceId(instance.getId());
        id.setSocialMaterializationId(socialMaterialization.getId());
        optimizationInputsResults.setId(id);
        
        optimizationInputsResults.setInstance(instance);
        optimizationInputsResults.setSocialMaterialization(socialMaterialization);
        optimizationInputsResults.setWorkerLimit(workerLimit);
        optimizationInputsResults.setWorkerHours(workerHours);
        optimizationInputsResults.setProductionTime(productionTime);
        optimizationInputsResults.setNightShift(nightShift);
        optimizationInputsResults.setWeeklyScale(weeklyScale);
        optimizationInputsResults.setPlannedWeeklyScale(plannedWeeklyScale);
        optimizationInputsResults.setProductionGoal(productionGoal);
        optimizationInputsResults.setTotalHours(totalHours);
        optimizationInputsResults.setWorkersNeeded(workersNeeded);
        optimizationInputsResults.setFactoriesNeeded(factoriesNeeded);
        optimizationInputsResults.setTotalShifts(totalShifts);
        optimizationInputsResults.setMinimumProductionTime(minimumProductionTime);
        
        // Armazenar total_employment_period como segundos
        long totalSeconds = totalEmploymentPeriod.getSeconds();
        optimizationInputsResults.setTotalEmploymentPeriodSeconds(totalSeconds);
        
        optimizationInputsResults.setPlannedFinalDemand(plannedFinalDemand);
        optimizationInputsResults.setCreatedAt(LocalDateTime.now());  // Define o timestamp atual
        optimizationInputsResultsRepository.save(optimizationInputsResults);
        return optimizationInputsResults;
    }
    
    private TechnologicalTensor createTechnologicalTensor(
        SocialMaterialization inputSocialMaterialization,
        SocialMaterialization outputSocialMaterialization,
        BigDecimal coefficient,
        Instance instance) {  // Adicionar parâmetro de instância
    
    TechnologicalTensor technologicalTensor = new TechnologicalTensor();
    
    // Criar a chave composta
    TechnologicalTensor.TechnologicalTensorId id = new TechnologicalTensor.TechnologicalTensorId();
    id.setInputSocialMaterializationId(inputSocialMaterialization.getId());
    id.setOutputSocialMaterializationId(outputSocialMaterialization.getId());
    technologicalTensor.setId(id);
    
    technologicalTensor.setInputSocialMaterialization(inputSocialMaterialization);
    technologicalTensor.setOutputSocialMaterialization(outputSocialMaterialization);
    technologicalTensor.setInstance(instance);  // Definir a instância
    
    // Garantir que o coeficiente tenha 6 casas decimais
    BigDecimal adjustedCoefficient = coefficient.setScale(6, BigDecimal.ROUND_HALF_UP);
    technologicalTensor.setTechnicalCoefficientElementValue(adjustedCoefficient);
    
    technologicalTensor.setCreatedAt(LocalDateTime.now());  // Define o timestamp atual
    technologicalTensorRepository.save(technologicalTensor);
    return technologicalTensor;
}

    private Instance createInstance(InstanceType type, String name, Integer workerLimit, Sector sector, 
                                   Integer associatedCouncilId, BigDecimal totalSocialWork,
                                   Integer socialMaterializationId, BigDecimal producedQuantity, BigDecimal targetQuantity) {
        return createInstance(type, name, workerLimit, sector, associatedCouncilId, totalSocialWork,
                            socialMaterializationId, producedQuantity, targetQuantity, null, null, null, null);
    }
    
    private Instance createInstance(InstanceType type, String name, Integer workerLimit, Sector sector, 
                                   Integer associatedCouncilId, BigDecimal totalSocialWork,
                                   Integer socialMaterializationId, BigDecimal producedQuantity, BigDecimal targetQuantity,
                                   Integer associatedWorkerCommitteeId, Integer associatedResidentsAssociationId,
                                   BigDecimal estimatedParticipation, BigDecimal hoursAtElectronicPoint) {
        Instance instance = new Instance();
        instance.setType(type);
        
        // worker_effective_limit apenas para COMMITTEE, null para outros tipos
        if (type == InstanceType.COMMITTEE) {
            instance.setWorkerEffectiveLimit(workerLimit);
        } else {
            instance.setWorkerEffectiveLimit(null);
        }
                
        // Campos comuns para todos os tipos
        instance.setCreatedAt(LocalDateTime.now());
        
        // Campos específicos por tipo
        if (type == InstanceType.COMMITTEE) {
            instance.setCommitteeName(name);
            if (associatedCouncilId != null) {
                Instance associatedCouncil = instanceRepository.findById(associatedCouncilId).orElse(null);
                instance.setPopularCouncilAssociatedWithCommitteeOrWorker(associatedCouncil);
            }
            instance.setTotalSocialWorkOfThisJurisdiction(totalSocialWork != null ? totalSocialWork.intValue() : null);
            if (socialMaterializationId != null) {
                SocialMaterialization socialMaterialization = socialMaterializationRepository.findById(socialMaterializationId).orElse(null);
                instance.setSocialMaterialization(socialMaterialization);
            }
            instance.setProducedQuantity(producedQuantity);
            instance.setTargetQuantity(targetQuantity);
        } else if (type == InstanceType.COUNCIL) {
            if (name != null) {
                instance.setCommitteeName(name);
            }
            instance.setTotalSocialWorkOfThisJurisdiction(totalSocialWork != null ? totalSocialWork.intValue() : null);
            if (associatedCouncilId != null) {
                Instance associatedCouncil = instanceRepository.findById(associatedCouncilId).orElse(null);
                instance.setPopularCouncilAssociatedWithPopularCouncil(associatedCouncil);
            }
        } else if (type == InstanceType.WORKER) {
            if (associatedCouncilId != null) {
                Instance associatedCouncil = instanceRepository.findById(associatedCouncilId).orElse(null);
                instance.setPopularCouncilAssociatedWithCommitteeOrWorker(associatedCouncil);
            }
            if (associatedWorkerCommitteeId != null) {
                Instance associatedWorkerCommittee = instanceRepository.findById(associatedWorkerCommitteeId).orElse(null);
                instance.setAssociatedWorkerCommittee(associatedWorkerCommittee);
            }
            
            // Definir id_associated_worker_residents_association como 0, não null
            // Precisamos obter ou criar uma Instance com ID 0
            Instance zeroInstance = instanceRepository.findById(0).orElse(null);
            instance.setAssociatedWorkerResidentsAssociation(zeroInstance);
            
            instance.setEstimatedIndividualParticipationInSocialWork(estimatedParticipation);
            instance.setHoursAtElectronicPoint(hoursAtElectronicPoint);
        }
        
        instanceRepository.save(instance);
        return instance;
    }
}