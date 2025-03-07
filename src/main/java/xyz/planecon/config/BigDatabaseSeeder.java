package xyz.planecon.config;

import jakarta.transaction.Transactional;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Lazy;
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
import java.util.*;
import java.time.Duration;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Component
public class BigDatabaseSeeder implements CommandLineRunner {

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
    private final MassiveDatabaseSeedIntegrator massiveDatabaseSeedIntegrator;
    
    private final Random random = new Random();
    private final int TARGET_ENTITIES = 3000;
    
    // Listas para geradores de nomes
    private final List<String> sectorPrefixes = Arrays.asList(
            "Advanced", "Sustainable", "Regional", "Public", "Industrial", "Digital", 
            "Traditional", "Modern", "Shared", "Collective", "Urban", "Rural",
            "Clean", "Renewable", "Critical", "Essential", "Cultural", "Scientific",
            "Technological", "Agricultural", "Medical", "Educational", "Logistical"
    );
    
    private final List<String> sectorRoots = Arrays.asList(
            "Manufacturing", "Agriculture", "Education", "Healthcare", "Energy",
            "Transportation", "Construction", "Communication", "Textiles", "Food", 
            "Housing", "Recreation", "Research", "Service", "Maintenance", "Water",
            "Electronics", "Metallurgy", "Forestry", "Mining", "Fishery", "Recycling",
            "Media", "Art", "Software", "Chemistry", "Crafts", "Design"
    );
    
    private final List<String> sectorSuffixes = Arrays.asList(
            "Systems", "Production", "Services", "Distribution", "Planning", 
            "Development", "Management", "Coordination", "Network", "Infrastructure",
            "Resources", "Processing", "Maintenance", "Supply", "Facilities",
            "Operations", "Programs", "Initiatives", "Projects", "Collectives"
    );
    
    private final List<String> productPrefixes = Arrays.asList(
            "Essential", "Standard", "Advanced", "Basic", "Sustainable", "Ergonomic", 
            "Universal", "Modern", "Reinforced", "Eco-friendly", "Durable", "Lightweight",
            "High-Quality", "Multi-purpose", "Specialized", "Community", "Modular",
            "Energy-efficient", "Recyclable", "Repairable", "Low-impact", "Biodegradable"
    );
    
    private final List<String> productTypes = Arrays.asList(
            "Tools", "Furniture", "Clothing", "Food", "Medicine", "Electronics",
            "Machines", "Vehicles", "Building Materials", "Containers", "Textiles",
            "Books", "Software", "Art Supplies", "Musical Instruments", "Sports Equipment",
            "Kitchen Appliances", "Garden Supplies", "Medical Equipment", "Communication Devices",
            "Energy Systems", "Water Systems", "Hygiene Products", "Educational Materials"
    );
    
    private final List<String> serviceTypes = Arrays.asList(
            "Healthcare", "Education", "Transportation", "Communication", "Child Care",
            "Elder Care", "Maintenance", "Repair", "Cultural Programs", "Recreation",
            "Research", "Planning", "Design", "Food Service", "Cleaning", "Security",
            "Software Development", "Media Production", "Energy Distribution", "Water Management",
            "Waste Management", "Agricultural Support", "Manufacturing Support", "Community Organizing"
    );
    
    private final List<String> serviceQualifiers = Arrays.asList(
            "Services", "Support", "Programs", "Systems", "Network", "Coordination",
            "Management", "Planning", "Facilitation", "Operations", "Assistance",
            "Development", "Resources", "Infrastructure", "Initiatives", "Projects"
    );

    public BigDatabaseSeeder(
            InstanceRepository instanceRepository,
            SocialMaterializationRepository socialMaterializationRepository,
            UserRepository userRepository,
            WorkersProposalRepository workersProposalRepository,
            SectorRepository sectorRepository,
            DemandStockRepository demandStockRepository,
            DemandVectorRepository demandVectorRepository,
            OptimizationInputsResultsRepository optimizationInputsResultsRepository,
            TechnologicalTensorRepository technologicalTensorRepository,
            @Lazy MassiveDatabaseSeedIntegrator massiveDatabaseSeedIntegrator
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
        this.massiveDatabaseSeedIntegrator = massiveDatabaseSeedIntegrator;
    }

