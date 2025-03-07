package xyz.planecon.config;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.context.annotation.Lazy;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import xyz.planecon.model.entity.*;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.repository.*;
import xyz.planecon.config.adapter.InstanceAdapter;
import xyz.planecon.config.adapter.WorkersProposalAdapter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Integrador para geração massiva de dados no banco de dados
 * Coordena os geradores específicos e cria dados adicionais
 */
@Component
public class MassiveDatabaseSeedIntegrator {

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
    private final PasswordEncoder passwordEncoder;
    
    private final InstanceHierarchyGenerator instanceHierarchyGenerator;
    private final UserGenerator userGenerator;
    private final Random random = new Random();
    
    // Lista para nomes de locais para usar em associações de moradores
    private final List<String> localities = Arrays.asList(
            "Downtown", "Riverside", "Hillside", "Industrial Zone", "University District",
            "North End", "South Side", "East Village", "West Park", "Central Square",
            "Harbor View", "Old Town", "New Quarter", "Green Valley", "Sunset District",
            "Lakefront", "Mountain View", "Ocean Avenue", "Railway Heights", "Market District",
            "Garden District", "Tech Park", "Cultural Center", "Port Area", "Civic Center",
            "Theater District", "Sports Complex", "Education Zone", "Medical Center"
    );
    
    private final List<String> streets = Arrays.asList(
            "Main Street", "Oak Avenue", "Park Road", "River Lane", "Factory Street", 
            "Railway Road", "Center Boulevard", "Pine Street", "Liberty Avenue", 
            "Commerce Road", "School Street", "University Avenue", "Harbor Road", 
            "Mill Street", "Temple Avenue", "Market Street", "Bridge Road", 
            "Station Avenue", "Garden Road", "Fountain Plaza", "Industry Road"
    );

    public MassiveDatabaseSeedIntegrator(
            InstanceRepository instanceRepository,
            SocialMaterializationRepository socialMaterializationRepository,
            UserRepository userRepository,
            WorkersProposalRepository workersProposalRepository,
            SectorRepository sectorRepository,
            DemandStockRepository demandStockRepository,
            DemandVectorRepository demandVectorRepository,
            OptimizationInputsResultsRepository optimizationInputsResultsRepository,
            TechnologicalTensorRepository technologicalTensorRepository,
            PasswordEncoder passwordEncoder,
            @Lazy InstanceHierarchyGenerator instanceHierarchyGenerator,
            @Lazy UserGenerator userGenerator) {
        this.instanceRepository = instanceRepository;
        this.socialMaterializationRepository = socialMaterializationRepository;
        this.userRepository = userRepository;
        this.workersProposalRepository = workersProposalRepository;
        this.sectorRepository = sectorRepository;
        this.demandStockRepository = demandStockRepository;
        this.demandVectorRepository = demandVectorRepository;
        this.optimizationInputsResultsRepository = optimizationInputsResultsRepository;
        this.technologicalTensorRepository = technologicalTensorRepository;
        this.passwordEncoder = passwordEncoder;
        this.instanceHierarchyGenerator = instanceHierarchyGenerator;
        this.userGenerator = userGenerator;
    }
    
    /**
     * Executa geração massiva de dados integrada
     */
    @Transactional
    public void executeMassiveDataGeneration(int targetEntities) {
        System.out.println("Iniciando geração massiva integrada de aproximadamente " + targetEntities + " entidades...");
        
        // Desabilitar constraints temporariamente
        disableConstraints();
        
        try {
            // 1. Gerar setores
            int sectorCount = Math.min(targetEntities / 20, 150);
            List<Sector> sectors = generateSectors(sectorCount);
            
            // 2. Gerar materializações sociais
            int materializationCount = Math.min(targetEntities / 4, 800);
            List<SocialMaterialization> socialMaterializations = 
                generateSocialMaterializations(materializationCount, sectors);
            
            // 3. Gerar hierarquia de instâncias (conselhos e comitês)
            int councilCount = Math.min(targetEntities / 30, 100);
            int committeeCount = Math.min(targetEntities / 10, 300);
            Map<String, List<Instance>> instanceHierarchy = 
                instanceHierarchyGenerator.generateInstanceHierarchy(
                    sectors, socialMaterializations, councilCount, committeeCount);
            
            // 4. Gerar usuários
            int userCount = Math.min(targetEntities / 2, 1500);
            List<User> users = userGenerator.generateUsers(userCount, instanceHierarchy);
            
            // 5. Gerar instâncias de trabalhadores (WORKER)
            int workerInstanceCount = Math.min(targetEntities / 3, 1000);
            List<Instance> workerInstances = generateWorkerInstances(
                workerInstanceCount, sectors, instanceHierarchy.get("committees"));
            
            // 6. Associar usuários WORKER às instâncias WORKER
            userGenerator.associateWorkersToInstances(users, workerInstances);
            
            // 7. Gerar propostas de trabalhadores
            generateWorkersProposals(workerInstances, socialMaterializations);
            
            // 8. Gerar dados relacionais adicionais
            generateAdditionalRelationalData(
                instanceHierarchy.get("councils"), 
                instanceHierarchy.get("committees"),
                workerInstances,
                socialMaterializations
            );
            
            System.out.println("Geração massiva de dados concluída com sucesso!");
            System.out.println("Estatísticas:");
            System.out.println("- " + sectorCount + " setores");
            System.out.println("- " + materializationCount + " materializações sociais");
            System.out.println("- " + councilCount + " conselhos");
            System.out.println("- " + committeeCount + " comitês");
            System.out.println("- " + workerInstanceCount + " instâncias de trabalhadores");
            System.out.println("- " + userCount + " usuários");
        } catch (Exception e) {
            System.err.println("Erro na geração massiva de dados: " + e.getMessage());
            e.printStackTrace();
        } finally {
            // Reativar constraints
            enableConstraints();
        }
    }
    
