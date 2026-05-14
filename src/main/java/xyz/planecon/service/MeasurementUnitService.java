package xyz.planecon.service;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.planecon.model.entity.MeasurementUnit;
import xyz.planecon.repository.MeasurementUnitRepository;
import xyz.planecon.repository.SocialMaterializationRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MeasurementUnitService {

    private final MeasurementUnitRepository measurementUnitRepository;
    private final SocialMaterializationRepository socialMaterializationRepository;

    public MeasurementUnitService(
            MeasurementUnitRepository measurementUnitRepository,
            SocialMaterializationRepository socialMaterializationRepository) {
        this.measurementUnitRepository = measurementUnitRepository;
        this.socialMaterializationRepository = socialMaterializationRepository;
    }

    public List<MeasurementUnit> findAll() {
        return measurementUnitRepository.findAll();
    }

    @Transactional
    public MeasurementUnit create(String name) {
        String normalized = name == null ? "" : name.trim();
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("Nome da unidade é obrigatório");
        }
        if (measurementUnitRepository.existsByNameIgnoreCase(normalized)) {
            throw new IllegalArgumentException("Esta unidade já existe");
        }

        MeasurementUnit unit = new MeasurementUnit();
        unit.setName(normalized);
        unit.setCreatedAt(LocalDateTime.now());
        return measurementUnitRepository.save(unit);
    }

    @Transactional
    public void delete(Integer unitId) {
        if (unitId == null) {
            throw new IllegalArgumentException("ID da unidade é obrigatório");
        }
        if (!measurementUnitRepository.existsById(unitId)) {
            throw new IllegalArgumentException("Unidade não encontrada");
        }
        if (socialMaterializationRepository.existsByMeasurementUnit_Id(unitId)) {
            throw new DataIntegrityViolationException("Não é possível excluir: a unidade está associada a materializações sociais");
        }

        measurementUnitRepository.deleteById(unitId);
    }
}