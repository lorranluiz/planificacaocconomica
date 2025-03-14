package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.repository.InstanceRepository;
import xyz.planecon.repository.SocialMaterializationRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@RestController
@RequestMapping("/api/instances")
public class InstanceController {

	@Autowired
	private InstanceRepository instanceRepository;

	@Autowired
	private SocialMaterializationRepository socialMaterializationRepository;

	// Modificação no método getAllInstances para filtrar instâncias WORKER
	@GetMapping
	public ResponseEntity<?> getAllInstances() {
		try {
			// Correção para o Erro 1: Convertendo Iterable para List
			Iterable<Instance> instancesIterable = instanceRepository.findAll();
			List<Instance> instances = StreamSupport
				.stream(instancesIterable.spliterator(), false)
				// Filtrar instâncias do tipo WORKER, pois elas representam usuários e não devem aparecer na listagem geral
				.filter(instance -> instance.getType() != InstanceType.WORKER)
				.collect(Collectors.toList());
				
			List<Map<String, Object>> result = instances.stream()
					.map(this::convertToDto)
					.collect(Collectors.toList());

			return ResponseEntity.ok(result);
		} catch (Exception e) {
			e.printStackTrace();
			Map<String, String> errorResponse = new HashMap<>();
			errorResponse.put("message", "Erro ao buscar instâncias: " + e.getMessage());
			return ResponseEntity.status(500).body(errorResponse);
		}
	}

	// Modificação no método getInstanceTypes para não listar WORKER como opção
	@GetMapping("/types")
	public ResponseEntity<?> getInstanceTypes() {
		try {
			// Filtrar os tipos de instâncias, excluindo WORKER que é associado a usuários
			List<Map<String, Object>> types = Arrays.stream(InstanceType.values())
					.filter(type -> type != InstanceType.WORKER) // Remover WORKER das opções disponíveis
					.map(type -> {
						Map<String, Object> typeInfo = new HashMap<>();
						typeInfo.put("name", type.name());
						typeInfo.put("description", getInstanceTypeDescription(type));
						return typeInfo;
					})
					.collect(Collectors.toList());

			return ResponseEntity.ok(types);
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.status(500).body(Map.of("message", "Erro ao buscar tipos de instância: " + e.getMessage()));
		}
	}

	@GetMapping("/{id}")
	public ResponseEntity<?> getInstanceById(@PathVariable Integer id) {
		try {
			Optional<Instance> instanceOpt = instanceRepository.findById(id);
			if (instanceOpt.isEmpty()) {
				return ResponseEntity.notFound().build();
			}
			
			return ResponseEntity.ok(convertToDto(instanceOpt.get()));
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.status(500).body(Map.of("message", "Erro ao buscar instância: " + e.getMessage()));
		}
	}

	@GetMapping("/by-type/{type}")
	public ResponseEntity<?> getInstancesByType(@PathVariable String type) {
		try {
			InstanceType instanceType = InstanceType.valueOf(type.toUpperCase());
			// Correção para possível erro de conversão Iterable para List
			List<Instance> instances = StreamSupport
				.stream(instanceRepository.findByType(instanceType).spliterator(), false)
				.collect(Collectors.toList());
				
			List<Map<String, Object>> result = instances.stream()
					.map(this::convertToDto)
					.collect(Collectors.toList());

			return ResponseEntity.ok(result);
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(Map.of("message", "Tipo de instância inválido: " + type));
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.status(500).body(Map.of("message", "Erro ao buscar instâncias por tipo: " + e.getMessage()));
		}
	}

