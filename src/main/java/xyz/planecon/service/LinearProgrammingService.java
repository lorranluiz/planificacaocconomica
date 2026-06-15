package xyz.planecon.service;

import org.ojalgo.optimisation.Expression;
import org.ojalgo.optimisation.ExpressionsBasedModel;
import org.ojalgo.optimisation.Optimisation;
import org.ojalgo.optimisation.Variable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import xyz.planecon.util.MatrixOperations;

/**
 * Serviço de Programação Linear para o modelo LP-IO (Leontief + Kantorovich).
 *
 * Formulação do LP:
 *   min  Z = Σ(t_i * x_i)                     (minimizar tempo total de trabalho socialmente necessário)
 *   s.a. x_i - Σ(a_ij * x_j) >= y_i  ∀i      (balanço intersetorial de Leontief)
 *        Σ(e_i * x_i) <= E_max                (restrição de emissão de CO2)
 *        x_i >= 0                     ∀i      (não-negatividade)
 */
@Service
public class LinearProgrammingService {

    private static final Logger logger = LoggerFactory.getLogger(LinearProgrammingService.class);

    /**
     * Resolve o LP-IO com restrição de CO2.
     */
    public LPSolution solve(double[][] techMatrix, double[] demandVector,
                            double[] laborTimes, double[] emissionFactors,
                            Double co2Limit) {

        int n = techMatrix.length;

        if (n == 0 || demandVector.length != n || laborTimes.length != n) {
            throw new IllegalArgumentException("Dimensões incompatíveis: matriz=" + n +
                "x" + (n > 0 ? techMatrix[0].length : 0) + ", demanda=" + demandVector.length +
                ", tempos=" + laborTimes.length);
        }

        boolean hasCo2Constraint = co2Limit != null && co2Limit > 0
            && emissionFactors != null && emissionFactors.length == n;

        logger.info("Resolvendo LP-IO: {} produtos, restrição CO2: {} (limite={})",
            n, hasCo2Constraint, hasCo2Constraint ? co2Limit : "nenhuma");

        ExpressionsBasedModel model = new ExpressionsBasedModel();

        // Variáveis de decisão: x_i >= 0
        Variable[] x = new Variable[n];
        for (int i = 0; i < n; i++) {
            x[i] = model.addVariable().lower(0.0).weight(laborTimes[i]);
        }

        // Restrições de balanço de Leontief: x_i - Σ(a_ij * x_j) >= y_i
        for (int i = 0; i < n; i++) {
            Expression leontiefConstraint = model.addExpression("leontief_" + i);
            leontiefConstraint.set(x[i], 1.0);
            for (int j = 0; j < n; j++) {
                if (techMatrix[i][j] != 0.0) {
                    leontiefConstraint.set(x[j], -techMatrix[i][j]);
                }
            }
            leontiefConstraint.lower(demandVector[i]);
        }

        // Restrição de emissão de CO2: Σ(e_i * x_i) <= E_max
        Expression co2Expression = null;
        if (hasCo2Constraint) {
            co2Expression = model.addExpression("co2_limit");
            for (int i = 0; i < n; i++) {
                if (emissionFactors[i] != 0.0) {
                    co2Expression.set(x[i], emissionFactors[i]);
                }
            }
            co2Expression.upper(co2Limit);
        }

        // Resolver
        Optimisation.Result result = model.minimise();

        logger.info("LP-IO resolvido: estado={}, valor objetivo={}",
            result.getState(), result.getValue());

        // Extrair solução
        double[] productionVector = new double[n];
        for (int i = 0; i < n; i++) {
            productionVector[i] = result.doubleValue(i);
        }

        // Calcular emissões totais
        double totalCo2 = 0.0;
        if (emissionFactors != null) {
            for (int i = 0; i < n && i < emissionFactors.length; i++) {
                totalCo2 += emissionFactors[i] * productionVector[i];
            }
        }

        // Preço-sombra (dual) da restrição de CO2 — obtido como bônus quando disponível
        Double co2ShadowPrice = null;
        boolean co2Binding = false;
        if (hasCo2Constraint) {
            // Verificar vinculação: se emissões próximas do limite
            if (totalCo2 > 0) {
                double slack = co2Limit - totalCo2;
                co2Binding = slack < 1e-6 * Math.max(1.0, co2Limit);
            }
        }

        logger.info("LP-IO: produção total={}, emissões={}/{}, CO2 vinculante={}, preço-sombra={}",
            sum(productionVector), totalCo2, hasCo2Constraint ? co2Limit : "N/A",
            co2Binding, co2ShadowPrice);

        return new LPSolution(productionVector, totalCo2, co2ShadowPrice, co2Binding,
            result.getState() == Optimisation.State.OPTIMAL);
    }

    private double sum(double[] arr) {
        double s = 0.0;
        for (double v : arr) s += v;
        return s;
    }

