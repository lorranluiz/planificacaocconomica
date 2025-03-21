package xyz.planecon.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Utilitário para operações matriciais necessárias para os cálculos de planificação econômica.
 */
public class MatrixOperations {
    
    private static final Logger logger = LoggerFactory.getLogger(MatrixOperations.class);
    
    /**
     * Calcula o vetor de produção usando o modelo de Leontief:
     * x = (I - A)^-1 * y
     * 
     * Onde:
     * x = vetor de produção
     * I = matriz identidade
     * A = matriz tecnológica
     * y = vetor de demanda final
     */
    public static double[] calculateProductionVector(double[][] techMatrix, double[] demandVector) {
        try {
            int n = techMatrix.length;
            
            // Validar dimensões
            if (n == 0 || techMatrix[0].length != n || demandVector.length != n) {
                throw new IllegalArgumentException("Dimensões incompatíveis: matriz tecnológica deve ser quadrada e vetor de demanda deve ter o mesmo tamanho");
            }
            
            // Criar matriz identidade
            double[][] identityMatrix = createIdentityMatrix(n);
            
            // Calcular (I - A)
            double[][] iMinusA = subtractMatrices(identityMatrix, techMatrix);
            
            // Calcular (I - A)^-1
            double[][] inverseIMinusA = invert(iMinusA);
            
            // Calcular (I - A)^-1 * y
            double[] productionVector = multiplyMatrixByVector(inverseIMinusA, demandVector);
            
            return productionVector;
        } catch (Exception e) {
            logger.error("Erro no cálculo do vetor de produção: {}", e.getMessage(), e);
            throw new RuntimeException("Erro no cálculo do vetor de produção: " + e.getMessage(), e);
        }
    }
    
    /**
     * Cria uma matriz identidade de tamanho n x n
     */
    private static double[][] createIdentityMatrix(int n) {
        double[][] identity = new double[n][n];
        for (int i = 0; i < n; i++) {
            identity[i][i] = 1.0;
        }
        return identity;
    }
    
    /**
     * Subtrai duas matrizes: C = A - B
     */
    private static double[][] subtractMatrices(double[][] a, double[][] b) {
        int n = a.length;
        double[][] result = new double[n][n];
        
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                result[i][j] = a[i][j] - b[i][j];
            }
        }
        
        return result;
    }
    
    /**
     * Multiplica uma matriz por um vetor: y = A * x
     */
    private static double[] multiplyMatrixByVector(double[][] matrix, double[] vector) {
        int n = matrix.length;
        double[] result = new double[n];
        
        for (int i = 0; i < n; i++) {
            double sum = 0.0;
            for (int j = 0; j < n; j++) {
                sum += matrix[i][j] * vector[j];
            }
            result[i] = sum;
        }
        
        return result;
    }
    
    /**
     * Calcula a matriz inversa utilizando o método de eliminação Gaussiana com pivotamento
     */
    private static double[][] invert(double[][] a) throws RuntimeException {
        int n = a.length;
        double[][] matrix = deepCopy(a);
        double[][] inverse = createIdentityMatrix(n);
        
        // Eliminação Gaussiana com pivotamento parcial
        for (int k = 0; k < n; k++) {
            // Encontrar o pivô (maior elemento na coluna k)
            int maxRow = k;
            double maxVal = Math.abs(matrix[k][k]);
            
            for (int i = k + 1; i < n; i++) {
                if (Math.abs(matrix[i][k]) > maxVal) {
                    maxVal = Math.abs(matrix[i][k]);
                    maxRow = i;
                }
            }
            
            // Verificar se a matriz é singular
            if (maxVal < 1e-10) {
                throw new RuntimeException("Matriz é singular ou próxima de singular");
            }
            
            // Trocar linhas se necessário
            if (maxRow != k) {
                swapRows(matrix, k, maxRow);
                swapRows(inverse, k, maxRow);
            }
            
            // Escalonar a linha k
            double pivot = matrix[k][k];
            for (int j = 0; j < n; j++) {
                matrix[k][j] /= pivot;
                inverse[k][j] /= pivot;
            }
            
            // Eliminar outras linhas
            for (int i = 0; i < n; i++) {
                if (i != k) {
                    double factor = matrix[i][k];
                    for (int j = 0; j < n; j++) {
                        matrix[i][j] -= factor * matrix[k][j];
                        inverse[i][j] -= factor * inverse[k][j];
                    }
                }
            }
        }
        
        return inverse;
    }
    
    /**
     * Troca duas linhas de uma matriz
     */
    private static void swapRows(double[][] matrix, int row1, int row2) {
        double[] temp = matrix[row1];
        matrix[row1] = matrix[row2];
        matrix[row2] = temp;
    }
    
    /**
     * Cria uma cópia profunda de uma matriz
     */
    private static double[][] deepCopy(double[][] matrix) {
        int n = matrix.length;
        double[][] copy = new double[n][n];
        
        for (int i = 0; i < n; i++) {
            System.arraycopy(matrix[i], 0, copy[i], 0, n);
        }
        
        return copy;
    }
}