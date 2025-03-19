package xyz.planecon.util;

import org.apache.commons.math3.linear.Array2DRowRealMatrix;
import org.apache.commons.math3.linear.ArrayRealVector;
import org.apache.commons.math3.linear.LUDecomposition;
import org.apache.commons.math3.linear.RealMatrix;
import org.apache.commons.math3.linear.RealVector;

/**
 * Utilitário para operações matriciais necessárias para os cálculos de planificação econômica.
 */
public class MatrixOperations {

    /**
     * Calcula o vetor de produção usando o modelo de insumo-produto de Leontief.
     * x = (I - A)^(-1) * d
     *
     * @param techMatrix Matriz tecnológica A
     * @param demandVector Vetor de demanda final d
     * @return Vetor de produção x
     * @throws RuntimeException Se a matriz for singular ou houver outro erro no cálculo
     */
    public static double[] calculateProductionVector(double[][] techMatrix, double[] demandVector) {
        try {
            // Verificar se a matriz e o vetor têm dimensões compatíveis
            if (techMatrix.length != demandVector.length) {
                throw new IllegalArgumentException("A matriz tecnológica e o vetor de demanda devem ter dimensões compatíveis");
            }
            
            // Criar matriz identidade
            int n = techMatrix.length;
            RealMatrix identity = new Array2DRowRealMatrix(n, n);
            for (int i = 0; i < n; i++) {
                identity.setEntry(i, i, 1.0);
            }
            
            // Converter matriz tecnológica para RealMatrix
            RealMatrix a = new Array2DRowRealMatrix(techMatrix);
            
            // Calcular (I - A)
            RealMatrix iMinusA = identity.subtract(a);
            
            // Calcular (I - A)^(-1) usando decomposição LU
            RealMatrix inverse = new LUDecomposition(iMinusA).getSolver().getInverse();
            
            // Converter vetor de demanda para RealVector
            RealVector d = new ArrayRealVector(demandVector);
            
            // Calcular o vetor de produção: x = (I - A)^(-1) * d
            RealVector x = inverse.operate(d);
            
            // Converter para array padrão e retornar
            return x.toArray();
        } catch (Exception e) {
            throw new RuntimeException("Erro ao calcular o vetor de produção: " + e.getMessage(), e);
        }
    }
}