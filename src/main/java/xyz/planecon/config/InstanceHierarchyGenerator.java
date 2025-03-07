package xyz.planecon.config;

import org.springframework.stereotype.Component;
import xyz.planecon.model.entity.*;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.repository.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Gerador de hierarquia de instâncias para população massiva do banco de dados
 */
@Component
public class InstanceHierarchyGenerator {

    private final InstanceRepository instanceRepository;
    private final SocialMaterializationRepository socialMaterializationRepository;
    private final Random random = new Random();
    
    // Listas para gerar nomes de instâncias
    private final List<String> councilPrefixes = Arrays.asList(
            "Regional", "Central", "District", "Municipal", "Metropolitan", "Autonomous", 
            "Economic", "Sector", "Planning", "Developmental", "Service", "Coordination",
            "Urban", "Rural", "Communal", "Industrial", "Scientific", "Educational"
    );
    
    private final List<String> councilTypes = Arrays.asList(
            "Council", "Assembly", "Committee", "Board", "Commission", "Coordination", 
            "Planning Body", "Advisory Group", "Collective", "Administration"
    );
    
    private final List<String> regions = Arrays.asList(
            "North", "South", "East", "West", "Central", "Northeast", "Southeast", 
            "Northwest", "Southwest", "Upland", "Coastal", "Valley", "Mountain", 
            "River Basin", "Delta", "Peninsula", "Island"
    );
    
    private final List<String> scopes = Arrays.asList(
            "District", "Zone", "Province", "Sector", "Municipality", "Department", 
            "Region", "Quarter", "Division", "Territory", "Community"
    );
    
    private final List<String> committeeActions = Arrays.asList(
            "Planning", "Development", "Coordination", "Production", "Research", 
            "Distribution", "Management", "Design", "Implementation", "Evaluation", 
            "Resource", "Monitoring", "Supply", "Innovation", "Sustainability"
    );
    
    private final List<String> committeeAreas = Arrays.asList(
            "Manufacturing", "Agriculture", "Education", "Healthcare", "Energy",
            "Transport", "Housing", "Electronics", "Water", "Textile", "Food",
            "Construction", "Communications", "Recycling", "Maintenance", "Mining",
            "Arts", "Recreation", "Services", "Security", "Software", "Infrastructure"
    );

    // Adicionar estas listas para os conselhos distritais de distribuição e serviços
    private final List<String> distributionCouncilPrefixes = Arrays.asList(
            "District", "Local", "Community", "Area", "Zonal", "Sector"
    );

    private final List<String> distributionCouncilServices = Arrays.asList(
            "Distribution and Services", "Services and Supply", "Distribution Network", 
            "Services Network", "Distribution and Logistics", "Supply and Services"
    );

    private final List<String> distributionCouncilLocations = Arrays.asList(
            "North", "South", "Central", "Eastern", "Western", "Riverside", 
            "Downtown", "Industrial", "Commercial", "Metropolitan", "Suburban"
    );

    public InstanceHierarchyGenerator(
            InstanceRepository instanceRepository,
            SocialMaterializationRepository socialMaterializationRepository) {
        this.instanceRepository = instanceRepository;
        this.socialMaterializationRepository = socialMaterializationRepository;
    }
    
    /**
     * Gera uma hierarquia completa de instâncias
     */
    public Map<String, List<Instance>> generateInstanceHierarchy(
            List<Sector> sectors, 
            List<SocialMaterialization> socialMaterializations,
            int councilCount, 
            int committeeCount) {
        
        System.out.println("Gerando hierarquia de instâncias...");
        
        // Criar instância zero para associação com workers
        createZeroInstance();
        
        // Resultados da geração
        Map<String, List<Instance>> results = new HashMap<>();
        
        // Criar instâncias de conselhos em uma estrutura hierárquica
        List<Instance> councils = generateCouncilHierarchy(sectors, councilCount);
        results.put("councils", councils);
        
        // Criar comitês associados aos conselhos
        List<Instance> committees = generateCommittees(councils, sectors, socialMaterializations, committeeCount);
        results.put("committees", committees);
        
        return results;
    }
    