	// Modificação no método createInstance para impedir a criação direta de instâncias WORKER
	@PostMapping
	public ResponseEntity<?> createInstance(@RequestBody Map<String, Object> payload) {
		try {
			// Extrair tipo da instância
			if (!payload.containsKey("type")) {
				return ResponseEntity.badRequest().body(Map.of("message", "O tipo de instância é obrigatório"));
			}

			String typeStr = (String) payload.get("type");
			InstanceType type;
			try {
				type = InstanceType.valueOf(typeStr.toUpperCase());
			} catch (IllegalArgumentException e) {
				return ResponseEntity.badRequest().body(Map.of("message", "Tipo de instância inválido: " + typeStr));
			}
			
			// Impedir a criação direta de instâncias WORKER
			if (type == InstanceType.WORKER) {
				return ResponseEntity.badRequest().body(Map.of(
					"message", "Instâncias do tipo WORKER são criadas automaticamente ao registrar usuários e não podem ser criadas diretamente."
				));
			}

			// Restante do método permanece igual
			// ...

			// Criar a instância base
			Instance instance = new Instance();
			instance.setType(type);
			instance.setCreatedAt(LocalDateTime.now());

			// Configurar campos comuns
			if (payload.containsKey("committeeName")) {
				instance.setCommitteeName((String) payload.get("committeeName"));
			}

			// Configurar campos relacionados à materialização social
			if (payload.containsKey("socialMaterializationId")) {
				Integer socialMaterializationId = (Integer) payload.get("socialMaterializationId");
				Optional<SocialMaterialization> socMatOpt = socialMaterializationRepository.findById(socialMaterializationId);
				
				if (socMatOpt.isEmpty()) {
					return ResponseEntity.badRequest().body(Map.of(
						"message", "Materialização social não encontrada com ID: " + socialMaterializationId
					));
				}
				
				instance.setSocialMaterialization(socMatOpt.get());
			}

			// Configurar campos relacionados a quantidades (para WORKER principalmente)
			if (payload.containsKey("producedQuantity")) {
				String producedQty = payload.get("producedQuantity").toString();
				instance.setProducedQuantity(new BigDecimal(producedQty));
			}

			if (payload.containsKey("targetQuantity")) {
				String targetQty = payload.get("targetQuantity").toString();
				instance.setTargetQuantity(new BigDecimal(targetQty));
			}

			// Configurar limite efetivo de trabalhadores (para COMMITTEE e COUNCIL)
			if (payload.containsKey("workerEffectiveLimit")) {
				instance.setWorkerEffectiveLimit((Integer) payload.get("workerEffectiveLimit"));
			}

			// Configurar trabalho social total (para COMMITTEE e COUNCIL)
			if (payload.containsKey("totalSocialWorkOfThisJurisdiction")) {
				instance.setTotalSocialWorkOfThisJurisdiction((Integer) payload.get("totalSocialWorkOfThisJurisdiction"));
			}

			// Associações com outras instâncias
			if (payload.containsKey("popularCouncilAssociatedWithCommitteeOrWorkerId")) {
				Integer councilId = (Integer) payload.get("popularCouncilAssociatedWithCommitteeOrWorkerId");
				Optional<Instance> councilOpt = instanceRepository.findById(councilId);
				
				if (councilOpt.isEmpty()) {
					return ResponseEntity.badRequest().body(Map.of(
						"message", "Conselho popular não encontrado com ID: " + councilId
					));
				}
				
				instance.setPopularCouncilAssociatedWithCommitteeOrWorker(councilOpt.get());
			}

			if (payload.containsKey("popularCouncilAssociatedWithPopularCouncilId")) {
				Integer councilId = (Integer) payload.get("popularCouncilAssociatedWithPopularCouncilId");
				Optional<Instance> councilOpt = instanceRepository.findById(councilId);
				
				if (councilOpt.isEmpty()) {
					return ResponseEntity.badRequest().body(Map.of(
						"message", "Conselho popular associado não encontrado com ID: " + councilId
					));
				}
				
				instance.setPopularCouncilAssociatedWithPopularCouncil(councilOpt.get());
			}

			if (payload.containsKey("associatedWorkerCommitteeId")) {
				Integer committeeId = (Integer) payload.get("associatedWorkerCommitteeId");
				Optional<Instance> committeeOpt = instanceRepository.findById(committeeId);
				
				if (committeeOpt.isEmpty()) {
					return ResponseEntity.badRequest().body(Map.of(
						"message", "Comitê de trabalhadores não encontrado com ID: " + committeeId
					));
				}
				
				instance.setAssociatedWorkerCommittee(committeeOpt.get());
			}

			if (payload.containsKey("associatedWorkerResidentsAssociationId")) {
				Integer assocId = (Integer) payload.get("associatedWorkerResidentsAssociationId");
				Optional<Instance> assocOpt = instanceRepository.findById(assocId);
				
				if (assocOpt.isEmpty()) {
					return ResponseEntity.badRequest().body(Map.of(
						"message", "Associação de residentes não encontrada com ID: " + assocId
					));
				}
				
				instance.setAssociatedWorkerResidentsAssociation(assocOpt.get());
			}

			// Adicione este trecho no método createInstance, dentro do bloco do case 'COMMITTEE':
			switch (type) {
				// Outros cases...
				
				case COMMITTEE:
					// Validar campos obrigatórios para COMMITTEE
					final Integer councilId = (Integer) payload.get("popularCouncilAssociatedWithCommitteeOrWorkerId");
					final Integer socialMatId = (Integer) payload.get("socialMaterializationId");
					final Integer totalSocialWork = (Integer) payload.get("totalSocialWorkOfThisJurisdiction");
					final Object producedQty = payload.get("producedQuantity");
					final Object targetQty = payload.get("targetQuantity");
					
					// Verificar campos obrigatórios
					if (councilId == null || socialMatId == null || 
						totalSocialWork == null || producedQty == null || targetQty == null) {
						return ResponseEntity.badRequest().body(Map.of(
							"message", "Para comitês, todos os campos marcados com * são obrigatórios"
						));
					}
					
					// Converter para valores numéricos
					BigDecimal produced = new BigDecimal(producedQty.toString());
					BigDecimal target = new BigDecimal(targetQty.toString());
					
					// Validar que meta > produzido
					if (target.compareTo(produced) <= 0) {
						return ResponseEntity.badRequest().body(Map.of(
							"message", "A quantidade meta deve ser maior que a quantidade produzida"
						));
					}
					
					// Buscar o conselho - CORREÇÃO AQUI
					Optional<Instance> councilOpt = instanceRepository.findById(councilId);
					// Corrija esta linha: use comparação de enum em vez de string
					if (councilOpt.isEmpty() || councilOpt.get().getType() != InstanceType.COUNCIL) {
						return ResponseEntity.badRequest().body(Map.of(
							"message", "Conselho popular não encontrado ou inválido com ID: " + councilId
						));
					}
					
					// Buscar a materialização social
					Optional<SocialMaterialization> matOpt = socialMaterializationRepository.findById(socialMatId);
					if (matOpt.isEmpty()) {
						return ResponseEntity.badRequest().body(Map.of(
							"message", "Materialização social não encontrada com ID: " + socialMatId
						));
					}
					
					// Configurar todos os campos obrigatórios
					instance.setPopularCouncilAssociatedWithCommitteeOrWorker(councilOpt.get());
					instance.setTotalSocialWorkOfThisJurisdiction(totalSocialWork);
					instance.setSocialMaterialization(matOpt.get());
					instance.setProducedQuantity(produced);
					instance.setTargetQuantity(target);
					
					// Campos opcionais para COMMITTEE
					if (payload.containsKey("workerEffectiveLimit")) {
						instance.setWorkerEffectiveLimit((Integer) payload.get("workerEffectiveLimit"));
					}
					break;
					
				// Outros cases...
			}

			// Salvar a instância
			Instance savedInstance = instanceRepository.save(instance);
			return ResponseEntity.ok(convertToDto(savedInstance));
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.status(500).body(Map.of("message", "Erro ao criar instância: " + e.getMessage()));
		}
	}

