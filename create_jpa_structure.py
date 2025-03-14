import os
import pathlib
import sys

# Base directory - adjust for your environment
base_dir = "/mnt/g/Downloads/GitHubClones/planificacaoEconomica"
if not os.path.exists(base_dir) and os.path.exists("G:/Downloads/GitHubClones/planificacaoEconomica"):
    base_dir = "G:/Downloads/GitHubClones/planificacaoEconomica"

# Print current working directory for debugging
print(f"Current working directory: {os.getcwd()}")
print(f"Creating structure in: {base_dir}")

# Verify directory exists
if not os.path.exists(base_dir):
    print(f"ERROR: Directory '{base_dir}' doesn't exist!")
    print("Check if the path is correct and accessible")
    sys.exit(1)
else:
    print(f"✓ Target directory exists")

# Structure for directories to create
directories = [
    "src/main/java/xyz/planecon",
    "src/main/java/xyz/planecon/config",
    "src/main/java/xyz/planecon/model",
    "src/main/java/xyz/planecon/model/entity",
    "src/main/java/xyz/planecon/model/enums",
    "src/main/java/xyz/planecon/repository",
    "src/main/java/xyz/planecon/service",
    "src/main/java/xyz/planecon/controller",
    "src/main/resources",
    "src/test/java/xyz/planecon"
]

