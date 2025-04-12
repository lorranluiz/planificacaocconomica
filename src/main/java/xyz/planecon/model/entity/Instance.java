package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import xyz.planecon.model.enums.InstanceType;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@ToString(onlyExplicitlyIncluded = true)
@Entity
@Cacheable
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
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
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_social_materialization")
    private SocialMaterialization socialMaterialization;
    
    @Column(name = "worker_effective_limit")
    private Integer workerEffectiveLimit;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "popular_council_associated_with_committee_or_worker")
    private Instance popularCouncilAssociatedWithCommitteeOrWorker;
    
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
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_associated_worker_committee")
    private Instance associatedWorkerCommittee;
    
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