	@GetMapping("/councils")
	public ResponseEntity<?> getAllCouncils() {
		try {
			// Correção para possível erro de conversão Iterable para List
			List<Instance> councils = StreamSupport
				.stream(instanceRepository.findByType(InstanceType.COUNCIL).spliterator(), false)
				.collect(Collectors.toList());
				
			List<Map<String, Object>> result = councils.stream()
					.map(this::convertToDto)
					.collect(Collectors.toList());
			
			return ResponseEntity.ok(result);
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.status(500).body(Map.of("message", "Erro ao buscar conselhos: " + e.getMessage()));
		}
	}

	@GetMapping("/committees")
	public ResponseEntity<?> getAllCommittees() {
		try {
			// Correção para possível erro de conversão Iterable para List
			List<Instance> committees = StreamSupport
				.stream(instanceRepository.findByType(InstanceType.COMMITTEE).spliterator(), false)
				.collect(Collectors.toList());
				
			List<Map<String, Object>> result = committees.stream()
					.map(this::convertToDto)
					.collect(Collectors.toList());
			
			return ResponseEntity.ok(result);
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.status(500).body(Map.of("message", "Erro ao buscar comitês: " + e.getMessage()));
		}
	}

	// O método getAllWorkers é mantido para fins administrativos/internos
	// mas é importante entender que esta API não deve ser exposta ao front-end público
	/**
	 * Retorna todas as instâncias do tipo WORKER.
	 * 
	 * NOTA IMPORTANTE: Este endpoint é destinado apenas para uso administrativo/interno.
	 * Instâncias WORKER representam usuários e não devem ser mostradas na interface principal,
	 * pois são criadas automaticamente associadas aos usuários.
	 */
	@GetMapping("/workers")
	public ResponseEntity<?> getAllWorkers() {
		try {
			// Correção para possível erro de conversão Iterable para List
			List<Instance> workers = StreamSupport
				.stream(instanceRepository.findByType(InstanceType.WORKER).spliterator(), false)
				.collect(Collectors.toList());
				
			List<Map<String, Object>> result = workers.stream()
					.map(this::convertToDto)
					.collect(Collectors.toList());
			
			return ResponseEntity.ok(result);
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.status(500).body(Map.of("message", "Erro ao buscar trabalhadores: " + e.getMessage()));
		}
	}

