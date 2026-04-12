package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import xyz.planecon.dto.FactoryResponse;
import xyz.planecon.model.entity.*;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.repository.*;
import xyz.planecon.util.BrazilianStateUtil;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/factories")
@CrossOrigin(origins = "*")
public class FactoryController {
    
    private static final Logger logger = LoggerFactory.getLogger(FactoryController.class);
    
    @Autowired
    private InstanceRepository instanceRepository;
    
    @Autowired
    private CityRepository cityRepository;
    
    @Autowired
    private TechnologicalTensorRepository technologicalTensorRepository;
    
    @Autowired
    private DemandVectorRepository demandVectorRepository;
    
    @Autowired
    private DemandStockRepository demandStockRepository;
    
    /**
     * Busca ou cria uma cidade pelo código IBGE
     * @param code Código IBGE da cidade
     * @param name Nome da cidade
     * @return Cidade encontrada ou criada
     */
    @PostMapping("/cities/find-or-create")
    @Transactional
    public ResponseEntity<?> findOrCreateCity(@RequestParam String code, @RequestParam String name) {
        try {
            logger.info("Buscando ou criando cidade: {} (código: {})", name, code);
            
            Optional<City> cityOpt = cityRepository.findByCode(code);
            City city;
            
            if (cityOpt.isPresent()) {
                city = cityOpt.get();
                logger.info("Cidade encontrada: {}", city.getName());
            } else {
                city = new City();
                city.setCode(code);
                city.setName(name);
                city.setCreatedAt(LocalDateTime.now());
                city = cityRepository.save(city);
                logger.info("Cidade criada: {}", city.getName());
            }
            
            return ResponseEntity.ok(city);
        } catch (Exception e) {
            logger.error("Erro ao buscar/criar cidade", e);
            return ResponseEntity.internalServerError().body("Erro: " + e.getMessage());
        }
    }
    
