package xyz.planecon.config.adapter;

import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.entity.WorkersProposal;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Adapter para compatibilidade com a classe WorkersProposal
 */
public class WorkersProposalAdapter {
    
    public static void setInstance(WorkersProposal proposal, Instance instance) {
        // A proposta usa uma chave composta (EmbeddedId)
        if (proposal.getId() == null) {
            proposal.setId(new WorkersProposal.WorkersProposalId());
        }
        
        proposal.getId().setInstanceId(instance != null ? instance.getId() : null);
        proposal.setInstance(instance);
    }
    
    public static void setSocialMaterialization(WorkersProposal proposal, SocialMaterialization sm) {
        // WorkersProposal não tem campo socialMaterialization diretamente
        // Podemos definir outros campos relacionados, como workerLimit e workerHours
        proposal.setWorkerLimit(10); // Valor padrão
        proposal.setWorkerHours(new BigDecimal("8.0")); // Jornada padrão
        proposal.setProductionTime(new BigDecimal("40.0")); // Tempo padrão
        proposal.setNightShift(false); // Valor padrão
        proposal.setWeeklyScale(5); // 5 dias por semana
    }
    
    public static void setProposedQuantity(WorkersProposal proposal, BigDecimal quantity) {
        // WorkersProposal não tem campo proposedQuantity, mas podemos definir campos relacionados
        proposal.setProductionTime(quantity.divide(new BigDecimal(100), 2, BigDecimal.ROUND_HALF_UP));
    }
    
    public static void setCreatedAt(WorkersProposal proposal, LocalDateTime dateTime) {
        proposal.setCreatedAt(dateTime);
    }
}