    /**
     * Plano B: LP com slack de demanda quando o LP original é infactível.
     *
     * Formulação:
     *   min  Z = Σ(t_i · x_i) + Σ(w_i · s_i)
     *   s.a. x_i - Σ(a_ij · x_j) + s_i >= y_i  ∀i
     *        Σ(e_i · x_i) <= E_max
     *        x_i >= 0, s_i >= 0                ∀i
     *
     * Pesos: w_i = 1 + K/e_i  — inversamente proporcional à emissão.
     * Produtos que emitem MAIS CO2 têm peso MENOR → são prioridade para corte de demanda.
     * Produtos limpos têm peso ALTO → demanda protegida.
     *
     * @return SlackLPSolution com vetor de produção, demandas ajustadas, e slacks
     */
    public SlackLPSolution solveWithSlack(double[][] techMatrix, double[] demandVector,
                                           double[] laborTimes, double[] emissionFactors,
                                           double co2Limit) {
        int n = techMatrix.length;

        logger.info("Plano B: escalonamento proporcional — {} produtos, limite CO2={}", n, co2Limit);

        // 1. Computar produção Leontief como baseline
        double[] leontiefProd = MatrixOperations.calculateProductionVector(techMatrix, demandVector);

        // 2. Calcular emissões Leontief totais
        double totalCo2 = computeCo2(leontiefProd, emissionFactors);

        if (totalCo2 <= co2Limit) {
            // CO2 constraint already satisfied — return Leontief unchanged
            logger.info("Plano B: Leontief j satisfaz CO2 ({} <= {}). Nenhum ajuste.", totalCo2, co2Limit);
            double[] noSlack = new double[n];
            return new SlackLPSolution(leontiefProd, noSlack,
                demandVector.clone(), totalCo2, false, true);
        }

        // 3. Calcular escala proporcional: x_i = x_L_i * scale
        double scale = co2Limit / totalCo2;
        logger.info("Plano B: escala proporcional = {} (CO2 Leontief={} > limite={})",
            scale, totalCo2, co2Limit);

        // 4. Escalonar produção
        double[] prodVector = new double[n];
        for (int i = 0; i < n; i++) {
            prodVector[i] = leontiefProd[i] * scale;
        }

        // 5. Calcular novas demandas: y'_i = x_i - Σ(a_ij * x_j) = scale * (x_L_i - Σ(a_ij * x_L_j)) = scale * y_i
        double[] adjustedDemand = new double[n];
        double[] slackValues = new double[n];
        for (int i = 0; i < n; i++) {
            adjustedDemand[i] = demandVector[i] * scale;
            slackValues[i] = demandVector[i] - adjustedDemand[i];
            if (adjustedDemand[i] < 0) adjustedDemand[i] = 0;
        }

        // 6. Calcular emissões do plano ajustado
        double finalCo2 = computeCo2(prodVector, emissionFactors);
        boolean binding = Math.abs(finalCo2 - co2Limit) < 1e-6 * Math.max(1.0, co2Limit);

        logger.info("Plano B: emisses ajustadas={}, demanda original={}, ajustada={}",
            finalCo2, sum(demandVector), sum(adjustedDemand));

        return new SlackLPSolution(prodVector, slackValues, adjustedDemand, finalCo2, binding, true);
    }

    private double computeCo2(double[] productionVector, double[] emissionFactors) {
        double total = 0.0;
        if (emissionFactors != null) {
            for (int i = 0; i < productionVector.length && i < emissionFactors.length; i++) {
                total += emissionFactors[i] * productionVector[i];
            }
        }
        return total;
    }

    /**
     * Resultado do LP com slack de demanda (Plano B).
     */
    public static class SlackLPSolution {
        public final double[] productionVector;
        public final double[] slackValues;
        public final double[] adjustedDemand;
        public final double totalCo2Emissions;
        public final boolean co2ConstraintBinding;
        public final boolean optimal;

        public SlackLPSolution(double[] productionVector, double[] slackValues,
                               double[] adjustedDemand, double totalCo2Emissions,
                               boolean co2ConstraintBinding, boolean optimal) {
            this.productionVector = productionVector;
            this.slackValues = slackValues;
            this.adjustedDemand = adjustedDemand;
            this.totalCo2Emissions = totalCo2Emissions;
            this.co2ConstraintBinding = co2ConstraintBinding;
            this.optimal = optimal;
        }

        public double[] getProductionVector() { return productionVector; }
        public double[] getSlackValues() { return slackValues; }
        public double[] getAdjustedDemand() { return adjustedDemand; }
        public double getTotalCo2Emissions() { return totalCo2Emissions; }
        public boolean isCo2ConstraintBinding() { return co2ConstraintBinding; }
        public boolean isOptimal() { return optimal; }
    }

    /**
     * Resultado da solução do LP.
     */
    public static class LPSolution {
        public final double[] productionVector;
        public final double totalCo2Emissions;
        public final Double co2ShadowPrice;
        public final boolean co2ConstraintBinding;
        public final boolean optimal;

        public LPSolution(double[] productionVector, double totalCo2Emissions,
                          Double co2ShadowPrice, boolean co2ConstraintBinding, boolean optimal) {
            this.productionVector = productionVector;
            this.totalCo2Emissions = totalCo2Emissions;
            this.co2ShadowPrice = co2ShadowPrice;
            this.co2ConstraintBinding = co2ConstraintBinding;
            this.optimal = optimal;
        }

        public double[] getProductionVector() { return productionVector; }
        public double getTotalCo2Emissions() { return totalCo2Emissions; }
        public Double getCo2ShadowPrice() { return co2ShadowPrice; }
        public boolean isCo2ConstraintBinding() { return co2ConstraintBinding; }
        public boolean isOptimal() { return optimal; }
    }
}
