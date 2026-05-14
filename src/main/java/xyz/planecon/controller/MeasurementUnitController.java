package xyz.planecon.controller;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.planecon.model.entity.MeasurementUnit;
import xyz.planecon.service.MeasurementUnitService;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/measurement-units")
public class MeasurementUnitController {

    private final MeasurementUnitService measurementUnitService;

    public MeasurementUnitController(MeasurementUnitService measurementUnitService) {
        this.measurementUnitService = measurementUnitService;
    }

    @GetMapping
    public List<MeasurementUnit> listUnits() {
        return measurementUnitService.findAll().stream()
                .sorted(Comparator.comparing(MeasurementUnit::getName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @PostMapping
    public ResponseEntity<?> createUnit(@RequestBody Map<String, Object> payload) {
        try {
            String name = payload.get("name") == null ? null : String.valueOf(payload.get("name"));
            MeasurementUnit unit = measurementUnitService.create(name);
            return ResponseEntity.status(HttpStatus.CREATED).body(unit);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUnit(@PathVariable("id") Integer id) {
        try {
            measurementUnitService.delete(id);
            return ResponseEntity.ok(Map.of("message", "Unidade excluída com sucesso"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        }
    }
}