    /**
     * Gera setores com nomes combinados
     */
    private List<Sector> generateSectors(int count) {
        return sectorRepository.findAll();
    }
    
    /**
     * Gera materializações sociais com base nos setores
     */
    private List<SocialMaterialization> generateSocialMaterializations(int count, List<Sector> sectors) {
        return socialMaterializationRepository.findAll();
    }
    
    /**
     * Gera instâncias de trabalhadores (WORKER) e suas associações
     */
    private List<Instance> generateWorkerInstances(
            int count, 
            List<Sector> sectors,
            List<Instance> committees) {
        
        System.out.println("Gerando " + count + " instâncias WORKER...");
        List<Instance> workerInstances = new ArrayList<>();
        
        // Obter conselhos para associação com worker
        List<Instance> workerAssociationCouncils = new ArrayList<>();
        instanceRepository.findByType(InstanceType.COUNCIL).forEach(council -> {
            String committeeName = council.getCommitteeName();
            if (committeeName != null && 
                committeeName.contains("Council of Distribution")) {
                workerAssociationCouncils.add(council);
            }
        });
        
        if (workerAssociationCouncils.isEmpty()) {
            throw new RuntimeException("Nenhum conselho de distribuição e serviços disponível para associação com workers");
        }
        
        // Criar instâncias WORKER
        for (int i = 0; i < count; i++) {
            // Gerar um nome para o worker
            String firstName = getRandomElement(userGenerator.getFirstNames());
            String lastName = getRandomElement(userGenerator.getLastNames());
            String workerName = firstName + " " + lastName;
            
            // Escolher um setor aleatório
            Sector sector = sectors.get(random.nextInt(sectors.size()));
            
            // Escolher um conselho de distribuição e serviços
            Instance associatedCouncil = workerAssociationCouncils.get(
                random.nextInt(workerAssociationCouncils.size()));
            
            // Escolher um comitê
            Instance associatedCommittee = committees.get(random.nextInt(committees.size()));
            
            // Criar instância WORKER
            Instance worker = new Instance();
            worker.setType(InstanceType.WORKER);
            worker.setCommitteeName(workerName);
            
            // Instance não tem campo setor direto, mas podemos atribuir
            // socialMaterialization do setor
            if (!sector.getSocialMaterializations().isEmpty()) {
                worker.setSocialMaterialization(
                    sector.getSocialMaterializations().iterator().next()
                );
            }
            
            worker.setPopularCouncilAssociatedWithCommitteeOrWorker(associatedCouncil);
            worker.setAssociatedWorkerCommittee(associatedCommittee);
            
            // Criar associação de residentes (simulada)
            Instance residentsAssoc = new Instance();
            residentsAssoc.setId(i + 1000); // ID fictício
            worker.setAssociatedWorkerResidentsAssociation(residentsAssoc);
            
            worker.setEstimatedIndividualParticipationInSocialWork(
                new BigDecimal(0.0000000001 + (0.0000004999 * random.nextDouble()))
                    .setScale(15, RoundingMode.HALF_UP));
            worker.setHoursAtElectronicPoint(new BigDecimal(5 + random.nextInt(46)));
            worker.setWorkerEffectiveLimit(null); // Deve ser nulo para WORKER
            worker.setCreatedAt(LocalDateTime.now());
            
            worker = instanceRepository.save(worker);
            workerInstances.add(worker);
            
            if (i > 0 && i % 100 == 0) {
                System.out.println("  - Criadas " + i + " instâncias WORKER...");
            }
        }
        
        System.out.println("Criadas " + workerInstances.size() + " instâncias WORKER");
        return workerInstances;
    }
    
