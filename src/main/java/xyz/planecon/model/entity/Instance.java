package xyz.planecon.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import xyz.planecon.model.enums.InstanceType;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Data
@Entity
@Cacheable
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@Table(name = "instance")
public class Instance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private InstanceType type;
    
    @ManyToOne
    @JoinColumn(name = "id_social_materialization")
    private SocialMaterialization socialMaterialization;
    
    @Column(name = "worker_effective_limit")
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
    
    @Column(name = "committee_name")
    private String committeeName;
    
    @Column(name = "total_social_work_of_this_jurisdiction")
    private Integer totalSocialWorkOfThisJurisdiction;
    
    @ManyToOne
    @JoinColumn(name = "id_associated_worker_committee")
    private Instance associatedWorkerCommittee;
    
    @ManyToOne
    @JoinColumn(name = "id_associated_worker_residents_association")
    private Instance idAssociatedWorkerResidentsAssociation;
    
    @Column(name = "estimated_individual_participation_in_social_work", precision = 20, scale = 10)
    private BigDecimal estimatedIndividualParticipationInSocialWork;
    
    @Column(name = "hours_at_electronic_point", precision = 10, scale = 2)
    private BigDecimal hoursAtElectronicPoint;
    
    // Relationships
    @OneToMany(mappedBy = "instance")
    private List<DemandStock> demandStocks;
    
    @OneToMany(mappedBy = "instance")
    private List<DemandVector> demandVectors;
    
    @OneToMany(mappedBy = "instance")
    private List<TechnologicalTensor> technologicalTensors;
        
    @OneToMany(mappedBy = "instance")
    private List<OptimizationInputsResults> optimizationResults = new ArrayList<>();
    
    @OneToMany(mappedBy = "instance")
    private Set<WorkersProposal> workersProposals = new HashSet<>();
    
    @OneToMany(mappedBy = "instance")
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
