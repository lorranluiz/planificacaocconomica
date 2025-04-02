package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import xyz.planecon.dto.InstanceDto;
import xyz.planecon.dto.SocialMaterializationDto;
import xyz.planecon.dto.TechnologicalTensorDto;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.model.entity.TechnologicalTensor;
import xyz.planecon.model.entity.TechnologicalTensor.TechnologicalTensorId;
import xyz.planecon.service.TechnologicalTensorService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/planification/technological-tensor")
public class TechnologicalTensorController {

    private static final Logger logger = LoggerFactory.getLogger(TechnologicalTensorController.class);

    private final TechnologicalTensorService tensorService;

    @Autowired
    public TechnologicalTensorController(TechnologicalTensorService tensorService) {
        this.tensorService = tensorService;
    }

    // Rota principal - redireciona para a página estática
    @GetMapping
    public String redirectToStaticPage() {
        return "redirect:/technological-tensors.html";
    }

    // ====== API REST ======

    @GetMapping("/api")
    @ResponseBody
    public ResponseEntity<List<TechnologicalTensorDto>> getAllTensors() {
        try {
            List<TechnologicalTensorDto> tensors = tensorService.findAll().stream()
                    .map(TechnologicalTensorDto::new)
                    .collect(Collectors.toList());
            
            logger.info("Retornando {} tensores", tensors.size());
            return ResponseEntity.ok(tensors);
        } catch (Exception e) {
            logger.error("Erro ao buscar tensores", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ArrayList<>());
        }
    }