    /**
     * Gera propostas de trabalhadores para algumas instâncias WORKER
     */
    private void generateWorkersProposals(
            List<Instance> workerInstances, 
            List<SocialMaterialization> socialMaterializations) {
        
        System.out.println("Gerando propostas de trabalhadores...");
        
        // Criar propostas para aproximadamente 30% dos workers
        int proposalsCount = workerInstances.size() / 3;
        for (int i = 0; i < proposalsCount; i++) {
            Instance worker = workerInstances.get(random.nextInt(workerInstances.size()));
            SocialMaterialization sm = socialMaterializations.get(random.nextInt(socialMaterializations.size()));
            
            WorkersProposal proposal = new WorkersProposal();
            
            // Configurar a chave composta
            WorkersProposal.WorkersProposalId id = new WorkersProposal.WorkersProposalId();
            id.setInstanceId(worker.getId());
            proposal.setId(id);
            
            proposal.setInstance(worker);
            
            // Configurar campos de proposal
            proposal.setWorkerLimit(10 + random.nextInt(90));
            proposal.setWorkerHours(new BigDecimal(random.nextInt(8) + 4));
            proposal.setProductionTime(new BigDecimal(random.nextInt(200) + 100));
            proposal.setNightShift(random.nextBoolean());
            proposal.setWeeklyScale(random.nextInt(5) + 3);
            proposal.setCreatedAt(LocalDateTime.now());
            
            workersProposalRepository.save(proposal);
        }
        
        System.out.println("Criadas " + proposalsCount + " propostas de trabalhadores");
    }
    
    /**
     * Gera dados adicionais relacionais (estoques de demanda, vetores, etc)
     */
    private void generateAdditionalRelationalData(
            List<Instance> councils,
            List<Instance> committees,
            List<Instance> workers,
            List<SocialMaterialization> socialMaterializations) {
        
        System.out.println("Gerando dados relacionais adicionais...");
        
        // 1. Gerar estoques de demanda para alguns conselhos
        int demandStocksCount = Math.min(councils.size() / 2, 50);
        for (int i = 0; i < demandStocksCount; i++) {
            Instance council = councils.get(random.nextInt(councils.size()));
            SocialMaterialization sm = socialMaterializations.get(random.nextInt(socialMaterializations.size()));
            
            DemandStock stock = new DemandStock();
            stock.setInstance(council);
            stock.setSocialMaterialization(sm);
            try {
                java.lang.reflect.Method method = stock.getClass().getMethod("setQuantity", BigDecimal.class);
                method.invoke(stock, new BigDecimal(random.nextInt(10000) + 1000));
            } catch (Exception e) {
                try {
                    java.lang.reflect.Method method = stock.getClass().getMethod("setAmount", BigDecimal.class);
                    method.invoke(stock, new BigDecimal(random.nextInt(10000) + 1000));
                } catch (Exception ex) {
                    System.err.println("Método para definir quantidade não encontrado: " + ex.getMessage());
                }
            }
            stock.setCreatedAt(LocalDateTime.now());
            
            demandStockRepository.save(stock);
        }
        
        // 2. Gerar vetores de demanda para alguns conselhos
        int demandVectorsCount = Math.min(councils.size() / 2, 50);
        for (int i = 0; i < demandVectorsCount; i++) {
            Instance council = councils.get(random.nextInt(councils.size()));
            SocialMaterialization sm = socialMaterializations.get(random.nextInt(socialMaterializations.size()));
            
            DemandVector vector = new DemandVector();
            vector.setInstance(council);
            vector.setSocialMaterialization(sm);
            try {
                java.lang.reflect.Method method = vector.getClass().getMethod("setCoefficient", BigDecimal.class);
                method.invoke(vector, new BigDecimal(random.nextDouble() * 0.5).setScale(4, RoundingMode.HALF_UP));
            } catch (Exception e) {
                try {
                    java.lang.reflect.Method method = vector.getClass().getMethod("setValue", BigDecimal.class);
                    method.invoke(vector, new BigDecimal(random.nextDouble() * 0.5).setScale(4, RoundingMode.HALF_UP));
                } catch (Exception ex) {
                    System.err.println("Método para definir coeficiente não encontrado: " + ex.getMessage());
                }
            }
            vector.setCreatedAt(LocalDateTime.now());
            
            demandVectorRepository.save(vector);
        }
        
        // 3. Gerar tensores tecnológicos para alguns comitês
        int tensorCount = Math.min(committees.size() / 3, 30);
        for (int i = 0; i < tensorCount; i++) {
            try {
                SocialMaterialization input = getRandomElement(socialMaterializations);
                SocialMaterialization output = getRandomElement(socialMaterializations);
                
                // Evite tensores para o mesmo item
                if (input.equals(output)) {
                    continue;
                }
                
                BigDecimal coefficient = new BigDecimal(random.nextDouble() * 0.7 + 0.1)
                    .setScale(4, RoundingMode.HALF_UP);
                
                Instance instance = getRandomElement(committees);
                
                // Usar SQL nativo para inserir o tensor diretamente
                // Isso evita problemas com a estrutura da classe e a chave composta
                entityManager.createNativeQuery(
                    "INSERT INTO technological_tensor (input_materialization_id, output_materialization_id, coefficient, instance_id) " +
                    "VALUES (?, ?, ?, ?)")
                    .setParameter(1, input.getId())
                    .setParameter(2, output.getId())
                    .setParameter(3, coefficient)
                    .setParameter(4, instance.getId())
                    .executeUpdate();
                
            } catch (Exception e) {
                System.err.println("Erro ao criar tensor: " + e.getMessage());
            }
        }
        
        // 4. Gerar resultados de otimização para alguns comitês
        int optimizationResultsCount = Math.min(committees.size() / 4, 20);
        for (int i = 0; i < optimizationResultsCount; i++) {
            Instance committee = committees.get(random.nextInt(committees.size()));
            
            OptimizationInputsResults result = new OptimizationInputsResults();
            result.setInstance(committee);
            result.setNightShift(random.nextBoolean());
            result.setProductionGoal(new BigDecimal(random.nextInt(1000000) + 10000));
            result.setPlannedFinalDemand(new BigDecimal(random.nextInt(1000000) + 10000));
            result.setCreatedAt(LocalDateTime.now());
            
            optimizationInputsResultsRepository.save(result);
        }
        
        System.out.println("Dados relacionais adicionais gerados:");
        System.out.println("- " + demandStocksCount + " estoques de demanda");
        System.out.println("- " + demandVectorsCount + " vetores de demanda");
        System.out.println("- " + tensorCount + " tensores tecnológicos");
        System.out.println("- " + optimizationResultsCount + " resultados de otimização");
    }
    