    /**
     * Cria uma instância com ID 0 para uso como associatedWorkerResidentsAssociation
     */
    private Instance createZeroInstance() {
        Optional<Instance> existingZeroInstance = instanceRepository.findById(0);
        if (existingZeroInstance.isPresent()) {
            return existingZeroInstance.get();
        }
        
        Instance zeroInstance = new Instance();
        zeroInstance.setId(0);
        zeroInstance.setType(InstanceType.COUNCIL); // Tipo arbitrário, usado apenas como referência
        zeroInstance.setCreatedAt(LocalDateTime.now());
        zeroInstance.setTotalSocialWorkOfThisJurisdiction(0); // Valor simbólico
        
        // Salvar com ID específico
        instanceRepository.save(zeroInstance);
        
        // Necessário para instâncias COUNCIL: auto-referência
        zeroInstance.setPopularCouncilAssociatedWithPopularCouncil(zeroInstance);
        instanceRepository.save(zeroInstance);
        
        System.out.println("Criada instância zero para referência de trabalhadores");
        return zeroInstance;
    }
    
    /**
     * Gera uma estrutura hierárquica de conselhos (COUNCIL)
     */
    private List<Instance> generateCouncilHierarchy(List<Sector> sectors, int count) {
        System.out.println("Gerando " + count + " conselhos (COUNCIL) em estrutura hierárquica...");
        List<Instance> councils = new ArrayList<>();
        List<Instance> distributionServiceCouncils = new ArrayList<>(); // Lista especial para conselhos de distribuição e serviços
        Set<String> usedNames = new HashSet<>();
        
        // Criar um conselho principal (root)
        Instance rootCouncil = new Instance();
        rootCouncil.setType(InstanceType.COUNCIL);
        rootCouncil.setWorkerEffectiveLimit(null); // COUNCIL não deve ter worker_effective_limit
        rootCouncil.setTotalSocialWorkOfThisJurisdiction(90000 + random.nextInt(100000));
        rootCouncil.setCommitteeName("Central Planning Council");
        rootCouncil.setCreatedAt(LocalDateTime.now());
        rootCouncil = instanceRepository.save(rootCouncil);
        
        // Auto-referência para o conselho principal
        rootCouncil.setPopularCouncilAssociatedWithPopularCouncil(rootCouncil);
        rootCouncil = instanceRepository.save(rootCouncil);
        
        councils.add(rootCouncil);
        usedNames.add(rootCouncil.getCommitteeName());
        
        // Criar conselhos específicos de distribuição e serviços (para associar com WORKER)
        int distributionCouncilsCount = Math.min(count / 5, 10); // 20% dos conselhos ou no máximo 10
        for (int i = 0; i < distributionCouncilsCount; i++) {
            String name = generateDistributionServiceCouncilName(usedNames);
            usedNames.add(name);
            
            Instance council = new Instance();
            council.setType(InstanceType.COUNCIL);
            council.setWorkerEffectiveLimit(null);
            council.setTotalSocialWorkOfThisJurisdiction(30000 + random.nextInt(50000));
            council.setCommitteeName(name);
            council.setPopularCouncilAssociatedWithPopularCouncil(rootCouncil); // Associado ao conselho principal
            council.setCreatedAt(LocalDateTime.now());
            
            council = instanceRepository.save(council);
            councils.add(council);
            distributionServiceCouncils.add(council); // Adicionar à lista especial
        }
        
        // Restante dos conselhos conforme código original
        int remainingCouncils = count - distributionCouncilsCount - 1; // -1 pelo conselho principal
        int firstLevelCount = Math.min(remainingCouncils, 8); // Primeiro nível direto ao root
        remainingCouncils -= firstLevelCount;
        
        // Criar conselhos de primeiro nível
        List<Instance> firstLevelCouncils = new ArrayList<>();
        for (int i = 0; i < firstLevelCount; i++) {
            String name = generateCouncilName(usedNames);
            usedNames.add(name);
            
            Instance council = new Instance();
            council.setType(InstanceType.COUNCIL);
            council.setWorkerEffectiveLimit(null);
            council.setTotalSocialWorkOfThisJurisdiction(20000 + random.nextInt(70000));
            council.setCommitteeName(name);
            council.setPopularCouncilAssociatedWithPopularCouncil(rootCouncil);
            List<SocialMaterialization> availableMaterializations = socialMaterializationRepository.findAll();
            if (!availableMaterializations.isEmpty()) {
                council.setSocialMaterialization(availableMaterializations.get(random.nextInt(availableMaterializations.size())));
            }
            council.setCreatedAt(LocalDateTime.now());
            
            council = instanceRepository.save(council);
            councils.add(council);
            firstLevelCouncils.add(council);
        }
        
        // Distribuir o restante dos conselhos em níveis mais profundos
        List<Instance> currentLevelParents = new ArrayList<>(firstLevelCouncils);
        List<Instance> nextLevelParents = new ArrayList<>();
        
        while (remainingCouncils > 0) {
            // Para cada conselho do nível atual, criar 1-3 filhos (ou menos, se não sobrarem suficientes)
            for (Instance parent : currentLevelParents) {
                if (remainingCouncils <= 0) break;
                
                int childrenCount = Math.min(1 + random.nextInt(3), remainingCouncils);
                remainingCouncils -= childrenCount;
                
                for (int i = 0; i < childrenCount; i++) {
                    String name = generateCouncilName(usedNames);
                    usedNames.add(name);
                    
                    Instance council = new Instance();
                    council.setType(InstanceType.COUNCIL);
                    council.setWorkerEffectiveLimit(null);
                    council.setTotalSocialWorkOfThisJurisdiction(5000 + random.nextInt(15000));
                    council.setCommitteeName(name);
                    council.setPopularCouncilAssociatedWithPopularCouncil(parent);
                    List<SocialMaterialization> availableMaterializations = socialMaterializationRepository.findAll();
                    if (!availableMaterializations.isEmpty()) {
                        council.setSocialMaterialization(availableMaterializations.get(random.nextInt(availableMaterializations.size())));
                    }
                    council.setCreatedAt(LocalDateTime.now());
                    
                    council = instanceRepository.save(council);
                    councils.add(council);
                    nextLevelParents.add(council);
                }
            }
            
            // Preparar para o próximo nível
            currentLevelParents = new ArrayList<>(nextLevelParents);
            nextLevelParents.clear();
            
            // Se não houver mais pais no nível atual, voltar para o primeiro nível
            if (currentLevelParents.isEmpty() && remainingCouncils > 0) {
                currentLevelParents = new ArrayList<>(firstLevelCouncils);
            }
        }
        
        // Salvar a lista especial para uso posterior
        workerAssociationCouncils = new ArrayList<>(distributionServiceCouncils);
        
        System.out.println("Criados " + councils.size() + " conselhos em estrutura hierárquica");
        System.out.println("  - Incluindo " + distributionServiceCouncils.size() + 
                         " conselhos distritais de distribuição e serviços para associação de workers");
        return councils;
    }
    
