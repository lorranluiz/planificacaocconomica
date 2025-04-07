package xyz.planecon.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.planecon.dto.CommitteeStateDTO;
import xyz.planecon.dto.DemandsAndGoalsResponseDTO;
import xyz.planecon.exception.ResourceNotFoundException;
import xyz.planecon.model.entity.*;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.repository.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CommitteeService {
    
    private static final Logger logger = LoggerFactory.getLogger(CommitteeService.class);

    @Autowired
    private InstanceRepository instanceRepository;

    @Autowired
    private TechnologicalTensorRepository tensorRepository;

    @Autowired
    private DemandVectorRepository demandVectorRepository;
    
    @Autowired
    private SocialMaterializationRepository materializationRepository;
    
    @Autowired
    private DemandStockRepository demandStockRepository;

    /**
     * Atualiza demandas e metas do comitê com base nas instâncias associadas
     *
     * @param committeeId ID da instância do comitê
     * @return Objeto contendo os dados atualizados
     * @throws ResourceNotFoundException se o comitê não for encontrado
     * @throws IllegalArgumentException se a instância não for um comitê ou não tiver conselho associado
     */
    @Transactional
    public DemandsAndGoalsResponseDTO updateDemandsAndGoals(Integer committeeId) {
        logger.info("Iniciando atualização de demandas e metas para comitê ID: {}", committeeId);
        
        // 1. Buscar instância do comitê
        Instance committee = instanceRepository.findById(committeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Comitê", committeeId));

        // 2. Verificar se é realmente um comitê
        if (committee.getType() != InstanceType.COMMITTEE) {
            throw new IllegalArgumentException("A instância não é um comitê: " + committeeId);
        }

        // 3. Buscar o conselho associado ao comitê
        Instance council = committee.getPopularCouncilAssociatedWithCommitteeOrWorker();
        if (council == null) {
            throw new IllegalArgumentException("O comitê não está associado a nenhum conselho: " + committeeId);
        }

        // 4. Buscar a materialização social produzida pelo comitê
        SocialMaterialization committeeMaterialization = committee.getSocialMaterialization();
        if (committeeMaterialization == null) {
            throw new IllegalArgumentException("O comitê não tem uma materialização social associada: " + committeeId);
        }

        logger.info("Comitê: {}, Conselho associado: {}, Materialização produzida: {}", 
                  committeeId, council.getId(), committeeMaterialization.getId());

        // 5. Buscar demanda do conselho para o produto do comitê
        BigDecimal newTargetQuantity = findCouncilDemandForMaterialization(council, committeeMaterialization.getId());
        logger.info("Nova meta de produção para o comitê: {}", newTargetQuantity);

        // 6. Atualizar a meta de produção do comitê
        committee.setTargetQuantity(newTargetQuantity);
        instanceRepository.save(committee);

        // 7. Buscar todas as materializações sociais relacionadas ao comitê
        Map<Integer, DemandsAndGoalsResponseDTO.StockDemandDTO> stockDemandMap = 
            updateStockAndDemand(committee, council);

        // 8. Preparar o objeto de resposta
        BigDecimal producedQuantity = committee.getProducedQuantity() != null ? committee.getProducedQuantity() : BigDecimal.ZERO;
        BigDecimal remainingQuantity = newTargetQuantity.subtract(producedQuantity);
        
        DemandsAndGoalsResponseDTO.ProductionTargetsDTO productionTargetsDTO = 
            DemandsAndGoalsResponseDTO.ProductionTargetsDTO.builder()
                .producedQuantity(producedQuantity)
                .targetQuantity(newTargetQuantity)
                .remainingQuantity(remainingQuantity)
                .build();

        logger.info("Atualização de demandas e metas concluída para comitê ID: {}", committeeId);

        return DemandsAndGoalsResponseDTO.builder()
                .stockDemand(stockDemandMap)
                .productionTargets(productionTargetsDTO)
                .build();
    }

    /**
     * Busca a demanda do conselho para uma materialização específica
     */
    private BigDecimal findCouncilDemandForMaterialization(Instance council, Integer materializationId) {
        // Buscar o vetor de demanda do conselho para esta materialização
        Optional<DemandVector> councilDemand = demandVectorRepository.findByInstanceIdAndSocialMaterializationId(
            council.getId(), materializationId
        );
        
        // Retornar a demanda ou zero se não encontrada
        if (councilDemand.isPresent() && councilDemand.get().getDemand() != null) {
            logger.info("Demanda encontrada no conselho para materialização {}: {}", 
                      materializationId, councilDemand.get().getDemand());
            return councilDemand.get().getDemand();
        } else {
            logger.info("Nenhuma demanda encontrada no conselho para materialização {}, usando zero como padrão", 
                      materializationId);
            return BigDecimal.ZERO;
        }
    }

    /**
     * Atualiza estoque e demanda das materializações associadas ao comitê
     */
    private Map<Integer, DemandsAndGoalsResponseDTO.StockDemandDTO> updateStockAndDemand(
            Instance committee, Instance council) {
        
        // Resultado final a ser retornado
        Map<Integer, DemandsAndGoalsResponseDTO.StockDemandDTO> result = new HashMap<>();
        
        // 1. Buscar todas as materializações usadas no comitê (tensores tecnológicos)
        Set<Integer> materializationIds = new HashSet<>();
        List<TechnologicalTensor> committeeTensors = tensorRepository.findByInstance(committee);
        
        for (TechnologicalTensor tensor : committeeTensors) {
            materializationIds.add(tensor.getInputSocialMaterialization().getId());
            materializationIds.add(tensor.getOutputSocialMaterialization().getId());
        }
        
        // Adicionar também a materialização de saída do comitê
        if (committee.getSocialMaterialization() != null) {
            materializationIds.add(committee.getSocialMaterialization().getId());
        }
        
        logger.info("Encontradas {} materializações relacionadas ao comitê", materializationIds.size());
        
        // 2. Para cada materialização, calcular estoque e demanda
        for (Integer matId : materializationIds) {
            // Buscar a materialização do banco de dados para garantir informações atualizadas
            SocialMaterialization mat = materializationRepository.findById(matId)
                .orElseThrow(() -> new IllegalArgumentException("Materialização não encontrada: " + matId));
            
            // 3. Verificar demanda do conselho para esta materialização
            BigDecimal demand = findCouncilDemandForMaterialization(council, matId);
            
            // 4. Buscar ou criar demandStock para esta materialização
            DemandStock demandStock = demandStockRepository.findByInstanceIdAndSocialMaterializationId(committee.getId(), matId)
                .orElseGet(() -> {
                    DemandStock newStock = new DemandStock();
                    newStock.setInstance(committee);
                    newStock.setSocialMaterialization(mat);
                    newStock.setCreatedAt(java.time.LocalDateTime.now());
                    newStock.setStock(BigDecimal.ZERO);
                    newStock.setDemand(BigDecimal.ZERO);
                    return newStock;
                });
            
            // Atualizar demanda e manter o estoque existente
            BigDecimal currentStock = demandStock.getStock() != null ? demandStock.getStock() : BigDecimal.ZERO;
            demandStock.setDemand(demand);
            
            // Salvar o registro atualizado
            demandStockRepository.save(demandStock);
            logger.info("Atualizado estoque/demanda para materialização {}: estoque={}, demanda={}", 
                      matId, currentStock, demand);
            
            // Calcular o saldo (estoque - demanda)
            BigDecimal balance = currentStock.subtract(demand);
            
            // Adicionar ao resultado
            result.put(matId, DemandsAndGoalsResponseDTO.StockDemandDTO.builder()
                .stock(currentStock)
                .demand(demand)
                .balance(balance)
                .build());
        }
        
        return result;
    }
}
