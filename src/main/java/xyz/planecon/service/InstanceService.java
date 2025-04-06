package xyz.planecon.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.dto.InstanceDto;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.repository.InstanceRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@Service
public class InstanceService {

    private final InstanceRepository instanceRepository;

    @Autowired
    public InstanceService(InstanceRepository instanceRepository) {
        this.instanceRepository = instanceRepository;
    }

    /**
     * Retorna todas as instâncias convertidas para DTO
     * @return Lista com todas as instâncias
     */
    public List<InstanceDto> findAll() {
        List<Instance> instances = getAllInstances();
        return instances.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public List<Instance> getAllInstances() {
        // Converter Iterable para List usando StreamSupport
        return StreamSupport.stream(instanceRepository.findAll().spliterator(), false)
                .collect(Collectors.toList());
    }

    public Optional<Instance> getInstanceById(Integer id) {
        return instanceRepository.findById(id);
    }

    public Instance saveInstance(Instance instance) {
        return instanceRepository.save(instance);
    }

    /**
     * Encontra todas as instâncias de um tipo específico
     * @param type Tipo de instância
     * @return Lista de instâncias do tipo especificado
     */
    public List<InstanceDto> findAllByType(InstanceType type) {
        List<Instance> instances = instanceRepository.findByType(type);
        return instances.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Encontra uma instância worker específica por ID
     * @param id ID da instância worker
     * @return InstanceDto com dados do worker
     * @throws RuntimeException se a instância não for encontrada ou não for do tipo WORKER
     */
    public InstanceDto findWorkerInstanceById(Integer id) {
        Instance instance = instanceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Instância não encontrada com ID: " + id));
        
        // Verificar se é uma instância do tipo WORKER
        if (instance.getType() != InstanceType.WORKER) {
            throw new RuntimeException("A instância com ID " + id + " não é do tipo WORKER");
        }
        
        return convertToDto(instance);
    }

    private InstanceDto convertToDto(Instance instance) {
        InstanceDto dto = new InstanceDto();
        dto.setId(instance.getId());
        dto.setType(instance.getType());
        
        // Name está com compatibilidade cruzada com committeeName
        if (instance.getCommitteeName() != null) {
            dto.setName(instance.getCommitteeName());
        }
        
        dto.setCreatedAt(instance.getCreatedAt());
        dto.setCommitteeName(instance.getCommitteeName());
        dto.setWorkerEffectiveLimit(instance.getWorkerEffectiveLimit());
        
        if (instance.getEstimatedIndividualParticipationInSocialWork() != null) {
            dto.setEstimatedIndividualParticipationInSocialWork(
                instance.getEstimatedIndividualParticipationInSocialWork().doubleValue());
        }
        
        if (instance.getHoursAtElectronicPoint() != null) {
            dto.setHoursAtElectronicPoint(
                instance.getHoursAtElectronicPoint().doubleValue());
        }
        
        if (instance.getPopularCouncilAssociatedWithCommitteeOrWorker() != null) {
            dto.setPopularCouncilAssociatedWithCommitteeOrWorker(
                instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getId());
        }
        
        // Corrigindo o acesso ao ID da associação de residentes
        // Verificamos se é um Integer diretamente ou se precisamos acessar uma entidade relacionada
    
        // Tentativa 1: Assumindo que é um objeto Instance que contém o ID
        Instance residentAssociation = instance.getIdAssociatedWorkerResidentsAssociation();
        Integer residentAssociationId = residentAssociation != null ? residentAssociation.getId() : null;
        dto.setIdAssociatedWorkerResidentsAssociation(residentAssociationId);
                
        return dto;
    }
}