    // Adicionar campo para armazenar conselhos para associação com workers
    private List<Instance> workerAssociationCouncils = new ArrayList<>();

    /**
     * Gera comitês (COMMITTEE) vinculados aos conselhos existentes
     */
    private List<Instance> generateCommittees(
            List<Instance> councils, 
            List<Sector> sectors, 
            List<SocialMaterialization> socialMaterializations, 
            int count) {
        
        System.out.println("Gerando " + count + " comitês (COMMITTEE)...");
        List<Instance> committees = new ArrayList<>();
        Set<String> usedNames = new HashSet<>();
        
        // Garantir que pelo menos cada conselho tenha um comitê
        for (Instance council : councils) {
            if (committees.size() >= count) break;
            
            String name = generateCommitteeName(usedNames);
            usedNames.add(name);
            
            SocialMaterialization sm = socialMaterializations.get(random.nextInt(socialMaterializations.size()));
            
            // Valores para produced_quantity e target_quantity
            BigDecimal producedQuantity = new BigDecimal(random.nextInt(800) + 200);
            BigDecimal targetQuantity = producedQuantity.add(new BigDecimal(random.nextInt(500) + 100));
            
            Instance committee = new Instance();
            committee.setType(InstanceType.COMMITTEE);
            committee.setWorkerEffectiveLimit(20 + random.nextInt(60)); // worker_effective_limit - apenas para COMMITTEE
            committee.setCommitteeName(name);
            committee.setPopularCouncilAssociatedWithCommitteeOrWorker(council);
            committee.setTotalSocialWorkOfThisJurisdiction(1000 + random.nextInt(9000));
            committee.setSocialMaterialization(sm);
            committee.setProducedQuantity(producedQuantity);
            committee.setTargetQuantity(targetQuantity);
            committee.setCreatedAt(LocalDateTime.now());
            
            committee = instanceRepository.save(committee);
            committees.add(committee);
        }
        
        // Criar comitês adicionais
        int remainingCommittees = count - committees.size();
        for (int i = 0; i < remainingCommittees; i++) {
            String name = generateCommitteeName(usedNames);
            usedNames.add(name);
            
            // Escolher um conselho aleatório
            Instance council = councils.get(random.nextInt(councils.size()));
            SocialMaterialization sm = socialMaterializations.get(random.nextInt(socialMaterializations.size()));
            
            // Valores para produced_quantity e target_quantity
            BigDecimal producedQuantity = new BigDecimal(random.nextInt(800) + 200);
            BigDecimal targetQuantity = producedQuantity.add(new BigDecimal(random.nextInt(500) + 100));
            
            Instance committee = new Instance();
            committee.setType(InstanceType.COMMITTEE);
            committee.setWorkerEffectiveLimit(20 + random.nextInt(60));
            committee.setCommitteeName(name);
            committee.setPopularCouncilAssociatedWithCommitteeOrWorker(council);
            List<SocialMaterialization> availableMaterializations = socialMaterializationRepository.findAll();
            if (!availableMaterializations.isEmpty()) {
                committee.setSocialMaterialization(availableMaterializations.get(random.nextInt(availableMaterializations.size())));
            }
            committee.setTotalSocialWorkOfThisJurisdiction(1000 + random.nextInt(9000));
            committee.setSocialMaterialization(sm);
            committee.setProducedQuantity(producedQuantity);
            committee.setTargetQuantity(targetQuantity);
            committee.setCreatedAt(LocalDateTime.now());
            
            committee = instanceRepository.save(committee);
            committees.add(committee);
            
            if (i > 0 && i % 50 == 0) {
                System.out.println("  - Criados " + i + " comitês adicionais...");
            }
        }
        
        System.out.println("Criados " + committees.size() + " comitês vinculados a conselhos");
        return committees;
    }
    
