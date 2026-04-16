package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.*;
import xyz.planecon.model.enums.InstanceType;

import java.util.List;

@Repository
public interface InstanceRepository extends JpaRepository<Instance, Integer> {
       
    /**
     * Encontra todas as instâncias de um determinado tipo
     * @return lista de instâncias do tipo especificado
     */
    List<Instance> findByType(String type);
    
    /**
     * Retorna todas as instâncias do tipo COMMITTEE
     * @return lista de comitês
     */
    default List<Instance> findAllCommittees() {
        return findByType(InstanceType.COMMITTEE);
    }
    
    /**
     * Busca instâncias por tipo
     * @param type Tipo de instância a ser filtrado
     * @return Lista de instâncias do tipo especificado
     */
    List<Instance> findByType(InstanceType type);
    
    /**
     * Busca instâncias por tipo com tratamento especial para campos nulos
     * @param type Tipo de instância a ser filtrado
     * @return Lista de instâncias do tipo especificado
     */
    @Query("SELECT i FROM Instance i WHERE i.type = :type")
    List<Instance> findAllByType(@Param("type") InstanceType type);

    @Query("SELECT i FROM Instance i WHERE i.type = :type AND UPPER(i.city) = UPPER(:city)")
    List<Instance> findAllByTypeAndCity(@Param("type") InstanceType type, @Param("city") String city);
    
    // Corrigir as consultas para usar os nomes corretos dos atributos
    @Query("SELECT i FROM Instance i WHERE i.popularCouncilAssociatedWithCommitteeOrWorker = :instance")
    List<Instance> findByPopularCouncilAssociatedWithCommitteeOrWorker(@Param("instance") Instance instance);
    
    @Query("SELECT i FROM Instance i WHERE i.popularCouncilAssociatedWithPopularCouncil = :instance")
    List<Instance> findByPopularCouncilAssociatedWithPopularCouncil(@Param("instance") Instance instance);
    
    // Método genérico que usa os nomes corretos dependendo do tipo da instância
    @Query("SELECT i FROM Instance i WHERE i.popularCouncilAssociatedWithCommitteeOrWorker = :instance OR i.popularCouncilAssociatedWithPopularCouncil = :instance")
    List<Instance> findByAnyAssociatedPopularCouncil(@Param("instance") Instance instance);
    
    /**
     * Encontra instâncias que têm uma determinada instância como conselho pai
     * (tanto em popular_council_associated_with_committee_or_worker quanto em popular_council_associated_with_popular_council)
     * 
     * @param parentId ID da instância pai (conselho)
     * @return Lista de instâncias filhas
     */
    @Query("SELECT i FROM Instance i WHERE i.popularCouncilAssociatedWithCommitteeOrWorker = :parentId OR i.popularCouncilAssociatedWithPopularCouncil = :parentId")
    List<Instance> findByParentCouncilId(@Param("parentId") Integer parentId);
    
    // Métodos para acessar entidades relacionadas
    @Query("SELECT wp FROM WorkersProposal wp WHERE wp.instance.id = :instanceId")
    List<WorkersProposal> findWorkerProposalsByInstance(@Param("instanceId") Integer instanceId);
    
    @Query("SELECT ds FROM DemandStock ds WHERE ds.instance.id = :instanceId")
    List<DemandStock> findDemandStocksByInstance(@Param("instanceId") Integer instanceId);
    
    @Query("SELECT dv FROM DemandVector dv WHERE dv.instance.id = :instanceId")
    List<DemandVector> findDemandVectorsByInstance(@Param("instanceId") Integer instanceId);
    
    @Query("SELECT COUNT(i) FROM Instance i WHERE i.type = :type AND i.socialMaterialization.id = :materializationId")
    Integer countByTypeAndSocialMaterializationId(InstanceType type, Integer materializationId);

    @Query("SELECT i FROM Instance i WHERE i.type = :type AND i.socialMaterialization.id = :materializationId")
    List<Instance> findByTypeAndSocialMaterializationId(@Param("type") InstanceType type, @Param("materializationId") Integer materializationId);
    
    /**
     * Busca uma instância por CNPJ
     * @param cnpj CNPJ da fábrica/empresa
     * @return Instância com o CNPJ especificado
     */
    java.util.Optional<Instance> findByCnpj(String cnpj);
    
    /**
     * Busca todas as instâncias de uma cidade pelo código IBGE
     * @param cityCode Código IBGE da cidade
     * @return Lista de instâncias da cidade
     */
    List<Instance> findByCityCode(String cityCode);
    
    /**
     * Busca todas as instâncias do tipo COMMITTEE de uma cidade
     * @param cityCode Código IBGE da cidade
     * @param type Tipo de instância (COMMITTEE)
     * @return Lista de fábricas/comitês da cidade
     */
    List<Instance> findByCityCodeAndType(String cityCode, InstanceType type);

    @Query("SELECT i FROM Instance i WHERE i.associatedWorkerCommittee.id = :committeeId")
    List<Instance> findByAssociatedWorkerCommitteeId(@Param("committeeId") Integer committeeId);

    /**
     * Retorna conselhos populares "globais" (sem city_code), com coordenadas definidas.
     * Estes são conselhos de nível estadual, nacional, continental ou internacional.
     */
    @Query("SELECT i FROM Instance i WHERE i.type = :type AND (i.cityCode IS NULL OR i.cityCode = '') AND i.latitude IS NOT NULL AND i.committeeName IS NOT NULL")
    List<Instance> findGlobalCouncils(@Param("type") InstanceType type);

    /**
     * Busca conselho estadual pelo nome do estado e tipo POPULARCOUNCIL (sem city_code).
     */
    @Query("SELECT i FROM Instance i WHERE i.type = :type AND i.state = :state AND (i.cityCode IS NULL OR i.cityCode = '')")
    List<Instance> findStateCouncilByStateAndType(@Param("state") String state, @Param("type") InstanceType type);
}
