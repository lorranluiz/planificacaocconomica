package xyz.planecon.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

import javax.sql.DataSource;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;

@SpringBootApplication(scanBasePackages = "xyz.planecon.config")
@Profile("fix-constraints")
public class DatabaseConstraintFixer {

    @Autowired
    private DataSource dataSource;

    public static void main(String[] args) {
        SpringApplication.run(DatabaseConstraintFixer.class, args);
    }

    @Bean
    public CommandLineRunner fixConstraints(ApplicationContext ctx) {
        return args -> {
            System.out.println("=== INICIANDO CORREÇÃO INDEPENDENTE DE CONSTRAINTS ===");
            
            // 1. Gerar script SQL
            String sqlScript = generateFixingScript();
            
            // 2. Salvar script em um arquivo temporário
            Path scriptPath = Files.createTempFile("fix-constraints-", ".sql");
            try (BufferedWriter writer = new BufferedWriter(new FileWriter(scriptPath.toFile()))) {
                writer.write(sqlScript);
            }
            
            System.out.println("Script SQL gerado em: " + scriptPath.toString());
            
            // 3. Executar o script usando uma conexão JDBC direta (fora do contexto de transação JPA)
            try (Connection conn = dataSource.getConnection()) {
                conn.setAutoCommit(true); // Modo auto-commit para não depender de transações
                System.out.println("Executando o script SQL...");
                ScriptUtils.executeSqlScript(conn, new FileSystemResource(scriptPath.toFile()));
                System.out.println("Script SQL executado com sucesso!");
            } catch (Exception e) {
                System.err.println("Erro ao executar o script: " + e.getMessage());
                e.printStackTrace();
            }
            
            System.out.println("=== CORREÇÃO DE CONSTRAINTS CONCLUÍDA ===");
            
            // 4. Encerrar a aplicação
            SpringApplication.exit(ctx, () -> 0);
        };
    }
    
    private String generateFixingScript() {
        return "-- Script para corrigir inconsistências e reativar constraints\n\n" +
               "-- Desativar temporariamente as constraints\n" +
               "ALTER TABLE instance DROP CONSTRAINT IF EXISTS chk_council_columns;\n" +
               "ALTER TABLE instance DROP CONSTRAINT IF EXISTS chk_worker_columns;\n" +
               "ALTER TABLE instance DROP CONSTRAINT IF EXISTS chk_worker_effective_limit;\n\n" +
               
               "-- 1. Corrigir problemas em instâncias tipo COUNCIL\n" +
               "UPDATE instance SET total_social_work_of_this_jurisdiction = 50000 \n" +
               "WHERE type = 'COUNCIL' AND total_social_work_of_this_jurisdiction IS NULL;\n\n" +
               
               "-- 2. Corrigir self-reference em conselhos\n" +
               "UPDATE instance SET popular_council_associated_with_popular_council = id \n" +
               "WHERE type = 'COUNCIL' AND popular_council_associated_with_popular_council IS NULL;\n\n" +
               
               "-- 3. Corrigir problemas em instâncias tipo WORKER\n" +
               "-- Primeiro, garantir que temos pelo menos um conselho e um comitê para referência\n" +
               "DO $$\n" +
               "DECLARE\n" +
               "  council_id INTEGER;\n" +
               "  committee_id INTEGER;\n" +
               "BEGIN\n" +
               "  -- Obter IDs de referência\n" +
               "  SELECT id INTO council_id FROM instance WHERE type = 'COUNCIL' LIMIT 1;\n" +
               "  SELECT id INTO committee_id FROM instance WHERE type = 'COMMITTEE' LIMIT 1;\n" +
               "  \n" +
               "  -- Corrigir workers com dados inconsistentes\n" +
               "  IF council_id IS NOT NULL AND committee_id IS NOT NULL THEN\n" +
               "    UPDATE instance SET \n" +
               "      popular_council_associated_with_committee_or_worker = council_id,\n" +
               "      id_associated_worker_committee = committee_id,\n" +
               "      id_associated_worker_residents_association = 0,\n" +
               "      estimated_individual_participation_in_social_work = 0.0000001,\n" +
               "      hours_at_electronic_point = 20\n" +
               "    WHERE type = 'WORKER' AND\n" +
               "     (popular_council_associated_with_committee_or_worker IS NULL OR\n" +
               "      id_associated_worker_committee IS NULL OR\n" +
               "      id_associated_worker_residents_association IS NULL OR\n" +
               "      id_associated_worker_residents_association != 0 OR\n" +
               "      estimated_individual_participation_in_social_work IS NULL OR\n" +
               "      hours_at_electronic_point IS NULL);\n" +
               "  END IF;\n" +
               "END$$;\n\n" +
               
               "-- 4. Corrigir problemas em instâncias tipo COMMITTEE\n" +
               "UPDATE instance SET worker_effective_limit = 20 \n" +
               "WHERE type = 'COMMITTEE' AND worker_effective_limit IS NULL;\n\n" +
               
               "UPDATE instance SET worker_effective_limit = NULL \n" +
               "WHERE type != 'COMMITTEE' AND worker_effective_limit IS NOT NULL;\n\n" +
               
               "-- 5. Reativar constraints\n" +
               "ALTER TABLE instance ADD CONSTRAINT chk_council_columns \n" +
               "CHECK (type != 'COUNCIL' OR (total_social_work_of_this_jurisdiction IS NOT NULL AND \n" +
               "popular_council_associated_with_popular_council IS NOT NULL));\n\n" +
               
               "ALTER TABLE instance ADD CONSTRAINT chk_worker_columns \n" +
               "CHECK (type != 'WORKER' OR (popular_council_associated_with_committee_or_worker IS NOT NULL AND \n" +
               "id_associated_worker_committee IS NOT NULL AND id_associated_worker_residents_association = 0 AND \n" +
               "estimated_individual_participation_in_social_work IS NOT NULL AND hours_at_electronic_point IS NOT NULL));\n\n" +
               
               "ALTER TABLE instance ADD CONSTRAINT chk_worker_effective_limit \n" +
               "CHECK ((type = 'COMMITTEE' AND worker_effective_limit IS NOT NULL) OR \n" +
               "(type != 'COMMITTEE' AND worker_effective_limit IS NULL));\n\n" +
               
               "-- 6. Verificar se ainda há problemas\n" +
               "SELECT 'Conselhos com problemas: ' || COUNT(*) FROM instance \n" +
               "WHERE type = 'COUNCIL' AND (total_social_work_of_this_jurisdiction IS NULL OR \n" +
               "popular_council_associated_with_popular_council IS NULL);\n\n" +
               
               "SELECT 'Workers com problemas: ' || COUNT(*) FROM instance \n" +
               "WHERE type = 'WORKER' AND (popular_council_associated_with_committee_or_worker IS NULL OR \n" +
               "id_associated_worker_committee IS NULL OR id_associated_worker_residents_association IS NULL OR \n" +
               "id_associated_worker_residents_association != 0 OR estimated_individual_participation_in_social_work IS NULL OR \n" +
               "hours_at_electronic_point IS NULL);\n\n" +
               
               "SELECT 'Comitês com problemas: ' || COUNT(*) FROM instance \n" +
               "WHERE (type = 'COMMITTEE' AND worker_effective_limit IS NULL) OR \n" +
               "(type != 'COMMITTEE' AND worker_effective_limit IS NOT NULL);";
    }
}