    /**
     * Lista todas as fábricas de uma cidade
     * @param cityCode Código IBGE da cidade
     * @return Lista de fábricas da cidade
     */
    @GetMapping("/by-city/{cityCode}")
    public ResponseEntity<?> getFactoriesByCity(@PathVariable String cityCode) {
        try {
            logger.info("Buscando fábricas da cidade: {}", cityCode);
            
            List<Instance> factories = instanceRepository.findByCityCodeAndType(cityCode, InstanceType.COMMITTEE);
            logger.info("Encontradas {} fábricas", factories.size());
            
            // Criar DTOs simplificados para não enviar dados desnecessários
            List<Map<String, Object>> result = new ArrayList<>();
            for (Instance factory : factories) {
                Map<String, Object> dto = new HashMap<>();
                dto.put("id", factory.getId());
                dto.put("name", factory.getCommitteeName());
                dto.put("cnpj", factory.getCnpj());
                dto.put("city", factory.getCity());
                dto.put("cityCode", factory.getCityCode());
                result.add(dto);
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Erro ao buscar fábricas por cidade", e);
            return ResponseEntity.internalServerError().body("Erro: " + e.getMessage());
        }
    }
    
    /**
     * Busca ou cria uma fábrica pelo CNPJ
     * Se não existir, cria uma cópia dos dados de PLACEHOLDER_INSTANCE
     * 
     * @param cnpj CNPJ da fábrica
     * @param cityCode Código IBGE da cidade (opcional se cityName fornecido)
     * @param cityName Nome da cidade (opcional se cityCode fornecido)
     * @param name Nome da fábrica (opcional)
     * @return Fábrica encontrada ou criada
     */
    @PostMapping("/find-or-create")
    @Transactional
    public ResponseEntity<?> findOrCreateFactory(
            @RequestParam String cnpj, 
            @RequestParam(required = false) String cityCode,
            @RequestParam(required = false) String cityName,
            @RequestParam(required = false) String name) {
        try {
            logger.info("Buscando ou criando fábrica com CNPJ: {}", cnpj);
            logger.info("  cityCode: {}, cityName: {}", cityCode, cityName);
            
            // Buscar fábrica existente
            Optional<Instance> factoryOpt = instanceRepository.findByCnpj(cnpj);
            
            if (factoryOpt.isPresent()) {
                Instance factory = factoryOpt.get();
                logger.info("Fábrica encontrada: {} (ID: {})", factory.getCommitteeName(), factory.getId());
                
                // NOVO: Verificar se o comitê tem conselho popular associado
                // Se não tiver e tiver cityCode, associar automaticamente
                if (factory.getPopularCouncilAssociatedWithCommitteeOrWorker() == null 
                    && factory.getCityCode() != null 
                    && !factory.getCityCode().trim().isEmpty()) {
                    
                    logger.info("Comitê sem conselho associado. Buscando/criando conselho para cidade...");
                    Instance popularCouncil = findOrCreatePopularCouncilForCity(
                        factory.getCityCode(), 
                        factory.getCity() != null ? factory.getCity() : cityName
                    );
                    
                    factory.setPopularCouncilAssociatedWithCommitteeOrWorker(popularCouncil);
                    factory = instanceRepository.save(factory);
                    logger.info("Comitê associado ao Conselho Popular: {} (ID: {})", 
                        popularCouncil.getCommitteeName(), popularCouncil.getId());
                }
                
                // Retornar DTO simples
                FactoryResponse response = new FactoryResponse(
                    factory.getId(),
                    factory.getCommitteeName(),
                    factory.getCnpj(),
                    factory.getCityCode(),
                    factory.getCity(),
                    factory.getType() != null ? factory.getType().toString() : "COMMITTEE"
                );
                return ResponseEntity.ok(response);
            }
            
            // Se não existe, precisamos criar com cityCode obrigatório
            String finalCityCode = cityCode;
            String finalCityName = cityName;
            
            // Se não tem cityCode mas tem cityName, buscar código no banco
            if (finalCityCode == null && finalCityName != null) {
                logger.info("Buscando código da cidade a partir do nome: {}", cityName);
                var cityOpt = cityRepository.findByNameIgnoreCase(cityName);
                if (cityOpt.isPresent()) {
                    finalCityCode = cityOpt.get().getCode();
                    finalCityName = cityOpt.get().getName();
                    logger.info("Código da cidade encontrado: {}", finalCityCode);
                } else {
                    logger.warn("Cidade '{}' não encontrada no banco", cityName);
                }
            }
            
            // Se tem cityCode mas não tem cityName, buscar nome no banco
            if (finalCityCode != null && finalCityName == null) {
                logger.info("Buscando nome da cidade a partir do código: {}", finalCityCode);
                var cityOpt = cityRepository.findByCode(finalCityCode);
                if (cityOpt.isPresent()) {
                    finalCityName = cityOpt.get().getName();
                    logger.info("Nome da cidade encontrado: {}", finalCityName);
                }
            }
            
            // Validação: cityCode é OBRIGATÓRIO para novas fábricas
            if (finalCityCode == null || finalCityCode.trim().isEmpty()) {
                String errorMsg = "Não foi possível determinar o código da cidade. " +
                    "Forneça 'cityCode' ou 'cityName' válido. " +
                    (cityName != null ? "Cidade '" + cityName + "' não encontrada no banco." : "");
                logger.error(errorMsg);
                return ResponseEntity.badRequest().body(errorMsg);
            }
            
            // Se não existe, buscar PLACEHOLDER_INSTANCE para copiar dados
            logger.info("Fábrica não encontrada. Buscando PLACEHOLDER_INSTANCE...");
            List<Instance> placeholders = instanceRepository.findByType(InstanceType.COMMITTEE);
            Instance placeholder = null;
            
            for (Instance p : placeholders) {
                if ("PLACEHOLDER_INSTANCE".equals(p.getCommitteeName())) {
                    placeholder = p;
                    break;
                }
            }
            
            if (placeholder == null) {
                logger.error("PLACEHOLDER_INSTANCE não encontrado!");
                return ResponseEntity.badRequest().body("PLACEHOLDER_INSTANCE não encontrado no banco de dados");
            }
            
            // Criar nova fábrica copiando dados do placeholder
            Instance newFactory = new Instance();
            newFactory.setType(InstanceType.COMMITTEE);
            newFactory.setCnpj(cnpj);
            newFactory.setCommitteeName(name != null ? name : "Fábrica " + cnpj);
            newFactory.setCityCode(finalCityCode);  // NUNCA NULL
            newFactory.setCity(finalCityName);       // Salvar nome da cidade também
            newFactory.setCreatedAt(LocalDateTime.now());
            
            logger.info("Criando nova fábrica: {}", newFactory.getCommitteeName());
            logger.info("  Cidade: {} ({})", finalCityName, finalCityCode);
            
            // Copiar dados do placeholder
            newFactory.setSocialMaterialization(placeholder.getSocialMaterialization());
            newFactory.setWorkerEffectiveLimit(placeholder.getWorkerEffectiveLimit());
            
            // NOVO: Buscar ou criar Conselho Popular para esta cidade
            Instance popularCouncil = findOrCreatePopularCouncilForCity(finalCityCode, finalCityName);
            newFactory.setPopularCouncilAssociatedWithCommitteeOrWorker(popularCouncil);
            logger.info("Comitê associado ao Conselho Popular: {} (ID: {})", 
                popularCouncil.getCommitteeName(), popularCouncil.getId());
            
            newFactory.setProducedQuantity(placeholder.getProducedQuantity());
            newFactory.setTargetQuantity(placeholder.getTargetQuantity());
            newFactory.setTotalSocialWorkOfThisJurisdiction(placeholder.getTotalSocialWorkOfThisJurisdiction());
            
            // Salvar nova fábrica
            newFactory = instanceRepository.save(newFactory);
            logger.info("Nova fábrica criada: {} (ID: {})", newFactory.getCommitteeName(), newFactory.getId());
            
            // Copiar tensores tecnológicos do placeholder
            copyTechnologicalTensors(placeholder, newFactory);
            
            // Copiar vetores de demanda do placeholder
            copyDemandVectors(placeholder, newFactory);
            
            // Copiar estoques de demanda do placeholder
            copyDemandStocks(placeholder, newFactory);
            
            // Retornar DTO simples
            FactoryResponse response = new FactoryResponse(
                newFactory.getId(),
                newFactory.getCommitteeName(),
                newFactory.getCnpj(),
                newFactory.getCityCode(),
                newFactory.getCity(),
                newFactory.getType() != null ? newFactory.getType().toString() : "COMMITTEE"
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Erro ao buscar/criar fábrica", e);
            return ResponseEntity.internalServerError().body("Erro: " + e.getMessage());
        }
    }
    
    /**
     * Copia todos os tensores tecnológicos de uma instância para outra
     */
    private void copyTechnologicalTensors(Instance source, Instance target) {
        try {
            logger.info("Copiando tensores tecnológicos de {} para {}", 
                source.getCommitteeName(), target.getCommitteeName());
            
            List<TechnologicalTensor> sourceTensors = technologicalTensorRepository
                .findByInstance(source);
            
            int count = 0;
            for (TechnologicalTensor sourceTensor : sourceTensors) {
                TechnologicalTensor newTensor = new TechnologicalTensor();
                
                // Criar novo ID com a instância destino
                TechnologicalTensor.TechnologicalTensorId newId = 
                    new TechnologicalTensor.TechnologicalTensorId(
                        target.getId(),
                        sourceTensor.getInputSocialMaterialization().getId(),
                        sourceTensor.getOutputSocialMaterialization().getId()
                    );
                
                newTensor.setId(newId);
                newTensor.setInstance(target);
                newTensor.setInputSocialMaterialization(sourceTensor.getInputSocialMaterialization());
                newTensor.setOutputSocialMaterialization(sourceTensor.getOutputSocialMaterialization());
                newTensor.setTechnicalCoefficientElementValue(sourceTensor.getTechnicalCoefficientElementValue());
                newTensor.setCreatedAt(LocalDateTime.now());
                
                technologicalTensorRepository.save(newTensor);
                count++;
            }
            
            logger.info("Copiados {} tensores tecnológicos", count);
        } catch (Exception e) {
            logger.error("Erro ao copiar tensores tecnológicos", e);
        }
    }
    
    /**
     * Copia todos os vetores de demanda de uma instância para outra
     */
    private void copyDemandVectors(Instance source, Instance target) {
        try {
            logger.info("Copiando vetores de demanda de {} para {}", 
                source.getCommitteeName(), target.getCommitteeName());
            
            List<DemandVector> sourceVectors = demandVectorRepository
                .findByInstance(source);
            
            int count = 0;
            for (DemandVector sourceVector : sourceVectors) {
                DemandVector newVector = new DemandVector();
                
                // Criar novo ID com a instância destino
                DemandVector.DemandVectorId newId = 
                    new DemandVector.DemandVectorId(
                        target.getId(),
                        sourceVector.getSocialMaterialization().getId()
                    );
                
                newVector.setId(newId);
                newVector.setInstance(target);
                newVector.setSocialMaterialization(sourceVector.getSocialMaterialization());
                newVector.setDemand(sourceVector.getDemand());
                newVector.setCreatedAt(LocalDateTime.now());
                
                demandVectorRepository.save(newVector);
                count++;
            }
            
            logger.info("Copiados {} vetores de demanda", count);
        } catch (Exception e) {
            logger.error("Erro ao copiar vetores de demanda", e);
        }
    }
    
    /**
     * Copia todos os estoques de demanda de uma instância para outra
     */
    private void copyDemandStocks(Instance source, Instance target) {
        try {
            logger.info("Copiando estoques de demanda de {} para {}", 
                source.getCommitteeName(), target.getCommitteeName());
            
            List<DemandStock> sourceStocks = demandStockRepository
                .findByInstance(source);
            
            int count = 0;
            for (DemandStock sourceStock : sourceStocks) {
                DemandStock newStock = new DemandStock();
                
                newStock.setInstance(target);
                newStock.setSocialMaterialization(sourceStock.getSocialMaterialization());
                newStock.setDemand(sourceStock.getDemand());
                newStock.setStock(sourceStock.getStock());
                newStock.setCreatedAt(LocalDateTime.now());
                
                demandStockRepository.save(newStock);
                count++;
            }
            
            logger.info("Copiados {} estoques de demanda", count);
        } catch (Exception e) {
            logger.error("Erro ao copiar estoques de demanda", e);
        }
    }
    
    /**
     * Busca ou cria um Conselho Popular para uma cidade específica.
     * Garante que existe apenas UM conselho popular por cidade.
     * Também cria automaticamente o conselho estadual se não existir.
     * 
     * @param cityCode Código IBGE da cidade
     * @param cityName Nome da cidade
     * @return Conselho Popular da cidade (existente ou recém-criado)
     */
    private Instance findOrCreatePopularCouncilForCity(String cityCode, String cityName) {
        logger.info("Buscando Conselho Popular para cidade: {} ({})", cityName, cityCode);
        
        // Buscar conselho popular existente para esta cidade
        List<Instance> existingCouncils = instanceRepository
            .findByCityCodeAndType(cityCode, InstanceType.POPULARCOUNCIL);
        
        // Se já existe, retornar o primeiro (deve haver apenas um por cidade)
        if (!existingCouncils.isEmpty()) {
            Instance council = existingCouncils.get(0);
            logger.info("Conselho Popular encontrado: {} (ID: {})", 
                council.getCommitteeName(), council.getId());
            
            // Se existir mais de um, logar warning
            if (existingCouncils.size() > 1) {
                logger.warn("ATENÇÃO: Foram encontrados {} Conselhos Populares para a cidade {} - deveria haver apenas um!", 
                    existingCouncils.size(), cityName);
            }
            
            // Garantir que o conselho da cidade está vinculado ao conselho estadual
            if (council.getPopularCouncilAssociatedWithPopularCouncil() == null && council.getState() != null) {
                Instance stateCouncil = findOrCreateStateCouncil(council.getState());
                council.setPopularCouncilAssociatedWithPopularCouncil(stateCouncil);
                council = instanceRepository.save(council);
                logger.info("Conselho da cidade {} vinculado ao conselho estadual: {}", 
                    cityName, stateCouncil.getCommitteeName());
            }
            
            return council;
        }
        
        // Se não existe, criar novo Conselho Popular
        logger.info("Conselho Popular não encontrado. Criando novo para cidade: {}", cityName);
        
        Instance newCouncil = new Instance();
        newCouncil.setType(InstanceType.POPULARCOUNCIL);
        newCouncil.setCommitteeName("Conselho Popular de " + cityName);
        newCouncil.setCityCode(cityCode);
        newCouncil.setCity(cityName);
        newCouncil.setCreatedAt(LocalDateTime.now());
        
        // Buscar dados de localização da cidade no repositório de cidades
        String stateName = null;
        Optional<City> cityOpt = cityRepository.findByCode(cityCode);
        if (cityOpt.isPresent()) {
            City city = cityOpt.get();
            stateName = city.getState();
            if (stateName != null) {
                newCouncil.setState(stateName);
            }
            newCouncil.setCountry("Brasil");
        }
        
        // Salvar novo conselho
        newCouncil = instanceRepository.save(newCouncil);
        logger.info("Novo Conselho Popular criado: {} (ID: {})", 
            newCouncil.getCommitteeName(), newCouncil.getId());
        
        // Vincular ao conselho estadual (criando-o se necessário)
        if (stateName != null) {
            Instance stateCouncil = findOrCreateStateCouncil(stateName);
            newCouncil.setPopularCouncilAssociatedWithPopularCouncil(stateCouncil);
            newCouncil = instanceRepository.save(newCouncil);
            logger.info("Conselho da cidade {} vinculado ao conselho estadual: {}", 
                cityName, stateCouncil.getCommitteeName());
        }
        
        return newCouncil;
    }

    private static final int BRASIL_COUNCIL_ID = 6068;

    private Instance findOrCreateStateCouncil(String stateName) {
        // Buscar conselho estadual existente
        List<Instance> stateCouncils = instanceRepository
            .findStateCouncilByStateAndType(stateName, InstanceType.POPULARCOUNCIL);
        
        if (!stateCouncils.isEmpty()) {
            return stateCouncils.get(0);
        }
        
        // Criar novo conselho estadual
        logger.info("Criando conselho estadual para: {}", stateName);
        Instance stateCouncil = new Instance();
        stateCouncil.setType(InstanceType.POPULARCOUNCIL);
        stateCouncil.setCommitteeName(BrazilianStateUtil.getCouncilName(stateName));
        stateCouncil.setState(stateName);
        stateCouncil.setCountry("Brasil");
        stateCouncil.setContinent("América do Sul");
        stateCouncil.setCreatedAt(LocalDateTime.now());
        
        // Coordenadas da capital do estado
        java.math.BigDecimal[] coords = BrazilianStateUtil.getCapitalCoords(stateName);
        if (coords != null) {
            stateCouncil.setLatitude(coords[0]);
            stateCouncil.setLongitude(coords[1]);
        }
        
        // Vincular ao conselho do Brasil
        Optional<Instance> brasilCouncil = instanceRepository.findById(BRASIL_COUNCIL_ID);
        if (brasilCouncil.isPresent()) {
            stateCouncil.setPopularCouncilAssociatedWithPopularCouncil(brasilCouncil.get());
            logger.info("Conselho estadual de {} vinculado ao Conselho do Brasil", stateName);
        }
        
        stateCouncil = instanceRepository.save(stateCouncil);
        logger.info("Conselho estadual criado: {} (ID: {})", 
            stateCouncil.getCommitteeName(), stateCouncil.getId());
        
        return stateCouncil;
    }
}