    @Override
    @Transactional
    public void run(String... args) {
        // Verificar se o banco de dados já está populado
        if (isDatabasePopulated()) {
            System.out.println("Banco de dados já está populado. Pulando etapa de seed.");
            return;
        }
        
        System.out.println("Iniciando população massiva do banco de dados...");
        massiveDatabaseSeedIntegrator.executeMassiveDataGeneration(TARGET_ENTITIES);
    }
    
    /**
     * Gera setores com nomes combinados
     */
    private List<Sector> generateSectors(int count) {
        System.out.println("Gerando " + count + " setores...");
        List<Sector> sectors = new ArrayList<>();
        Set<String> usedNames = new HashSet<>();
        
        for (int i = 0; i < count; i++) {
            String name;
            int attempts = 0;
            
            // Gerar nomes únicos para setores
            do {
                if (random.nextBoolean()) {
                    // Nome de 2 partes: prefix + root ou root + suffix
                    if (random.nextBoolean()) {
                        name = sectorPrefixes.get(random.nextInt(sectorPrefixes.size())) + " " +
                               sectorRoots.get(random.nextInt(sectorRoots.size()));
                    } else {
                        name = sectorRoots.get(random.nextInt(sectorRoots.size())) + " " +
                               sectorSuffixes.get(random.nextInt(sectorSuffixes.size()));
                    }
                } else {
                    // Nome de 3 partes: prefix + root + suffix
                    name = sectorPrefixes.get(random.nextInt(sectorPrefixes.size())) + " " +
                           sectorRoots.get(random.nextInt(sectorRoots.size())) + " " +
                           sectorSuffixes.get(random.nextInt(sectorSuffixes.size()));
                }
                attempts++;
            } while (usedNames.contains(name) && attempts < 50);
            
            if (attempts >= 50) {
                name = "Sector-" + UUID.randomUUID().toString().substring(0, 8);
            }
            
            usedNames.add(name);
            Sector sector = new Sector();
            sector.setName(name);
            sector.setCreatedAt(LocalDateTime.now());
            sector = sectorRepository.save(sector);
            sectors.add(sector);
            
            if (i > 0 && i % 20 == 0) {
                System.out.println("  - Criados " + i + " setores...");
            }
        }
        
        return sectors;
    }
    
    /**
     * Gera materializações sociais (produtos e serviços)
     */
    private List<SocialMaterialization> generateSocialMaterializations(int count, List<Sector> sectors) {
        System.out.println("Gerando " + count + " materializações sociais...");
        List<SocialMaterialization> materializations = new ArrayList<>();
        Set<String> usedNames = new HashSet<>();
        
        for (int i = 0; i < count; i++) {
            SocialMaterializationType type = random.nextBoolean() ? 
                SocialMaterializationType.PRODUCT : SocialMaterializationType.SERVICE;
                
            String name;
            int attempts = 0;
            
            // Gerar nomes únicos para materializações
            do {
                if (type == SocialMaterializationType.PRODUCT) {
                    name = productPrefixes.get(random.nextInt(productPrefixes.size())) + " " +
                           productTypes.get(random.nextInt(productTypes.size()));
                } else {
                    name = serviceTypes.get(random.nextInt(serviceTypes.size())) + " " +
                           serviceQualifiers.get(random.nextInt(serviceQualifiers.size()));
                }
                attempts++;
            } while (usedNames.contains(name) && attempts < 50);
            
            if (attempts >= 50) {
                name = (type == SocialMaterializationType.PRODUCT ? "Product-" : "Service-") +
                      UUID.randomUUID().toString().substring(0, 8);
            }
            
            usedNames.add(name);
            Sector sector = sectors.get(random.nextInt(sectors.size()));
            
            SocialMaterialization sm = new SocialMaterialization();
            sm.setName(name);
            sm.setType(type);
            sm.setSector(sector);
            sm.setCreatedAt(LocalDateTime.now());
            sm = socialMaterializationRepository.save(sm);
            materializations.add(sm);
            
            if (i > 0 && i % 50 == 0) {
                System.out.println("  - Criadas " + i + " materializações sociais...");
            }
        }
        
        return materializations;
    }
    
