package xyz.planecon.config;

import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@Configuration
@EnableTransactionManagement
@EntityScan(basePackages = "xyz.planecon.model.entity")
@EnableJpaRepositories(basePackages = "xyz.planecon.repository")
public class DatabaseConfig {
    // Configuration is handled through application.properties
    // Additional beans can be defined here if needed
}
