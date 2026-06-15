package xyz.planecon.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlanificationRequest {
    private Integer instanceId;
    private Double[][] technologicalMatrix;  // Matriz tecnológica
    private Double[] demandVector;          // Vetor de demanda final
    private String[] productNames;          // Nomes dos produtos/materializações sociais
    private Integer[] materializationIds;   // IDs das materializações sociais
    private Double[] emissionFactors;       // Fatores de emissão de CO2 (kg CO2/unidade) por produto
    private Double co2EmissionLimit;        // Teto máximo de emissão de CO2 (kg CO2) - se null/0, não aplica restrição
}