    /**
     * Desativa as constraints temporariamente para facilitar a inserção em massa
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
     * Reativa as constraints após a inserção em massa
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
     * Verifica se o banco de dados já está populado
     */
    private boolean isDatabasePopulated() {
        Long instanceCount = (Long) entityManager.createQuery("SELECT COUNT(i) FROM Instance i").getSingleResult();
        Long sectorCount = (Long) entityManager.createQuery("SELECT COUNT(s) FROM Sector s").getSingleResult();
        Long userCount = (Long) entityManager.createQuery("SELECT COUNT(u) FROM User u").getSingleResult();
        Long socialMaterializationCount = (Long) entityManager.createQuery("SELECT COUNT(sm) FROM SocialMaterialization sm").getSingleResult();
        
        boolean populated = (instanceCount > 500 || sectorCount > 50 || userCount > 500 || socialMaterializationCount > 200);
        
        if (populated) {
            System.out.println("Banco de dados verificado: já contém dados significativos");
            System.out.println("- Instâncias: " + instanceCount);
            System.out.println("- Setores: " + sectorCount);
            System.out.println("- Usuários: " + userCount);
            System.out.println("- Materializações Sociais: " + socialMaterializationCount);
        } else {
            System.out.println("Banco de dados verificado: necessita população em massa");
        }
        
        return populated;
    }

    /**
     * Cria instâncias WORKER com associação correta aos conselhos distritais
     */
    private Instance createWorkerInstance(String name, Sector sector, InstanceHierarchyGenerator hierarchyGenerator) {
        // Obter um conselho distrital de rede de distribuição e serviços
        Instance associatedCouncil = hierarchyGenerator.getRandomWorkerAssociationCouncil();
        
        if (associatedCouncil == null) {
            System.out.println("AVISO: Nenhum conselho distrital disponível para associação com worker. Usando conselho arbitrário.");
            List<Instance> allCouncils = instanceRepository.findByType(InstanceType.COUNCIL);
            if (!allCouncils.isEmpty()) {
                associatedCouncil = allCouncils.get(random.nextInt(allCouncils.size()));
            } else {
                throw new RuntimeException("Nenhum conselho disponível para associação com worker.");
            }
        }
        
        // Obter uma instância de comitê para associação
        List<Instance> committees = instanceRepository.findByType(InstanceType.COMMITTEE);
        Instance associatedCommittee = !committees.isEmpty() ? 
            committees.get(random.nextInt(committees.size())) : null;
        
        // Se não encontrar comitê, tenta criar um associado ao conselho
        if (associatedCommittee == null) {
            associatedCommittee = createInstance(
                InstanceType.COMMITTEE,
                "Committee for " + sector.getName(),
                20 + random.nextInt(30),
                sector,
                associatedCouncil.getId(),
                new BigDecimal(1000 + random.nextInt(5000)).intValue(),
                null, null, null
            );
        }
        
        // Criar a instância WORKER com associação correta
        return createInstance(
            InstanceType.WORKER, 
            name, 
            null,  // worker_effective_limit deve ser null para WORKER
            sector,
            associatedCouncil.getId(),  // popular_council_associated_with_committee_or_worker 
            null,  // totalSocialWork (null para WORKER)
            null,  // socialMaterializationId
            null,  // producedQuantity
            null,  // targetQuantity
            associatedCommittee.getId(),  // id_associated_worker_committee
            0,     // id_associated_worker_residents_association (deve ser 0)
            new BigDecimal(0.0000000001 + (0.0000004999 * random.nextDouble()))
                .setScale(15, BigDecimal.ROUND_HALF_UP),  // estimated_individual_participation
            new BigDecimal(5 + random.nextInt(46))  // hours_at_electronic_point
        );
    }

