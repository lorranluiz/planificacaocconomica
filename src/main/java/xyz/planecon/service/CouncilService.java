package xyz.planecon.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.planecon.dto.EstimatesResponseDTO;
import xyz.planecon.exception.ResourceNotFoundException;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.TechnologicalTensor;
import xyz.planecon.model.entity.DemandVector;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.repository.DemandVectorRepository;
import xyz.planecon.repository.InstanceRepository;
import xyz.planecon.repository.TechnologicalTensorRepository;
import xyz.planecon.repository.SocialMaterializationRepository;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CouncilService {

    private static final Logger logger = LoggerFactory.getLogger(CouncilService.class);

    @Autowired
    private InstanceRepository instanceRepository;

    @Autowired
    private TechnologicalTensorRepository tensorRepository;

    @Autowired
    private DemandVectorRepository demandVectorRepository;

    @Autowired
    private SocialMaterializationRepository materializationRepository;

    /**
     * Calcula estimativas de matriz tecnológica e vetor de demanda com base nas instâncias filhas
     *
     * @param councilId ID da instância do conselho
     * @return Objeto contendo a matriz tecnológica e vetor de demanda calculados
     * @throws ResourceNotFoundException se o conselho não for encontrado
     * @throws IllegalArgumentException se a instância não for um conselho ou não tiver instâncias filhas
     */
    @Transactional(readOnly = true)
    public EstimatesResponseDTO calculateEstimates(Integer councilId) {
        logger.info("Iniciando cálculo de estimativas para conselho ID: {}", councilId);

        // 1. Buscar instância do conselho
        Instance council = instanceRepository.findById(councilId)
                .orElseThrow(() -> new ResourceNotFoundException("Conselho", councilId));

        // 2. Verificar se é realmente um conselho
        if (council.getType() != InstanceType.COUNCIL) {
            throw new IllegalArgumentException("A instância não é um conselho: " + councilId);
        }

        // 3. Buscar todas as materializações sociais usadas pelas instâncias filhas
        Set<Integer> allMaterializationIds = findAllMaterializationIdsForCouncilChildren(councilId);

        if (allMaterializationIds.isEmpty()) {
            logger.warn("Nenhuma materialização encontrada para as instâncias filhas do conselho {}", councilId);
            throw new IllegalArgumentException("O conselho não possui materializações associadas às suas instâncias filhas");
        }

        logger.info("Encontradas {} materializações distintas entre as instâncias filhas", allMaterializationIds.size());

        // 4. Buscar todas as materializações de uma vez para evitar múltiplas consultas
        List<SocialMaterialization> allMaterializations = materializationRepository.findAllById(allMaterializationIds);

        // 5. Calcular matriz tecnológica média usando método otimizado
        EstimatesResponseDTO.TechnologicalMatrixDTO techMatrix = calculateAverageTechnologicalMatrixOptimized(councilId, allMaterializations);

        // 6. Calcular vetor de demanda médio usando método otimizado
        EstimatesResponseDTO.DemandVectorDTO demandVector = calculateAverageDemandVectorOptimized(councilId, allMaterializations);

        logger.info("Cálculo de estimativas concluído com sucesso para conselho ID: {}", councilId);

        // 7. Atualizar os dados do conselho com as novas médias
        updateCouncilWithNewEstimates(council, techMatrix, demandVector);

        // 8. Retornar resultado
        return EstimatesResponseDTO.builder()
                .technologicalMatrix(techMatrix)
                .demandVector(demandVector)
                .build();
    }

    /**
     * Encontra todos os IDs de materializações sociais usadas nas instâncias filhas de um conselho
     */
    private Set<Integer> findAllMaterializationIdsForCouncilChildren(Integer councilId) {
        Set<Integer> materializationIds = new HashSet<>();

        // 1. Coletar IDs das materializações dos tensores tecnológicos
        List<Object[]> tensorsData = tensorRepository
                .calculateAverageCoefficientsByMaterializationPairForCouncilChildren(councilId);

        for (Object[] row : tensorsData) {
            Integer inputId = ((Number) row[0]).intValue();
            Integer outputId = ((Number) row[1]).intValue();
            materializationIds.add(inputId);
            materializationIds.add(outputId);
        }

        // 2. Coletar IDs das materializações dos vetores de demanda
        List<Object[]> demandsData = demandVectorRepository
                .calculateAverageDemandsByMaterializationForCouncilChildren(councilId);

        for (Object[] row : demandsData) {
            Integer matId = ((Number) row[0]).intValue();
            materializationIds.add(matId);
        }

        return materializationIds;
    }

    /**
     * Calcula a matriz tecnológica média baseada nas instâncias filhas - versão otimizada
     */
    private EstimatesResponseDTO.TechnologicalMatrixDTO calculateAverageTechnologicalMatrixOptimized(
            Integer councilId,
            List<SocialMaterialization> allMaterializations) {

        // 1. Ordenar materializações para garantir consistência
        List<SocialMaterialization> sortedMaterializations = allMaterializations.stream()
                .sorted(Comparator.comparing(SocialMaterialization::getId))
                .collect(Collectors.toList());

        int matSize = sortedMaterializations.size();

        // 2. Mapear IDs de materialização para índices na matriz
        Map<Integer, Integer> matIdToIndex = new HashMap<>();
        for (int i = 0; i < sortedMaterializations.size(); i++) {
            matIdToIndex.put(sortedMaterializations.get(i).getId(), i);
        }

        // 3. Criar matriz de resultados e preenchê-la com zeros
        List<List<Double>> resultMatrix = new ArrayList<>();
        for (int i = 0; i < matSize; i++) {
            List<Double> row = new ArrayList<>();
            for (int j = 0; j < matSize; j++) {
                row.add(0.0);
            }
            resultMatrix.add(row);
        }

        // 4. Buscar médias pré-calculadas do banco de dados
        List<Object[]> tensorsData = tensorRepository
                .calculateAverageCoefficientsByMaterializationPairForCouncilChildren(councilId);

        // 5. Preencher a matriz com as médias calculadas
        for (Object[] row : tensorsData) {
            Integer inputId = ((Number) row[0]).intValue();
            Integer outputId = ((Number) row[1]).intValue();
            Double avgCoeff = ((Number) row[2]).doubleValue();

            // Verificar se ambas as materializações estão no mapa
            if (matIdToIndex.containsKey(inputId) && matIdToIndex.containsKey(outputId)) {
                int inputIndex = matIdToIndex.get(inputId);
                int outputIndex = matIdToIndex.get(outputId);

                // Atualizar valor na matriz
                resultMatrix.get(inputIndex).set(outputIndex, avgCoeff);
            }
        }

        // 6. Preparar listas de nomes e IDs para o frontend
        List<String> productNames = sortedMaterializations.stream()
                .map(SocialMaterialization::getName)
                .collect(Collectors.toList());

        List<Integer> productIds = sortedMaterializations.stream()
                .map(SocialMaterialization::getId)
                .collect(Collectors.toList());

        return EstimatesResponseDTO.TechnologicalMatrixDTO.builder()
                .matrix(resultMatrix)
                .productNames(productNames)
                .productIds(productIds)
                .build();
    }

    /**
     * Calcula o vetor de demanda médio baseado nas instâncias filhas - versão otimizada
     */
    private EstimatesResponseDTO.DemandVectorDTO calculateAverageDemandVectorOptimized(
            Integer councilId,
            List<SocialMaterialization> allMaterializations) {

        // 1. Ordenar materializações para garantir consistência
        List<SocialMaterialization> sortedMaterializations = allMaterializations.stream()
                .sorted(Comparator.comparing(SocialMaterialization::getId))
                .collect(Collectors.toList());

        // 2. Mapear IDs de materialização para índices no vetor
        Map<Integer, Integer> matIdToIndex = new HashMap<>();
        for (int i = 0; i < sortedMaterializations.size(); i++) {
            matIdToIndex.put(sortedMaterializations.get(i).getId(), i);
        }

        // 3. Criar vetor de resultados inicializado com zeros
        List<Double> resultVector = new ArrayList<>(Collections.nCopies(sortedMaterializations.size(), 0.0));

        // 4. Buscar médias pré-calculadas do banco de dados
        List<Object[]> demandsData = demandVectorRepository
                .calculateAverageDemandsByMaterializationForCouncilChildren(councilId);

        // 5. Preencher o vetor com as médias calculadas
        for (Object[] row : demandsData) {
            Integer matId = ((Number) row[0]).intValue();
            Double avgDemand = ((Number) row[1]).doubleValue();

            // Verificar se a materialização está no mapa
            if (matIdToIndex.containsKey(matId)) {
                int index = matIdToIndex.get(matId);
                resultVector.set(index, avgDemand);
            }
        }

        // 6. Preparar listas de nomes e IDs para o frontend
        List<String> productNames = sortedMaterializations.stream()
                .map(SocialMaterialization::getName)
                .collect(Collectors.toList());

        List<Integer> productIds = sortedMaterializations.stream()
                .map(SocialMaterialization::getId)
                .collect(Collectors.toList());

        return EstimatesResponseDTO.DemandVectorDTO.builder()
                .vector(resultVector)
                .productNames(productNames)
                .productIds(productIds)
                .build();
    }

    /**
     * Atualiza os dados do conselho com as novas estimativas calculadas
     */
    @Transactional
    private void updateCouncilWithNewEstimates(
            Instance council,
            EstimatesResponseDTO.TechnologicalMatrixDTO techMatrix,
            EstimatesResponseDTO.DemandVectorDTO demandVector) {

        try {
            // 1. Atualizar tensores tecnológicos do conselho
            updateCouncilTensors(council, techMatrix);

            // 2. Atualizar vetores de demanda do conselho
            updateCouncilDemands(council, demandVector);

            logger.info("Dados do conselho atualizados com as novas estimativas");
        } catch (Exception e) {
            logger.error("Erro ao atualizar dados do conselho com novas estimativas", e);
            throw e;
        }
    }

    /**
     * Atualiza os tensores tecnológicos do conselho com os novos valores
     */
    private void updateCouncilTensors(Instance council, EstimatesResponseDTO.TechnologicalMatrixDTO techMatrix) {
        List<List<Double>> matrix = techMatrix.getMatrix();
        List<Integer> productIds = techMatrix.getProductIds();

        for (int i = 0; i < matrix.size(); i++) {
            for (int j = 0; j < matrix.get(i).size(); j++) {
                Double value = matrix.get(i).get(j);
                // Só salvar se o valor for maior que zero
                if (value > 0) {
                    Integer inputMatId = productIds.get(i);
                    Integer outputMatId = productIds.get(j);

                    // Buscar materializações
                    SocialMaterialization inputMat = materializationRepository.findById(inputMatId)
                            .orElseThrow(() -> new IllegalArgumentException("Materialização de entrada não encontrada: " + inputMatId));

                    SocialMaterialization outputMat = materializationRepository.findById(outputMatId)
                            .orElseThrow(() -> new IllegalArgumentException("Materialização de saída não encontrada: " + outputMatId));

                    // Criar ID do tensor
                    TechnologicalTensor.TechnologicalTensorId tensorId =
                            new TechnologicalTensor.TechnologicalTensorId(council.getId(), inputMatId, outputMatId);

                    // Buscar tensor existente ou criar novo
                    TechnologicalTensor tensor = tensorRepository.findById(tensorId)
                            .orElseGet(() -> {
                                TechnologicalTensor newTensor = new TechnologicalTensor();
                                newTensor.setId(tensorId);
                                newTensor.setInstance(council);
                                newTensor.setInputSocialMaterialization(inputMat);
                                newTensor.setOutputSocialMaterialization(outputMat);
                                newTensor.setCreatedAt(java.time.LocalDateTime.now());
                                return newTensor;
                            });

                    // Atualizar coeficiente
                    tensor.setTechnicalCoefficientElementValue(BigDecimal.valueOf(value));

                    // Salvar
                    tensorRepository.save(tensor);
                }
            }
        }
    }

    /**
     * Atualiza os vetores de demanda do conselho com os novos valores
     */
    private void updateCouncilDemands(Instance council, EstimatesResponseDTO.DemandVectorDTO demandVector) {
        List<Double> vector = demandVector.getVector();
        List<Integer> productIds = demandVector.getProductIds();

        for (int i = 0; i < vector.size(); i++) {
            Double value = vector.get(i);
            // Mesmo para valor zero, criar/atualizar o vetor de demanda
            Integer matId = productIds.get(i);

            // Buscar materialização
            SocialMaterialization mat = materializationRepository.findById(matId)
                    .orElseThrow(() -> new IllegalArgumentException("Materialização não encontrada: " + matId));

            // Criar ID do vetor de demanda
            DemandVector.DemandVectorId demandId =
                    new DemandVector.DemandVectorId(council.getId(), matId);

            // Buscar vetor existente ou criar novo
            DemandVector demand = demandVectorRepository.findById(demandId)
                    .orElseGet(() -> {
                        DemandVector newDemand = new DemandVector();
                        newDemand.setId(demandId);
                        newDemand.setInstance(council);
                        newDemand.setSocialMaterialization(mat);
                        newDemand.setCreatedAt(java.time.LocalDateTime.now());
                        return newDemand;
                    });

            // Atualizar demanda
            demand.setDemand(BigDecimal.valueOf(value));

            // Salvar
            demandVectorRepository.save(demand);
        }
    }
}
