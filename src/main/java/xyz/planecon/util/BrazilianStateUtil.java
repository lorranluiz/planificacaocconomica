package xyz.planecon.util;

import java.math.BigDecimal;
import java.util.Map;

public final class BrazilianStateUtil {

    private BrazilianStateUtil() {}

    private static final Map<String, String> STATE_PREPOSITION = Map.ofEntries(
        Map.entry("Acre", "do"),
        Map.entry("Alagoas", "de"),
        Map.entry("Amapá", "do"),
        Map.entry("Amazonas", "do"),
        Map.entry("Bahia", "da"),
        Map.entry("Ceará", "do"),
        Map.entry("Distrito Federal", "do"),
        Map.entry("Espírito Santo", "do"),
        Map.entry("Goiás", "de"),
        Map.entry("Maranhão", "do"),
        Map.entry("Mato Grosso", "de"),
        Map.entry("Mato Grosso do Sul", "de"),
        Map.entry("Minas Gerais", "de"),
        Map.entry("Pará", "do"),
        Map.entry("Paraíba", "da"),
        Map.entry("Paraná", "do"),
        Map.entry("Pernambuco", "de"),
        Map.entry("Piauí", "do"),
        Map.entry("Rio de Janeiro", "do"),
        Map.entry("Rio Grande do Norte", "do"),
        Map.entry("Rio Grande do Sul", "do"),
        Map.entry("Rondônia", "de"),
        Map.entry("Roraima", "de"),
        Map.entry("Santa Catarina", "de"),
        Map.entry("São Paulo", "de"),
        Map.entry("Sergipe", "de"),
        Map.entry("Tocantins", "de")
    );

    // State capital coordinates (latitude, longitude)
    private static final Map<String, BigDecimal[]> CAPITAL_COORDS = Map.ofEntries(
        Map.entry("Acre", new BigDecimal[]{new BigDecimal("-9.9754"), new BigDecimal("-67.8249")}),
        Map.entry("Alagoas", new BigDecimal[]{new BigDecimal("-9.6658"), new BigDecimal("-35.7353")}),
        Map.entry("Amapá", new BigDecimal[]{new BigDecimal("0.0349"), new BigDecimal("-51.0694")}),
        Map.entry("Amazonas", new BigDecimal[]{new BigDecimal("-3.1190"), new BigDecimal("-60.0217")}),
        Map.entry("Bahia", new BigDecimal[]{new BigDecimal("-12.9714"), new BigDecimal("-38.5124")}),
        Map.entry("Ceará", new BigDecimal[]{new BigDecimal("-3.7172"), new BigDecimal("-38.5433")}),
        Map.entry("Distrito Federal", new BigDecimal[]{new BigDecimal("-15.7975"), new BigDecimal("-47.8919")}),
        Map.entry("Espírito Santo", new BigDecimal[]{new BigDecimal("-20.3155"), new BigDecimal("-40.3128")}),
        Map.entry("Goiás", new BigDecimal[]{new BigDecimal("-16.6869"), new BigDecimal("-49.2648")}),
        Map.entry("Maranhão", new BigDecimal[]{new BigDecimal("-2.5297"), new BigDecimal("-44.2825")}),
        Map.entry("Mato Grosso", new BigDecimal[]{new BigDecimal("-15.6014"), new BigDecimal("-56.0979")}),
        Map.entry("Mato Grosso do Sul", new BigDecimal[]{new BigDecimal("-20.4697"), new BigDecimal("-54.6201")}),
        Map.entry("Minas Gerais", new BigDecimal[]{new BigDecimal("-19.9167"), new BigDecimal("-43.9345")}),
        Map.entry("Pará", new BigDecimal[]{new BigDecimal("-1.4558"), new BigDecimal("-48.5024")}),
        Map.entry("Paraíba", new BigDecimal[]{new BigDecimal("-7.1195"), new BigDecimal("-34.8450")}),
        Map.entry("Paraná", new BigDecimal[]{new BigDecimal("-25.4284"), new BigDecimal("-49.2733")}),
        Map.entry("Pernambuco", new BigDecimal[]{new BigDecimal("-8.0476"), new BigDecimal("-34.8770")}),
        Map.entry("Piauí", new BigDecimal[]{new BigDecimal("-5.0892"), new BigDecimal("-42.8019")}),
        Map.entry("Rio de Janeiro", new BigDecimal[]{new BigDecimal("-22.9068"), new BigDecimal("-43.1729")}),
        Map.entry("Rio Grande do Norte", new BigDecimal[]{new BigDecimal("-5.7945"), new BigDecimal("-35.2110")}),
        Map.entry("Rio Grande do Sul", new BigDecimal[]{new BigDecimal("-30.0346"), new BigDecimal("-51.2177")}),
        Map.entry("Rondônia", new BigDecimal[]{new BigDecimal("-8.7612"), new BigDecimal("-63.9004")}),
        Map.entry("Roraima", new BigDecimal[]{new BigDecimal("2.8195"), new BigDecimal("-60.6714")}),
        Map.entry("Santa Catarina", new BigDecimal[]{new BigDecimal("-27.5954"), new BigDecimal("-48.5480")}),
        Map.entry("São Paulo", new BigDecimal[]{new BigDecimal("-23.5505"), new BigDecimal("-46.6333")}),
        Map.entry("Sergipe", new BigDecimal[]{new BigDecimal("-10.9091"), new BigDecimal("-37.0677")}),
        Map.entry("Tocantins", new BigDecimal[]{new BigDecimal("-10.1689"), new BigDecimal("-48.3317")})
    );

    public static String getCouncilName(String stateName) {
        String prep = STATE_PREPOSITION.getOrDefault(stateName, "de");
        return "Conselho Popular " + prep + " " + stateName;
    }

    public static BigDecimal[] getCapitalCoords(String stateName) {
        return CAPITAL_COORDS.get(stateName);
    }
}