    @GetMapping("/api/{inputId}/{outputId}")
    @ResponseBody
    public ResponseEntity<?> getTensorById(
            @PathVariable("inputId") Integer inputId,
            @PathVariable("outputId") Integer outputId) {
        
        try {
            TechnologicalTensorId id = new TechnologicalTensorId(inputId, outputId);
            Optional<TechnologicalTensor> tensor = tensorService.findById(id);
            
            if (tensor.isPresent()) {
                TechnologicalTensorDto dto = new TechnologicalTensorDto(tensor.get());
                return ResponseEntity.ok(dto);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            logger.error("Erro ao buscar tensor por ID", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping("/api")
    @ResponseBody
    public ResponseEntity<?> createTensor(@RequestBody Map<String, Object> payload) {
        try {
            Integer inputSocMatId = (Integer) payload.get("inputSocMatId");
            Integer outputSocMatId = (Integer) payload.get("outputSocMatId");
            Integer instanceId = (Integer) payload.get("instanceId");

            BigDecimal coefficient = null;
            if (payload.get("coefficient") != null) {
                String coefficientStr = payload.get("coefficient").toString().replace(',', '.');
                try {
                    coefficient = new BigDecimal(coefficientStr);
                } catch (NumberFormatException e) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "message", "Formato inválido para coeficiente: " + payload.get("coefficient")
                    ));
                }
            }

            TechnologicalTensor tensor = tensorService.create(
                    inputSocMatId, outputSocMatId, coefficient, instanceId);
            tensorService.save(tensor);
            
            TechnologicalTensorDto dto = new TechnologicalTensorDto(tensor);
            return ResponseEntity.status(HttpStatus.CREATED).body(dto);
        } catch (Exception e) {
            logger.error("Erro ao criar tensor", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PutMapping("/api/{inputId}/{outputId}")
    @ResponseBody
    public ResponseEntity<?> updateTensor(
            @PathVariable("inputId") Integer inputId,
            @PathVariable("outputId") Integer outputId,
            @RequestParam("coefficient") String coefficientStr,
            @RequestParam("instanceId") Integer instanceId) {
        
        try {
            // Converter string para BigDecimal mantendo precisão exata
            BigDecimal coefficient = new BigDecimal(coefficientStr);
            
            TechnologicalTensorId id = new TechnologicalTensorId(inputId, outputId);
            Optional<TechnologicalTensor> existingTensorOpt = tensorService.findById(id);
            
            if (!existingTensorOpt.isPresent()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Tensor não encontrado");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            
            TechnologicalTensor existingTensor = existingTensorOpt.get();
            existingTensor.setTechnicalCoefficientElementValue(coefficient);
            
            // Atualizar instância se mudou
            if (!existingTensor.getInstance().getId().equals(instanceId)) {
                Optional<Instance> newInstance = tensorService.findInstanceById(instanceId);
                if (newInstance.isPresent()) {
                    existingTensor.setInstance(newInstance.get());
                }
            }
            
            tensorService.save(existingTensor);
            TechnologicalTensorDto dto = new TechnologicalTensorDto(existingTensor);
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            logger.error("Erro ao atualizar tensor", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @DeleteMapping("/api/{inputId}/{outputId}")
    @ResponseBody
    public ResponseEntity<?> deleteTensor(
            @PathVariable("inputId") Integer inputId,
            @PathVariable("outputId") Integer outputId) {
        
        try {
            TechnologicalTensorId id = new TechnologicalTensorId(inputId, outputId);
            tensorService.delete(id);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Tensor tecnológico excluído com sucesso!");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Erro ao excluir tensor", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @DeleteMapping("/api/by-materialization/{materializationId}/instance/{instanceId}")
    @ResponseBody
    public ResponseEntity<?> deleteTensorByMaterialization(
            @PathVariable("materializationId") Integer materializationId,
            @PathVariable("instanceId") Integer instanceId) {
        
        try {
            logger.info("Excluindo tensores para materialização {} na instância {}", 
                        materializationId, instanceId);
            
            // Use the new direct deletion method instead
            tensorService.deleteByMaterializationAndInstance(materializationId, instanceId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Tensores tecnológicos excluídos com sucesso!");
            response.put("count", "N/A"); // We don't know the count when using direct deletion
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Erro ao excluir tensores por materialização", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/api/social-materializations")
    @ResponseBody
    public ResponseEntity<List<SocialMaterializationDto>> getAllSocialMaterializations() {
        try {
            List<SocialMaterializationDto> materials = tensorService.findAllSocialMaterializations().stream()
                    .map(material -> new SocialMaterializationDto(material))
                    .collect(Collectors.toList());
            
            logger.info("Retornando {} materializações sociais", materials.size());
            return ResponseEntity.ok(materials);
        } catch (Exception e) {
            logger.error("Erro ao buscar materializações sociais", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ArrayList<>());
        }
    }
    
    @GetMapping("/api/instances")
    @ResponseBody
    public ResponseEntity<List<InstanceDto>> getAllInstances() {
        try {
            List<InstanceDto> instances = tensorService.findAllInstances().stream()
                    .map(InstanceDto::new)
                    .collect(Collectors.toList());
            
            logger.info("Retornando {} instâncias", instances.size());
            return ResponseEntity.ok(instances);
        } catch (Exception e) {
            logger.error("Erro ao buscar instâncias", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ArrayList<>());
        }
    }

    @GetMapping("/create")
    public String showCreateForm(Model model) {
        List<SocialMaterialization> socialMaterializations = tensorService.findAllSocialMaterializations();
        List<Instance> instances = tensorService.findAllInstances();
        
        model.addAttribute("socialMaterializations", socialMaterializations);
        model.addAttribute("instances", instances);
        return "technological-tensors/create";
    }

    @PostMapping("/create")
    public String createTensor(
            @RequestParam("inputSocMatId") Integer inputSocMatId,
            @RequestParam("outputSocMatId") Integer outputSocMatId,
            @RequestParam("coefficient") BigDecimal coefficient,
            @RequestParam("instanceId") Integer instanceId,
            RedirectAttributes redirectAttributes) {
        
        try {
            TechnologicalTensor tensor = tensorService.create(
                    inputSocMatId, outputSocMatId, coefficient, instanceId);
            tensorService.save(tensor);
            redirectAttributes.addFlashAttribute("successMessage", "Tensor tecnológico criado com sucesso!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Erro ao criar tensor: " + e.getMessage());
        }
        
        return "redirect:/technological-tensors";
    }

    @GetMapping("/edit/{inputId}/{outputId}")
    public String showEditForm(
            @PathVariable("inputId") Integer inputId,
            @PathVariable("outputId") Integer outputId,
            Model model, 
            RedirectAttributes redirectAttributes) {
        
        TechnologicalTensorId id = new TechnologicalTensorId(inputId, outputId);
        TechnologicalTensor tensor = tensorService.findById(id)
                .orElse(null);
        
        if (tensor == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Tensor não encontrado");
            return "redirect:/technological-tensors";
        }
        
        List<SocialMaterialization> socialMaterializations = tensorService.findAllSocialMaterializations();
        List<Instance> instances = tensorService.findAllInstances();
        
        model.addAttribute("tensor", tensor);
        model.addAttribute("socialMaterializations", socialMaterializations);
        model.addAttribute("instances", instances);
        
        return "technological-tensors/edit";
    }

    @PostMapping("/update")
    public String updateTensor(
            @RequestParam("inputSocMatId") Integer inputSocMatId,
            @RequestParam("outputSocMatId") Integer outputSocMatId,
            @RequestParam("coefficient") BigDecimal coefficient,
            @RequestParam("instanceId") Integer instanceId,
            RedirectAttributes redirectAttributes) {
        
        try {
            TechnologicalTensorId id = new TechnologicalTensorId(inputSocMatId, outputSocMatId);
            TechnologicalTensor existingTensor = tensorService.findById(id)
                    .orElseThrow(() -> new RuntimeException("Tensor não encontrado"));
            
            // Atualizar o coeficiente apenas, já que input e output são parte da chave primária
            existingTensor.setTechnicalCoefficientElementValue(coefficient);
            
            // A instância pode ser alterada
            Instance instance = tensorService.findAllInstances().stream()
                    .filter(i -> i.getId().equals(instanceId))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Instância não encontrada"));
            
            existingTensor.setInstance(instance);
            
            tensorService.save(existingTensor);
            redirectAttributes.addFlashAttribute("successMessage", "Tensor tecnológico atualizado com sucesso!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Erro ao atualizar tensor: " + e.getMessage());
        }
        
        return "redirect:/technological-tensors";
    }

    @PostMapping("/delete")
    public String deleteTensor(
            @RequestParam("inputSocMatId") Integer inputSocMatId,
            @RequestParam("outputSocMatId") Integer outputSocMatId,
            RedirectAttributes redirectAttributes) {
        
        try {
            TechnologicalTensorId id = new TechnologicalTensorId(inputSocMatId, outputSocMatId);
            tensorService.delete(id);
            redirectAttributes.addFlashAttribute("successMessage", "Tensor tecnológico excluído com sucesso!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Erro ao excluir tensor: " + e.getMessage());
        }
        
        return "redirect:/technological-tensors";
    }

    /**
     * Retorna todos os tensores tecnológicos para uma instância específica
     * Formato otimizado para consumo no frontend
     */
    @GetMapping("/by-instance/{instanceId}")
    public ResponseEntity<?> getTensorsByInstance(@PathVariable Integer instanceId) {
        try {
            List<TechnologicalTensor> tensors = tensorService.findByInstanceId(instanceId);
            
            if (tensors.isEmpty()) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            
            // Converter para formato mais amigável para o frontend
            List<Map<String, Object>> result = new ArrayList<>();
            
            for (TechnologicalTensor tensor : tensors) {
                Map<String, Object> item = new HashMap<>();
                item.put("instanceId", instanceId);
                item.put("inputMaterializationId", tensor.getInputSocialMaterialization().getId());
                item.put("inputMaterializationName", tensor.getInputSocialMaterialization().getName());
                item.put("outputMaterializationId", tensor.getOutputSocialMaterialization().getId());
                item.put("outputMaterializationName", tensor.getOutputSocialMaterialization().getName());
                item.put("quantity", tensor.getTechnicalCoefficientElementValue());
                
                result.add(item);
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Erro ao buscar tensores tecnológicos: " + e.getMessage());
        }
    }
}