    /**
     * Gera um nome único para um conselho
     */
    private String generateCouncilName(Set<String> usedNames) {
        String name;
        int attempts = 0;
        
        do {
            if (random.nextBoolean()) {
                // Nome com região
                name = councilPrefixes.get(random.nextInt(councilPrefixes.size())) + " " +
                       regions.get(random.nextInt(regions.size())) + " " +
                       councilTypes.get(random.nextInt(councilTypes.size()));
            } else {
                // Nome com escopo
                name = councilPrefixes.get(random.nextInt(councilPrefixes.size())) + " " +
                       scopes.get(random.nextInt(scopes.size())) + " " +
                       councilTypes.get(random.nextInt(councilTypes.size()));
            }
            attempts++;
        } while (usedNames.contains(name) && attempts < 50);
        
        if (attempts >= 50) {
            name = "Council-" + UUID.randomUUID().toString().substring(0, 8);
        }
        
        return name;
    }
    
    /**
     * Gera um nome único para um comitê
     */
    private String generateCommitteeName(Set<String> usedNames) {
        String name;
        int attempts = 0;
        
        do {
            name = committeeActions.get(random.nextInt(committeeActions.size())) + " " +
                   committeeAreas.get(random.nextInt(committeeAreas.size())) + " Committee";
            attempts++;
        } while (usedNames.contains(name) && attempts < 50);
        
        if (attempts >= 50) {
            name = "Committee-" + UUID.randomUUID().toString().substring(0, 8);
        }
        
        return name;
    }

    /**
     * Gera um nome específico para conselhos de distribuição e serviços
     */
    private String generateDistributionServiceCouncilName(Set<String> usedNames) {
        String name;
        int attempts = 0;
        
        do {
            String prefix = distributionCouncilPrefixes.get(random.nextInt(distributionCouncilPrefixes.size()));
            String service = distributionCouncilServices.get(random.nextInt(distributionCouncilServices.size()));
            
            if (random.nextBoolean()) {
                // Com localização
                String location = distributionCouncilLocations.get(random.nextInt(distributionCouncilLocations.size()));
                name = prefix + " Council of " + service + " Network " + location;
            } else {
                name = prefix + " Council of " + service + " Network";
            }
            attempts++;
        } while (usedNames.contains(name) && attempts < 50);
        
        if (attempts >= 50) {
            name = "District Council of Distribution Services-" + UUID.randomUUID().toString().substring(0, 8);
        }
        
        return name;
    }

    // Método para obter um conselho para associação com worker
    public Instance getRandomWorkerAssociationCouncil() {
        if (workerAssociationCouncils.isEmpty()) {
            return null;
        }
        return workerAssociationCouncils.get(random.nextInt(workerAssociationCouncils.size()));
    }
}