	// Converter a entidade para um DTO seguro sem referências circulares
	private Map<String, Object> convertToDto(Instance instance) {
		Map<String, Object> dto = new HashMap<>();
		dto.put("id", instance.getId());
		dto.put("type", instance.getType().toString());
		dto.put("typeName", getInstanceTypeDescription(instance.getType()));
		dto.put("createdAt", instance.getCreatedAt());
		
		if (instance.getCommitteeName() != null) {
			dto.put("committeeName", instance.getCommitteeName());
		}
		
		if (instance.getWorkerEffectiveLimit() != null) {
			dto.put("workerEffectiveLimit", instance.getWorkerEffectiveLimit());
		}
		
		if (instance.getProducedQuantity() != null) {
			dto.put("producedQuantity", instance.getProducedQuantity());
		}
		
		if (instance.getTargetQuantity() != null) {
			dto.put("targetQuantity", instance.getTargetQuantity());
		}
		
		if (instance.getTotalSocialWorkOfThisJurisdiction() != null) {
			dto.put("totalSocialWorkOfThisJurisdiction", instance.getTotalSocialWorkOfThisJurisdiction());
		}
		
		// Adicionar referência à materialização social
		if (instance.getSocialMaterialization() != null) {
			Map<String, Object> matInfo = new HashMap<>();
			matInfo.put("id", instance.getSocialMaterialization().getId());
			matInfo.put("name", instance.getSocialMaterialization().getName());
			matInfo.put("type", instance.getSocialMaterialization().getType().toString());
			dto.put("socialMaterialization", matInfo);
		}
		
		// Adicionar referências para outras instâncias (sem recursão)
		if (instance.getPopularCouncilAssociatedWithCommitteeOrWorker() != null) {
			Map<String, Object> council = new HashMap<>();
			council.put("id", instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getId());
			council.put("type", instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getType().toString());
			council.put("committeeName", instance.getPopularCouncilAssociatedWithCommitteeOrWorker().getCommitteeName());
			dto.put("popularCouncilAssociatedWithCommitteeOrWorker", council);
		}
		
		if (instance.getPopularCouncilAssociatedWithPopularCouncil() != null) {
			Map<String, Object> council = new HashMap<>();
			council.put("id", instance.getPopularCouncilAssociatedWithPopularCouncil().getId());
			council.put("type", instance.getPopularCouncilAssociatedWithPopularCouncil().getType().toString());
			council.put("committeeName", instance.getPopularCouncilAssociatedWithPopularCouncil().getCommitteeName());
			dto.put("popularCouncilAssociatedWithPopularCouncil", council);
		}
		
		if (instance.getAssociatedWorkerCommittee() != null) {
			Map<String, Object> committee = new HashMap<>();
			committee.put("id", instance.getAssociatedWorkerCommittee().getId());
			committee.put("type", instance.getAssociatedWorkerCommittee().getType().toString());
			committee.put("committeeName", instance.getAssociatedWorkerCommittee().getCommitteeName());
			dto.put("associatedWorkerCommittee", committee);
		}
		
		if (instance.getAssociatedWorkerResidentsAssociation() != null) {
			Map<String, Object> association = new HashMap<>();
			association.put("id", instance.getAssociatedWorkerResidentsAssociation().getId());
			association.put("type", instance.getAssociatedWorkerResidentsAssociation().getType().toString());
				association.put("committeeName", instance.getAssociatedWorkerResidentsAssociation().getCommitteeName());
			dto.put("associatedWorkerResidentsAssociation", association);
		}
		
		return dto;
	}
	
	private String getInstanceTypeDescription(InstanceType type) {
		// Usar if-else em vez de switch-case para evitar problemas
		if (type == InstanceType.COUNCIL) {
			return "Conselho Popular";
		} else if (type == InstanceType.COMMITTEE) {
			return "Comitê de Trabalhadores";
		} else if (type == InstanceType.WORKER) {
			return "Trabalhador";
		} else {
			return type.toString();
		}
	}
}

/**
 * Controller para gerenciamento de instâncias no sistema.
 * 
 * IMPORTANTE: Instâncias do tipo WORKER são tratadas de forma especial neste sistema.
 * Elas representam usuários registrados e são criadas automaticamente quando um usuário
 * é registrado no sistema. Por isso:
 * 
 * 1. Instâncias WORKER não aparecem na listagem geral de instâncias
 * 2. Não é possível criar instâncias WORKER diretamente pela API
 * 3. Os tipos de instâncias disponíveis para criação excluem o tipo WORKER
 * 
 * Endpoints como /workers são mantidos apenas para uso administrativo/interno
 * e não devem ser expostos na interface de usuário principal.
 */
