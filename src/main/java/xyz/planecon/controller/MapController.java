package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.enums.InstanceType;
import xyz.planecon.repository.InstanceRepository;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/map")
public class MapController {

    @Autowired
    private InstanceRepository instanceRepository;

    /**
     * Returns all POPULARCOUNCIL instances for a city, by city name (case-insensitive).
     * Query param: ?cidade=NITEROI
     */
    @GetMapping("/conselhos")
    public ResponseEntity<List<Map<String, Object>>> getConselhosPorCidade(
            @RequestParam(value = "cidade", required = false, defaultValue = "") String cidade) {

        List<Instance> conselhos = cidade.isBlank()
                ? instanceRepository.findAllByType(InstanceType.POPULARCOUNCIL)
                : instanceRepository.findAllByTypeAndCity(InstanceType.POPULARCOUNCIL, cidade);

        return ResponseEntity.ok(toConselhoList(conselhos));
    }

    /**
     * Returns all "global" councils (state, country, continent, international level)
     * that should always appear on the map regardless of which city is being viewed.
     */
    @GetMapping("/conselhos-globais")
    public ResponseEntity<List<Map<String, Object>>> getConselhosGlobais() {
        List<Instance> conselhos = new ArrayList<>(instanceRepository.findGlobalCouncils(InstanceType.POPULARCOUNCIL));
        conselhos.addAll(instanceRepository.findGlobalCouncils(InstanceType.PLANNERCOUNCIL));
        return ResponseEntity.ok(toConselhoList(conselhos));
    }

    private List<Map<String, Object>> toConselhoList(List<Instance> conselhos) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Instance c : conselhos) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", c.getId());
            item.put("nome", c.getCommitteeName());
            item.put("tipo", c.getType() != null ? c.getType().name() : null);
            item.put("cidade", c.getCity());
            item.put("codigoCidade", c.getCityCode());
            item.put("estado", c.getState());
            item.put("pais", c.getCountry());
            item.put("continente", c.getContinent());
            item.put("latitude", c.getLatitude());
            item.put("longitude", c.getLongitude());
            result.add(item);
        }
        return result;
    }

    /**
     * Saves computed or edited coordinates for a council instance.
     * Body: { "latitude": -22.880, "longitude": -43.097 }
     */
    @PutMapping("/conselhos/{id}/coordenadas")
    @Transactional
    public ResponseEntity<Map<String, Object>> salvarCoordenadas(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> body) {

        Optional<Instance> opt = instanceRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Instance conselho = opt.get();
        if (conselho.getType() != InstanceType.POPULARCOUNCIL && conselho.getType() != InstanceType.PLANNERCOUNCIL) {
            return ResponseEntity.badRequest().build();
        }

        Object latObj = body.get("latitude");
        Object lonObj = body.get("longitude");
        if (latObj == null || lonObj == null) {
            return ResponseEntity.badRequest().build();
        }

        conselho.setLatitude(new BigDecimal(latObj.toString()));
        conselho.setLongitude(new BigDecimal(lonObj.toString()));
        instanceRepository.save(conselho);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", conselho.getId());
        resp.put("latitude", conselho.getLatitude());
        resp.put("longitude", conselho.getLongitude());
        return ResponseEntity.ok(resp);
    }
}