    /**
     * Cria uma instância com todas as propriedades necessárias
     */
    private Instance createInstance(
            InstanceType type,
            String committeeName,
            Integer workerEffectiveLimit,
            Integer popularCouncilId,
            Integer totalSocialWork,
            SocialMaterialization socialMaterialization,
            BigDecimal producedQuantity,
            BigDecimal targetQuantity) {
        
        Instance instance = new Instance();
        instance.setType(type);
        instance.setCommitteeName(committeeName);
        instance.setWorkerEffectiveLimit(workerEffectiveLimit);
        
        // Associar a outro conselho, se especificado
        if (popularCouncilId != null) {
            Instance popularCouncil = instanceRepository.findById(popularCouncilId)
                    .orElseThrow(() -> new RuntimeException("Conselho com ID " + popularCouncilId + " não encontrado."));
            
            // Associação depende do tipo
            if (type == InstanceType.COUNCIL) {
                instance.setPopularCouncilAssociatedWithPopularCouncil(popularCouncil);
            } else {
                instance.setPopularCouncilAssociatedWithCommitteeOrWorker(popularCouncil);
            }
        }
        
        instance.setTotalSocialWorkOfThisJurisdiction(totalSocialWork);
        instance.setSocialMaterialization(socialMaterialization);
        instance.setProducedQuantity(producedQuantity);
        instance.setTargetQuantity(targetQuantity);
        instance.setCreatedAt(LocalDateTime.now());
        
        return instanceRepository.save(instance);
    }

    /**
     * Sobrecarga para criar instâncias WORKER com todos os parâmetros necessários
     */
    private Instance createInstance(
            InstanceType type,
            String committeeName,
            Integer workerEffectiveLimit,
            Sector sector,
            Integer popularCouncilId,
            Integer totalSocialWork,
            SocialMaterialization socialMaterialization,
            BigDecimal producedQuantity,
            BigDecimal targetQuantity,
            Integer associatedWorkerCommitteeId,
            Integer associatedWorkerResidentsAssociationId,
            BigDecimal estimatedIndividualParticipation,
            BigDecimal hoursAtElectronicPoint) {
    
        Instance instance = createInstance(type, committeeName, workerEffectiveLimit, sector,
                popularCouncilId, totalSocialWork, socialMaterialization, producedQuantity, targetQuantity);
    
        // Adicionar campos específicos para workers usando entidades relacionadas
        if (associatedWorkerCommitteeId != null) {
            Instance committee = new Instance();
            committee.setId(associatedWorkerCommitteeId);
            instance.setAssociatedWorkerCommittee(committee);
        }
    
        if (associatedWorkerResidentsAssociationId != null) {
            Instance association = new Instance();
            association.setId(associatedWorkerResidentsAssociationId);
            instance.setAssociatedWorkerResidentsAssociation(association);
        }
    
        instance.setEstimatedIndividualParticipationInSocialWork(estimatedIndividualParticipation);
        instance.setHoursAtElectronicPoint(hoursAtElectronicPoint);
    
        return instanceRepository.save(instance);
    }

    /**
     * Versão do createInstance que aceita um Sector como parâmetro
     */
    private Instance createInstance(
            InstanceType type,
            String committeeName,
            Integer workerEffectiveLimit,
            Sector sector,
            Integer popularCouncilId,
            Integer totalSocialWork,
            SocialMaterialization socialMaterialization,
            BigDecimal producedQuantity,
            BigDecimal targetQuantity) {
    
        Instance instance = new Instance();
        instance.setType(type);
        instance.setCommitteeName(committeeName);
        instance.setWorkerEffectiveLimit(workerEffectiveLimit);
    
        // Instance não tem campo sector direto
        if (sector != null && !sector.getSocialMaterializations().isEmpty()) {
            instance.setSocialMaterialization(sector.getSocialMaterializations().iterator().next());
        } else {
            instance.setSocialMaterialization(socialMaterialization);
        }
    
        // Definir conselho popular associado se necessário
        if (popularCouncilId != null) {
            Instance council = new Instance();
            council.setId(popularCouncilId);
    
            if (type == InstanceType.COUNCIL) {
                instance.setPopularCouncilAssociatedWithPopularCouncil(council);
            } else {
                instance.setPopularCouncilAssociatedWithCommitteeOrWorker(council);
            }
        }
    
        instance.setTotalSocialWorkOfThisJurisdiction(totalSocialWork); // Sem precisar converter
        instance.setProducedQuantity(producedQuantity);
        instance.setTargetQuantity(targetQuantity);
        instance.setCreatedAt(LocalDateTime.now());
    
        return instanceRepository.save(instance);
    }
}