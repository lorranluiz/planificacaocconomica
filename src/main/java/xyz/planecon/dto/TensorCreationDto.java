package xyz.planecon.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TensorCreationDto {
    private Integer inputMaterializationId;
    private Integer outputMaterializationId;
    private Integer instanceId;
    private Double quantity;
}