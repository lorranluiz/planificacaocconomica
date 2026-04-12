package xyz.planecon.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para resposta de fábrica (evita problemas de serialização circular)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FactoryResponse {
    private Integer id;
    private String name;
    private String cnpj;
    private String cityCode;
    private String cityName;
    private String type;
    private String state;

    public FactoryResponse(Integer id, String name, String cnpj, String cityCode, String cityName, String type) {
        this.id = id;
        this.name = name;
        this.cnpj = cnpj;
        this.cityCode = cityCode;
        this.cityName = cityName;
        this.type = type;
    }
}
