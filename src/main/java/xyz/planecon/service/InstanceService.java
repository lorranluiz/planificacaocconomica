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
        try {
            List<Instance> instances = getAllInstances();
            return instances.stream()
                    .map(instance -> {
                        try {
                            return convertToDto(instance);
                        } catch (Exception e) {
                            System.err.println("Erro ao converter instância ID " + instance.getId() + ": " + e.getMessage());
                            // Criar um DTO básico em caso de erro
                            InstanceDto basicDto = new InstanceDto();
                            basicDto.setId(instance.getId());
                            if (instance.getType() != null) {
                                basicDto.setType(instance.getType());
                            }
                            basicDto.setName("Instância #" + instance.getId() + " (conversão parcial)");
                            return basicDto;
                        }
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            System.err.println("Erro ao buscar todas as instâncias: " + e.getMessage());
            // Retornar lista vazia em caso de erro crítico
            return new ArrayList<>();
        }
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
        try {
            // Usar o método aprimorado que não filtra por campos nulos
            List<Instance> instances = instanceRepository.findAllByType(type);
            
            // Converter para DTOs de forma segura
            return instances.stream()
                    .map(instance -> {
                        try {
                            return convertToDto(instance);
                        } catch (Exception e) {
                            System.err.println("Erro ao converter instância ID " + instance.getId() + ": " + e.getMessage());
                            // Criar um DTO básico em caso de erro
                            InstanceDto basicDto = new InstanceDto();
                            basicDto.setId(instance.getId());
                            basicDto.setType(type);
                            basicDto.setName("Instância #" + instance.getId() + " (conversão parcial)");
                            return basicDto;
                        }
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            System.err.println("Erro ao buscar instâncias do tipo " + type + ": " + e.getMessage());
            // Retornar lista vazia em caso de erro crítico
            return new ArrayList<>();
        }
    }

    /**
     * Encontra uma instância worker específica por ID
     * @param id ID da instância worker
     * @return InstanceDto com dados do worker
     * @throws RuntimeException se a instância não for encontrada ou não for do tipo WORKER
     */
    public InstanceDto findWorkerInstanceById(Integer id) {
        try {
            Instance instance = instanceRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Instância não encontrada com ID: " + id));
            
            // Verificar se é uma instância do tipo WORKER
            if (instance.getType() != InstanceType.WORKER) {
                throw new RuntimeException("A instância com ID " + id + " não é do tipo WORKER");
            }
            
            return convertToDto(instance);
        } catch (RuntimeException re) {
            // Repassar exceções de regra de negócio
            throw re;
        } catch (Exception e) {
            // Converter outras exceções para RuntimeException
            throw new RuntimeException("Erro ao buscar worker: " + e.getMessage(), e);
        }
    }

    private InstanceDto convertToDto(Instance instance) {
        try {
            InstanceDto dto = new InstanceDto();
            dto.setId(instance.getId());
            dto.setType(instance.getType());
            
            // Configuração robusta para o nome da instância baseada no tipo
            if (instance.getType() == InstanceType.WORKER) {
                // Para WORKER, sempre criar um nome padrão com o ID
                dto.setName("Trabalhador #" + instance.getId());
            } else if (instance.getCommitteeName() != null) {
                dto.setName(instance.getCommitteeName());
            } else {
                dto.setName("Instância #" + instance.getId());
            }
            
            dto.setCreatedAt(instance.getCreatedAt());
            dto.setCommitteeName(instance.getCommitteeName());
            dto.setWorkerEffectiveLimit(instance.getWorkerEffectiveLimit());
            
            // Conversão segura para estimatedIndividualParticipationInSocialWork
            try {
                if (instance.getEstimatedIndividualParticipationInSocialWork() != null) {
                    dto.setEstimatedIndividualParticipationInSocialWork(
                        instance.getEstimatedIndividualParticipationInSocialWork().doubleValue());
                }
            } catch (Exception e) {
                // Log o erro mas não falhe na conversão
                System.err.println("Erro ao converter estimatedIndividualParticipationInSocialWork: " + e.getMessage());
            }
            
            // Conversão segura para hoursAtElectronicPoint
            try {
                if (instance.getHoursAtElectronicPoint() != null) {
                    dto.setHoursAtElectronicPoint(
                        instance.getHoursAtElectronicPoint().doubleValue());
                }
            } catch (Exception e) {
                // Log o erro mas não falhe na conversão
                System.err.println("Erro ao converter hoursAtElectronicPoint: " + e.getMessage());
            }
            
            // Conversão segura para popularCouncilAssociatedWithCommitteeOrWorker
            if (instance.getPopularCouncilAssociatedWithCommitteeOrWorker() != null) {
                try {
                    dto.setPopularCouncilAssociatedWithCommitteeOrWorker(
                        instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getId());
                    
                    // Também definir como parentInstanceId para compatibilidade com outros controladores
                    dto.setParentInstanceId(instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getId());
                    dto.setParentInstanceName(instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getCommitteeName());
                } catch (Exception e) {
                    System.err.println("Erro ao obter ID do conselho associado: " + e.getMessage());
                }
            }
            
            // Tratamento robusto para idAssociatedWorkerResidentsAssociation
            try {
                if (instance.getIdAssociatedWorkerResidentsAssociation() instanceof Instance) {
                    Instance assocInstance = (Instance) instance.getIdAssociatedWorkerResidentsAssociation();
                    dto.setIdAssociatedWorkerResidentsAssociation(assocInstance.getId());
                } else if (instance.getIdAssociatedWorkerResidentsAssociation() != null) {
                    // Se não for Instance, mas for outro objeto, tentar converter para string e depois para Integer
                    try {
                        String stringValue = instance.getIdAssociatedWorkerResidentsAssociation().toString();
                        if (stringValue.matches("\\d+")) {
                            dto.setIdAssociatedWorkerResidentsAssociation(Integer.valueOf(stringValue));
                        }
                    } catch (Exception ignored) {
                        // Ignorar erros de conversão, deixando o campo como null
                    }
                }
            } catch (Exception e) {
                System.err.println("Erro ao processar idAssociatedWorkerResidentsAssociation: " + e.getMessage());
                // Não propagar a exceção, apenas deixar o campo como null
            }
            
            return dto;
        } catch (Exception e) {
            // Em caso de erro crítico, criar um DTO mínimo que ainda permita exibir a instância
            System.err.println("Erro crítico ao converter Instance para DTO: " + e.getMessage());
            InstanceDto fallbackDto = new InstanceDto();
            fallbackDto.setId(instance.getId());
            if (instance.getType() != null) {
                fallbackDto.setType(instance.getType());
            }
            fallbackDto.setName("Instância #" + instance.getId() + " (erro)");
            return fallbackDto;
        }
    }
}
