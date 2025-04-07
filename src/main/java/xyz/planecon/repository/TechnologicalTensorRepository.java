package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.TechnologicalTensor;
import xyz.planecon.model.entity.TechnologicalTensor.TechnologicalTensorId;

import jakarta.persistence.QueryHint;
import java.math.BigDecimal;
import java.util.List;

@Repository
public interface TechnologicalTensorRepository extends JpaRepository<TechnologicalTensor, TechnologicalTensorId> {

    List<TechnologicalTensor> findByInstance(Instance instance);

    @Query("SELECT t FROM TechnologicalTensor t WHERE t.id.instanceId = :instanceId")
    @QueryHints({@QueryHint(name = "org.hibernate.cacheable", value = "true")})
    List<TechnologicalTensor> findByInstanceId(@Param("instanceId") Integer instanceId);

    @Query("SELECT t FROM TechnologicalTensor t WHERE t.id.instanceId = :instanceId AND " +
           "(t.id.inputSocialMaterializationId = :materializationId OR " +
           "t.id.outputSocialMaterializationId = :materializationId)")
    @QueryHints({@QueryHint(name = "org.hibernate.cacheable", value = "true")})
    List<TechnologicalTensor> findByInstanceIdAndMaterializationId(
            @Param("instanceId") Integer instanceId,
            @Param("materializationId") Integer materializationId);

    @Query("SELECT t FROM TechnologicalTensor t WHERE t.id.instanceId = :instanceId AND t.id.inputSocialMaterializationId = :materializationId")
    List<TechnologicalTensor> findByInstanceIdAndInputMaterializationId(
        @Param("instanceId") Integer instanceId, 
        @Param("materializationId") Integer materializationId
    );

    @Query("SELECT t FROM TechnologicalTensor t WHERE t.id.instanceId = :instanceId AND t.id.outputSocialMaterializationId = :materializationId")
    List<TechnologicalTensor> findByInstanceIdAndOutputMaterializationId(
        @Param("instanceId") Integer instanceId, 
        @Param("materializationId") Integer materializationId
    );

    @Query(value = "SELECT tt.id_instance, tt.id_production_input, tt.id_social_materialization, " +
           "tt.technical_coefficient_element_value, tt.created_at FROM technological_tensor tt " +
           "WHERE tt.id_instance = :instanceId", nativeQuery = true)
    List<Object[]> findMatrixDataByInstanceId(@Param("instanceId") Integer instanceId);

    List<TechnologicalTensor> findByInputSocialMaterialization_IdAndOutputSocialMaterialization_Id(
        Integer inputMaterializationId,
        Integer outputMaterializationId
    );

    @Modifying
    @Transactional
    @Query("DELETE FROM TechnologicalTensor t WHERE t.instance.id = :instanceId AND " +
           "(t.inputSocialMaterialization.id = :materializationId OR " +
           "t.outputSocialMaterialization.id = :materializationId)")
    int deleteByInstanceIdAndMaterializationId(Integer instanceId, Integer materializationId);

    /**
     * Busca todos os tensores tecnológicos das instâncias filhas de um conselho
     * Inclui tanto comitês e trabalhadores quanto conselhos filhos
     * 
     * @param councilId ID do conselho pai
     * @return Lista de tensores tecnológicos de todas as instâncias filhas
     */
    @Query(value = "SELECT t.* FROM technological_tensor t " +
           "JOIN instance i ON t.instance_id = i.id " +
           "WHERE i.popular_council_associated_with_committee_or_worker = :councilId " +
           "OR i.popular_council_associated_with_popular_council = :councilId", 
           nativeQuery = true)
    List<TechnologicalTensor> findAllByParentCouncilId(Integer councilId);

    /**
     * Calcula a média dos coeficientes técnicos para cada par de materializações (input/output)
     * das instâncias filhas de um conselho
     * 
     * @param councilId ID do conselho pai
     * @return Lista de objetos contendo IDs de materializações de entrada e saída e a média do coeficiente
     */
    @Query(value = "SELECT t.id_production_input as inputMaterializationId, " +
           "t.output_social_materialization_id as outputMaterializationId, " +
           "AVG(t.technical_coefficient_element_value) as averageCoefficient " +
           "FROM technological_tensor t " +
           "JOIN instance i ON t.id_instance = i.id " + // Corrigido: instance_id -> id_instance
           "WHERE i.popular_council_associated_with_committee_or_worker = :councilId " +
           "OR i.popular_council_associated_with_popular_council = :councilId " +
           "GROUP BY t.id_production_input, t.output_social_materialization_id", 
           nativeQuery = true)
    List<Object[]> calculateAverageCoefficientsByMaterializationPairForCouncilChildren(@Param("councilId") Integer councilId);
}