# File contents to create
files = {
    "pom.xml": """<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.5</version>
    </parent>
    
    <groupId>xyz.planecon</groupId>
    <artifactId>planificacao-economica</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>planificacao-economica</name>
    <description>Planificação Econômica Application</description>
    
    <properties>
        <java.version>17</java.version>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <mainClass>xyz.planecon.Application</mainClass>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>""",

    "src/main/resources/application.properties": """# Database Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/planecon
spring.datasource.username=postgres
spring.datasource.password=planecon123
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA Configuration
spring.jpa.show-sql=true
spring.jpa.hibernate.ddl-auto=none
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.properties.hibernate.format_sql=true

# Server Configuration
server.port=8080
""",

    "src/main/java/xyz/planecon/Application.java": """package xyz.planecon;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
""",

    "src/main/java/xyz/planecon/model/enums/InstanceType.java": """package xyz.planecon.model.enums;

public enum InstanceType {
    COUNCIL, COMMITTEE, WORKER
}
""",

    "src/main/java/xyz/planecon/model/enums/SocialMaterializationType.java": """package xyz.planecon.model.enums;

public enum SocialMaterializationType {
    PRODUCT, SERVICE
}
""",

    "src/main/java/xyz/planecon/model/enums/UserType.java": """package xyz.planecon.model.enums;

public enum UserType {
    COUNCILLOR, NON_COUNCILLOR
}
""",

    "src/main/java/xyz/planecon/model/entity/Instance.java": """package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import xyz.planecon.model.enums.InstanceType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Data
@Entity
@Table(name = "instance")
public class Instance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InstanceType type;
    
    @ManyToOne
    @JoinColumn(name = "id_social_materialization")
    private SocialMaterialization socialMaterialization;
    
    @Column(name = "worker_effective_limit", nullable = false)
    private Integer workerEffectiveLimit;
    
    @ManyToOne
    @JoinColumn(name = "popular_council_associated_with_committee_or_worker")
    private Instance popularCouncilAssociatedWithCommitteeOrWorker;
    
    @ManyToOne
    @JoinColumn(name = "popular_council_associated_with_popular_council")
    private Instance popularCouncilAssociatedWithPopularCouncil;
    
    @Column(name = "produced_quantity", precision = 16, scale = 2)
    private BigDecimal producedQuantity;
    
    @Column(name = "target_quantity", precision = 16, scale = 2)
    private BigDecimal targetQuantity;
    
    @Column(name = "committee_name", length = 150)
    private String committeeName;
    
    @Column(name = "total_social_work_of_this_jurisdiction")
    private Integer totalSocialWorkOfThisJurisdiction;
    
    @ManyToOne
    @JoinColumn(name = "id_associated_worker_committee")
    private Instance associatedWorkerCommittee;
    
    @ManyToOne
    @JoinColumn(name = "id_associated_worker_residents_association")
    private Instance associatedWorkerResidentsAssociation;
    
    @Column(name = "estimated_individual_participation_in_social_work", precision = 20, scale = 10)
    private BigDecimal estimatedIndividualParticipationInSocialWork;
    
    @Column(name = "hours_at_electronic_point", precision = 10, scale = 2)
    private BigDecimal hoursAtElectronicPoint;
    
    // Relationships
    @OneToMany(mappedBy = "instance")
    private Set<DemandStock> demandStocks = new HashSet<>();
    
    @OneToMany(mappedBy = "instance")
    private Set<DemandVector> demandVectors = new HashSet<>();
    
    @OneToMany(mappedBy = "instance")
    private Set<TechnologicalTensor> technologicalTensors = new HashSet<>();
    
    @OneToMany(mappedBy = "instance")
    private Set<OptimizationInputsResults> optimizationResults = new HashSet<>();
    
    @OneToMany(mappedBy = "instance")
    private Set<WorkersProposal> workersProposals = new HashSet<>();
    
    @OneToMany(mappedBy = "instance")
    private Set<User> users = new HashSet<>();
}
""",

    "src/main/java/xyz/planecon/model/entity/Sector.java": """package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.util.HashSet;
import java.util.Set;

@Data
@Entity
@Table(name = "sector")
public class Sector {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    @Column(name = "name", length = 100, nullable = false)
    private String name;
    
    @OneToMany(mappedBy = "sector")
    private Set<SocialMaterialization> socialMaterializations = new HashSet<>();
}
""",

    "src/main/java/xyz/planecon/model/entity/SocialMaterialization.java": """package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import xyz.planecon.model.enums.SocialMaterializationType;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Data
@Entity
@Table(name = "social_materialization")
public class SocialMaterialization {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    @Column(name = "name", length = 100, nullable = false)
    private String name;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SocialMaterializationType type;
    
    @ManyToOne
    @JoinColumn(name = "id_sector", nullable = false)
    private Sector sector;
    
    @OneToMany(mappedBy = "socialMaterialization")
    private Set<Instance> instances = new HashSet<>();
    
    @OneToMany(mappedBy = "id.socialMaterialization")
    private Set<DemandStock> demandStocks = new HashSet<>();
    
    @OneToMany(mappedBy = "id.socialMaterialization")
    private Set<DemandVector> demandVectors = new HashSet<>();
    
    @OneToMany(mappedBy = "socialMaterialization")
    private Set<OptimizationInputsResults> optimizationResults = new HashSet<>();
}
""",

    "src/main/java/xyz/planecon/model/entity/DemandStock.java": """package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "demand_stock")
public class DemandStock {
    @EmbeddedId
    private DemandStockId id;
    
    @ManyToOne
    @MapsId("instanceId")
    @JoinColumn(name = "id_instance")
    private Instance instance;
    
    @ManyToOne
    @MapsId("socialMaterializationId")
    @JoinColumn(name = "id_social_materialization")
    private SocialMaterialization socialMaterialization;
    
    @Column(name = "stock", nullable = false, precision = 16, scale = 6)
    private BigDecimal stock;
    
    @Column(name = "demand", nullable = false, precision = 16, scale = 6)
    private BigDecimal demand;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Data
    @Embeddable
    @EqualsAndHashCode
    public static class DemandStockId implements Serializable {
        private static final long serialVersionUID = 1L;
        
        @Column(name = "id_instance")
        private Integer instanceId;
        
        @Column(name = "id_social_materialization")
        private Integer socialMaterializationId;
    }
}
""",

    "src/main/java/xyz/planecon/model/entity/DemandVector.java": """package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serializable;

@Data
@Entity
@Table(name = "demand_vector")
public class DemandVector {
    @EmbeddedId
    private DemandVectorId id;
    
    @ManyToOne
    @MapsId("instanceId")
    @JoinColumn(name = "id_instance")
    private Instance instance;
    
    @ManyToOne
    @MapsId("socialMaterializationId")
    @JoinColumn(name = "id_social_materialization")
    private SocialMaterialization socialMaterialization;
    
    @Column(name = "value")
    private Double value;
    
    @Data
    @Embeddable
    @EqualsAndHashCode
    public static class DemandVectorId implements Serializable {
        private static final long serialVersionUID = 1L;
        
        @Column(name = "id_instance")
        private Integer instanceId;
        
        @Column(name = "id_social_materialization")
        private Integer socialMaterializationId;
    }
}
""",

    "src/main/java/xyz/planecon/model/entity/TechnologicalTensor.java": """package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serializable;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "technological_tensor")
public class TechnologicalTensor {
    @EmbeddedId
    private TechnologicalTensorId id;
    
    @ManyToOne
    @MapsId("instanceId")
    @JoinColumn(name = "id_instance")
    private Instance instance;
    
    @ManyToOne
    @MapsId("socialMaterializationId")
    @JoinColumn(name = "id_social_materialization")
    private SocialMaterialization socialMaterialization;
    
    @Column(name = "id_production_input")
    private Integer productionInputId;
    
    @Column(name = "element_value", precision = 1, scale = 5)
    private BigDecimal elementValue;
    
    @Data
    @Embeddable
    @EqualsAndHashCode
    public static class TechnologicalTensorId implements Serializable {
        private static final long serialVersionUID = 1L;
        
        @Column(name = "id_instance")
        private Integer instanceId;
        
        @Column(name = "id_social_materialization")
        private Integer socialMaterializationId;
        
        @Column(name = "id_production_input")
        private Integer productionInputId;
    }
}
""",

    "src/main/java/xyz/planecon/model/entity/OptimizationInputsResults.java": """package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "optimization_inputs_results")
public class OptimizationInputsResults {
    @EmbeddedId
    private OptimizationInputsResultsId id;
    
    @ManyToOne
    @MapsId("instanceId")
    @JoinColumn(name = "id_instance")
    private Instance instance;
    
    @ManyToOne
    @MapsId("socialMaterializationId")
    @JoinColumn(name = "id_social_materialization")
    private SocialMaterialization socialMaterialization;
    
    @Column(name = "worker_limit", nullable = false)
    private Integer workerLimit;
    
    @Column(name = "worker_hours", precision = 10, scale = 2, nullable = false)
    private BigDecimal workerHours;
    
    @Column(name = "production_time", precision = 10, scale = 2, nullable = false)
    private BigDecimal productionTime;
    
    @Column(name = "night_shift", nullable = false)
    private Boolean nightShift;
    
    @Column(name = "weekly_scale", nullable = false)
    private Integer weeklyScale;
    
    @Column(name = "planned_weekly_scale", nullable = false)
    private Integer plannedWeeklyScale;
    
    @Column(name = "production_goal", precision = 16, scale = 6, nullable = false)
    private BigDecimal productionGoal;
    
    @Column(name = "total_hours", precision = 16, scale = 10, nullable = false)
    private BigDecimal totalHours;
    
    @Column(name = "workers_needed", nullable = false)
    private Integer workersNeeded;
    
    @Column(name = "factories_needed", nullable = false)
    private Integer factoriesNeeded;
    
    @Column(name = "total_shifts", nullable = false)
    private Integer totalShifts;
    
    @Column(name = "minimum_production_time", precision = 10, scale = 2, nullable = false)
    private BigDecimal minimumProductionTime;
    
    @Column(name = "total_employment_period", nullable = false)
    private Duration totalEmploymentPeriod;
    
    @Column(name = "planned_final_demand", precision = 16, scale = 6, nullable = false)
    private BigDecimal plannedFinalDemand;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Data
    @Embeddable
    @EqualsAndHashCode
    public static class OptimizationInputsResultsId implements Serializable {
        private static final long serialVersionUID = 1L;
        
        @Column(name = "id_instance")
        private Integer instanceId;
        
        @Column(name = "id_social_materialization")
        private Integer socialMaterializationId;
    }
}
""",

    "src/main/java/xyz/planecon/model/entity/WorkersProposal.java": """package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "workers_proposal")
public class WorkersProposal implements Serializable {
    private static final long serialVersionUID = 1L;
    
    @Id
    @Column(name = "id_instance")
    private Integer instanceId;
    
    @MapsId
    @OneToOne
    @JoinColumn(name = "id_instance")
    private Instance instance;
    
    @Column(name = "worker_limit", nullable = false)
    private Integer workerLimit;
    
    @Column(name = "worker_hours", precision = 10, scale = 2, nullable = false)
    private BigDecimal workerHours;
    
    @Column(name = "production_time", precision = 10, scale = 2, nullable = false)
    private BigDecimal productionTime;
    
    @Column(name = "night_shift", nullable = false)
    private Boolean nightShift;
    
    @Column(name = "weekly_scale", nullable = false)
    private Integer weeklyScale;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
""",

    "src/main/java/xyz/planecon/model/entity/User.java": """package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import xyz.planecon.model.enums.UserType;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "\"user\"") // Quoted because "user" is a reserved keyword in PostgreSQL
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    @Column(name = "username", length = 50, nullable = false, unique = true)
    private String username;
    
    @Column(name = "password", length = 255, nullable = false)
    private String password;
    
    @ManyToOne
    @JoinColumn(name = "id_instance", nullable = false)
    private Instance instance;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserType type;
    
    @Column(name = "pronoun", length = 255, nullable = false)
    private String pronoun;
    
    @Column(name = "name", length = 255, nullable = false)
    private String name;
}
""",

    "src/main/java/xyz/planecon/repository/InstanceRepository.java": """package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.enums.InstanceType;

import java.util.List;

@Repository
public interface InstanceRepository extends JpaRepository<Instance, Integer> {
    List<Instance> findByType(InstanceType type);
    
    List<Instance> findByPopularCouncilAssociatedWithCommitteeOrWorker(Instance council);
    
    List<Instance> findByCommitteeName(String name);
}
""",

    "src/main/java/xyz/planecon/repository/SectorRepository.java": """package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.Sector;

@Repository
public interface SectorRepository extends JpaRepository<Sector, Integer> {
    Sector findByName(String name);
}
""",

    "src/main/java/xyz/planecon/repository/SocialMaterializationRepository.java": """package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.entity.Sector;
import xyz.planecon.model.enums.SocialMaterializationType;

import java.util.List;

@Repository
public interface SocialMaterializationRepository extends JpaRepository<SocialMaterialization, Integer> {
    List<SocialMaterialization> findByType(SocialMaterializationType type);
    
    List<SocialMaterialization> findBySector(Sector sector);
}
""",

    "src/main/java/xyz/planecon/repository/UserRepository.java": """package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.User;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByUsername(String username);
}
""",

    "src/main/java/xyz/planecon/repository/DemandStockRepository.java": """package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.DemandStock;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.SocialMaterialization;

import java.util.List;
import java.util.Optional;

@Repository
public interface DemandStockRepository extends JpaRepository<DemandStock, DemandStock.DemandStockId> {
    List<DemandStock> findByInstance(Instance instance);
    
    List<DemandStock> findBySocialMaterialization(SocialMaterialization socialMaterialization);
    
    Optional<DemandStock> findByInstanceAndSocialMaterialization(Instance instance, SocialMaterialization socialMaterialization);
}
""",

    "src/main/java/xyz/planecon/repository/DemandVectorRepository.java": """package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.DemandVector;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.SocialMaterialization;

import java.util.List;

@Repository
public interface DemandVectorRepository extends JpaRepository<DemandVector, DemandVector.DemandVectorId> {
    List<DemandVector> findByInstance(Instance instance);
    
    List<DemandVector> findBySocialMaterialization(SocialMaterialization socialMaterialization);
}
""",

    "src/main/java/xyz/planecon/service/InstanceService.java": """package xyz.planecon.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.repository.InstanceRepository;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class InstanceService {
    private final InstanceRepository instanceRepository;
    
    public List<Instance> getAllInstances() {
        return instanceRepository.findAll();
    }
    
    public Optional<Instance> getInstanceById(Integer id) {
        return instanceRepository.findById(id);
    }
    
    public List<Instance> getInstancesByType(InstanceType type) {
        return instanceRepository.findByType(type);
    }
    
    public List<Instance> getInstancesByCouncil(Instance council) {
        return instanceRepository.findByPopularCouncilAssociatedWithCommitteeOrWorker(council);
    }
    
    public Instance saveInstance(Instance instance) {
        return instanceRepository.save(instance);
    }
    
    public void deleteInstance(Integer id) {
        instanceRepository.deleteById(id);
    }
}
""",

    "src/main/java/xyz/planecon/service/UserService.java": """package xyz.planecon.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import xyz.planecon.model.entity.User;
import xyz.planecon.repository.UserRepository;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
    
    public Optional<User> getUserById(Integer id) {
        return userRepository.findById(id);
    }
    
    public Optional<User> getUserByUsername(String username) {
        return userRepository.findByUsername(username);
    }
    
    public User saveUser(User user) {
        return userRepository.save(user);
    }
    
    public void deleteUser(Integer id) {
        userRepository.deleteById(id);
    }
}
""",

    "src/main/java/xyz/planecon/controller/InstanceController.java": """package xyz.planecon.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.service.InstanceService;

import java.util.List;

@RestController
@RequestMapping("/api/instances")
@RequiredArgsConstructor
public class InstanceController {
    private final InstanceService instanceService;
    
    @GetMapping
    public List<Instance> getAllInstances() {
        return instanceService.getAllInstances();
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Instance> getInstanceById(@PathVariable Integer id) {
        return instanceService.getInstanceById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/type/{type}")
    public List<Instance> getInstancesByType(@PathVariable InstanceType type) {
        return instanceService.getInstancesByType(type);
    }
    
    @PostMapping
    public Instance createInstance(@RequestBody Instance instance) {
        return instanceService.saveInstance(instance);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Instance> updateInstance(@PathVariable Integer id, @RequestBody Instance instance) {
        if (!instanceService.getInstanceById(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        
        instance.setId(id);
        return ResponseEntity.ok(instanceService.saveInstance(instance));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInstance(@PathVariable Integer id) {
        if (!instanceService.getInstanceById(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        
        instanceService.deleteInstance(id);
        return ResponseEntity.noContent().build();
    }
}
""",

    "src/main/java/xyz/planecon/config/DatabaseConfig.java": """package xyz.planecon.config;

import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@Configuration
@EnableTransactionManagement
@EntityScan(basePackages = "xyz.planecon.model.entity")
@EnableJpaRepositories(basePackages = "xyz.planecon.repository")
public class DatabaseConfig {
    // Configuration is handled through application.properties
    // Additional beans can be defined here if needed
}
"""
}

def create_project_structure():
    created_dirs = 0
    created_files = 0
    
    # Create directories
    for directory in directories:
        full_path = os.path.join(base_dir, directory)
        try:
            pathlib.Path(full_path).mkdir(parents=True, exist_ok=True)
            if os.path.exists(full_path):
                print(f"✓ Created directory: {full_path}")
                created_dirs += 1
            else:
                print(f"✗ Failed to create directory: {full_path}")
        except Exception as e:
            print(f"Error creating directory {full_path}: {str(e)}")
    
    # Create files
    for file_path, content in files.items():
        full_path = os.path.join(base_dir, file_path)
        
        try:
            # Create parent directories if they don't exist
            parent_dir = os.path.dirname(full_path)
            pathlib.Path(parent_dir).mkdir(parents=True, exist_ok=True)
            
            # Write file
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            if os.path.exists(full_path):
                print(f"✓ Created file: {full_path}")
                created_files += 1
            else:
                print(f"✗ Failed to create file: {full_path}")
        except Exception as e:
            print(f"Error creating file {full_path}: {str(e)}")
    
    print(f"\nSummary: Created {created_dirs} directories and {created_files} files")

if __name__ == "__main__":
    create_project_structure()
    print("Project structure creation complete!")