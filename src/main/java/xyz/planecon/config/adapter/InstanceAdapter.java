package xyz.planecon.config.adapter;

import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.Sector;
import xyz.planecon.model.enums.InstanceType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Adapter para compatibilidade com a classe Instance
 */
public class InstanceAdapter {
    private static final Map<Integer, Instance> instanceCache = new HashMap<>();
    
    public static Instance adapt(Instance instance) {
        if (instance == null) return null;
        
        instanceCache.put(instance.getId(), instance);
        return instance;
    }
    
    public static Integer getId(Instance instance) {
        return instance.getId();
    }
    
    public static String getCommitteeName(Instance instance) {
        return instance.getCommitteeName();
    }
    
    public static void setCommitteeName(Instance instance, String name) {
        instance.setCommitteeName(name);
    }
    
    public static void setType(Instance instance, InstanceType type) {
        instance.setType(type);
    }
    
    public static InstanceType getType(Instance instance) {
        return instance.getType();
    }
    
    public static void setSector(Instance instance, Sector sector) {
        // Instance não tem campo sector diretamente
        // Não é possível definir setor diretamente
    }
    
    public static Sector getSector(Instance instance) {
        // Instance não tem campo sector diretamente
        // Não podemos obter setor diretamente
        return null;
    }
    
    public static void setPopularCouncilAssociatedWithCommitteeOrWorker(Instance instance, Instance council) {
        instance.setPopularCouncilAssociatedWithCommitteeOrWorker(council);
    }
    
    public static void setPopularCouncilAssociatedWithPopularCouncil(Instance instance, Instance council) {
        instance.setPopularCouncilAssociatedWithPopularCouncil(council);
    }
    
    public static void setIdAssociatedWorkerCommittee(Instance instance, Integer committeeId) {
        // Instance tem relacionamento direto, não apenas ID
        if (committeeId != null) {
            Instance committee = new Instance();
            committee.setId(committeeId);
            instance.setAssociatedWorkerCommittee(committee);
        } else {
            instance.setAssociatedWorkerCommittee(null);
        }
    }
    
    public static void setIdAssociatedWorkerResidentsAssociation(Instance instance, int associationId) {
        // Instance tem relacionamento direto, não apenas ID
        Instance association = new Instance();
        association.setId(associationId);
        instance.setAssociatedWorkerResidentsAssociation(association);
    }
    
    public static void setEstimatedIndividualParticipationInSocialWork(Instance instance, BigDecimal value) {
        instance.setEstimatedIndividualParticipationInSocialWork(value);
    }
    
    public static void setHoursAtElectronicPoint(Instance instance, BigDecimal hours) {
        instance.setHoursAtElectronicPoint(hours);
    }
    
    public static void setWorkerEffectiveLimit(Instance instance, Integer limit) {
        instance.setWorkerEffectiveLimit(limit);
    }
    
    public static void setCreatedAt(Instance instance, LocalDateTime dateTime) {
        instance.setCreatedAt(dateTime);
    }
    
    public static void setTotalSocialWorkOfThisJurisdiction(Instance instance, BigDecimal total) {
        // Campo é Integer, não BigDecimal
        instance.setTotalSocialWorkOfThisJurisdiction(total.intValue());
    }
}