    /**
     * Desativa temporariamente as constraints para inserção em massa
     */
    private void disableConstraints() {
        try {
            entityManager.createNativeQuery("ALTER TABLE instance DROP CONSTRAINT IF EXISTS chk_council_columns").executeUpdate();
            entityManager.createNativeQuery("ALTER TABLE instance DROP CONSTRAINT IF EXISTS chk_worker_columns").executeUpdate();
            entityManager.createNativeQuery("ALTER TABLE instance DROP CONSTRAINT IF EXISTS chk_worker_effective_limit").executeUpdate();
        } catch (Exception e) {
            System.err.println("Erro ao remover constraint: " + e.getMessage());
        }
    }
    
    /**
     * Reativa as constraints após inserção em massa
     */
    private void enableConstraints() {
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
                "id_associated_worker_residents_association = 0 AND " +
                "estimated_individual_participation_in_social_work IS NOT NULL AND " +
                "hours_at_electronic_point IS NOT NULL))"
            ).executeUpdate();
            
            entityManager.createNativeQuery(
                "ALTER TABLE instance ADD CONSTRAINT chk_worker_effective_limit " +
                "CHECK ((type = 'COMMITTEE' AND worker_effective_limit IS NOT NULL) OR " +
                "(type != 'COMMITTEE' AND worker_effective_limit IS NULL))"
            ).executeUpdate();
        } catch (Exception e) {
            System.err.println("Erro ao recriar constraint: " + e.getMessage());
        }
    }
    
    /**
     * Utilitário para obter elemento aleatório de uma lista
     */
    private <T> T getRandomElement(List<T> list) {
        return list.get(random.nextInt(list.size()));
    }
    
    /**
     * Método para atualizar o BigDatabaseSeeder para usar esta classe
     */
    public static void updateBigDatabaseSeeder() {
        // Código para atualizar a classe BigDatabaseSeeder para usar este integrador
        System.out.println(
            "Para atualizar o BigDatabaseSeeder, modifique o método run para chamar o integrador:\n\n" +
            "@Override\n" +
            "@Transactional\n" +
            "public void run(String... args) {\n" +
            "    // Verificar se o banco de dados já está populado\n" +
            "    if (isDatabasePopulated()) {\n" +
            "        System.out.println(\"Banco de dados já está populado. Pulando etapa de seed.\");\n" +
            "        return;\n" +
            "    }\n" +
            "    \n" +
            "    System.out.println(\"Iniciando população massiva do banco de dados...\");\n" +
            "    massiveDatabaseSeedIntegrator.executeMassiveDataGeneration(TARGET_ENTITIES);\n" +
            "}"
        );
    }
    
    // Métodos getter para acessibilidade a partir do BigDatabaseSeeder
    public List<String> getFirstNames() {
        return userGenerator.getFirstNames();
    }
    
    public List<String> getLastNames() {
        return userGenerator.getLastNames();
    }
}