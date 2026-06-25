package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import xyz.planecon.model.enums.InstanceType;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonIdentityInfo;
import com.fasterxml.jackson.annotation.ObjectIdGenerators;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@ToString(onlyExplicitlyIncluded = true)
@Entity
@Cacheable
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator.class, property = "id")
@Table(name = "instance")
public class Instance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @ToString.Include
    private Integer id;
    
    @Column(name = "created_at")
    @ToString.Include
    private LocalDateTime createdAt;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    @ToString.Include
    private InstanceType type;
    
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_social_materialization")
    private SocialMaterialization socialMaterialization;
    
    @Column(name = "worker_effective_limit")
    private Integer workerEffectiveLimit;
    
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "popular_council_associated_with_committee_or_worker")
    private Instance popularCouncilAssociatedWithCommitteeOrWorker;
    
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "popular_council_associated_with_popular_council")
    private Instance popularCouncilAssociatedWithPopularCouncil;
    
    @Column(name = "produced_quantity", precision = 16, scale = 2)
    private BigDecimal producedQuantity;
    
    @Column(name = "target_quantity", precision = 16, scale = 2)
    private BigDecimal targetQuantity;
    
    @Column(name = "committee_name")
    private String committeeName;
    
    @Column(name = "total_social_work_of_this_jurisdiction")
    private Integer totalSocialWorkOfThisJurisdiction;
    
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_associated_worker_committee")
    private Instance associatedWorkerCommittee;
    
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_associated_worker_residents_association")
    private Instance idAssociatedWorkerResidentsAssociation;
    
    @Column(name = "estimated_individual_participation_in_social_work", precision = 20, scale = 10)
    private BigDecimal estimatedIndividualParticipationInSocialWork;
    
    @Column(name = "hours_at_electronic_point", precision = 10, scale = 2)
    private BigDecimal hoursAtElectronicPoint;
    
    // Address fields
    @Column(name = "postal_code")
    private String postalCode;
    
    @Column(name = "street")
    private String street;
    
    @Column(name = "street_number")
    private String streetNumber;
    
    @Column(name = "suburb")
    private String suburb;
    
    @Column(name = "city")
    private String city;
    
    @Column(name = "city_code", length = 10)
    private String cityCode;
    
    @Column(name = "cnpj", length = 18)
    private String cnpj;
    
    @Column(name = "state")
    private String state;
    
    @Column(name = "country")
    private String country;
    
    @Column(name = "continent")
    private String continent;
    
    @Column(name = "address_complement")
    private String addressComplement;
    
    @Column(name = "latitude", precision = 10, scale = 7)
    private BigDecimal latitude;
    
    @Column(name = "longitude", precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "last_estimates_saved_at")
    private Long lastEstimatesSavedAt;

    @Column(name = "last_council_estimates_synced_at")
    private Long lastCouncilEstimatesSyncedAt;

    @Column(name = "last_planner_estimates_synced_at")
    private Long lastPlannerEstimatesSyncedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "technological_quantities_by_materialization", columnDefinition = "jsonb")
    private Map<String, BigDecimal> technologicalQuantitiesByMaterialization;

    // Campo de auditoria: indica se o usuário do Conselho Planificador alterou dados
    // após clicar em "Planificar" e antes de clicar em "Salvar Alterações".
    // FALSE = dados íntegros (não manipulados após planificação)
    // TRUE  = dados alterados após planificação (possível distorção)
    // Usado para auditoria posterior.
    @Column(name = "planification_data_tampered")
    private Boolean planificationDataTampered;

    // c_total: soma de toda a capacidade produtiva mensal de todos os comitês de todas as materializações
    @Column(name = "total_social_production_capacity", precision = 38, scale = 10)
    private BigDecimal totalSocialProductionCapacity;

    // Trabalho social total desta jurisdição: soma de (planifiedProductionTime * producedQuantity) dos comitês filhos,
    // ou soma dos totalSocialWork dos conselhos filhos (para conselhos superiores).
    @Column(name = "total_social_work", precision = 38, scale = 10)
    private BigDecimal totalSocialWork;

    // Soma total de horas trabalhadas de todos os trabalhadores (usado como denominador na participação social dos trabalhadores)
    @Column(name = "total_worker_hours", precision = 20, scale = 2)
    private BigDecimal totalWorkerHours;

    // Tempo de trabalho socialmente confirmado (horas distribuídas pelo comitê após encomenda concluída)
    @Column(name = "socially_confirmed_work_time", precision = 20, scale = 10)
    private BigDecimal sociallyConfirmedWorkTime;

    // Horas resgatáveis no ponto eletrônico (liberadas após confirmação de recebimento)
    @Column(name = "redeemable_hours", precision = 20, scale = 10)
    private BigDecimal redeemableHours;

    // Taxa de arrecadação do Conselho Popular (10-70%, padrão 50)
    @Column(name = "tax_rate", precision = 5, scale = 2)
    private BigDecimal taxRate;

    // Saldo do Conselho Popular (horas arrecadadas)
    @Column(name = "balance", precision = 20, scale = 10)
    private BigDecimal balance;

    // Teto máximo de emissão de CO2 da jurisdição (kg CO2), usado pelo Conselho Planificador
    @Column(name = "co2_emission_limit", precision = 38, scale = 6)
    private BigDecimal co2EmissionLimit;
    
    // Relationships
    @JsonIgnoreProperties("instance")
    @OneToMany(mappedBy = "instance", fetch = FetchType.LAZY)
    private List<DemandStock> demandStocks;
    
    @JsonIgnoreProperties("instance")
    @OneToMany(mappedBy = "instance", fetch = FetchType.LAZY)
    private List<DemandVector> demandVectors;
    
    @JsonIgnoreProperties("instance")
    @OneToMany(mappedBy = "instance", fetch = FetchType.LAZY)
    private List<OptimizationInputsResults> optimizationResults = new ArrayList<>();
    
    @JsonIgnoreProperties("instance")
    @OneToMany(mappedBy = "instance", fetch = FetchType.LAZY)
    private Set<WorkersProposal> workersProposals = new HashSet<>();
    
    @JsonIgnoreProperties("instance")
    @OneToMany(mappedBy = "instance", fetch = FetchType.LAZY)
    private List<User> users;

    /**
     * Override hashCode to avoid infinite recursion due to circular references
     */
    @Override
    public int hashCode() {
        final int prime = 31;
        int result = 1;
        result = prime * result + ((id == null) ? 0 : id.hashCode());
        // Don't include fields that create circular references:
        // popularCouncilAssociatedWithCommitteeOrWorker
        // popularCouncilAssociatedWithPopularCouncil
        // associatedWorkerCommittee
        return result;
    }

    /**
     * Override equals to avoid infinite recursion due to circular references
     */
    @Override
    public boolean equals(Object obj) {
        if (this == obj)
            return true;
        if (obj == null)
            return false;
        if (getClass() != obj.getClass())
            return false;
        Instance other = (Instance) obj;
        if (id == null) {
            return other.id == null;
        } else {
            return id.equals(other.id);
        }
    }
}
