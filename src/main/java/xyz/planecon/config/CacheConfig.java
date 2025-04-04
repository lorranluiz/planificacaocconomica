package xyz.planecon.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.cache.support.CompositeCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Primary;

import com.github.benmanes.caffeine.cache.Caffeine;

import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    @Primary
    @Bean
    public CacheManager cacheManager() {
        // Cache de memória simples para dados menores e frequentemente acessados
        ConcurrentMapCacheManager simpleCacheManager = new ConcurrentMapCacheManager(
            "users",
            "sectors",
            "committees",
            "councils",
            "committeeMembers"
        );
        
        // Cache baseado em Caffeine para dados frequentemente utilizados mas com expiração curta
        CaffeineCacheManager shortLivedCacheManager = new CaffeineCacheManager(
            "materializations", 
            "availableMaterializations",  // Adicionado o cache faltante
            "instances", 
            "technologicalMatrix", 
            "demandVector"
        );
        
        Caffeine<Object, Object> shortLivedCaffeine = Caffeine.newBuilder()
            .maximumSize(100)
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .recordStats();
        
        shortLivedCacheManager.setCaffeine(shortLivedCaffeine);
        
        // Cache baseado em Caffeine para resultados de operações pesadas com expiração mais longa
        CaffeineCacheManager longLivedCacheManager = new CaffeineCacheManager(
            "committeeState", 
            "technologicalTensors", 
            "demandVectors", 
            "demandStocks",
            "planificationResults",
            "planificationData"
        );
        
        Caffeine<Object, Object> longLivedCaffeine = Caffeine.newBuilder()
            .maximumSize(500)
            .expireAfterWrite(30, TimeUnit.MINUTES)
            .expireAfterAccess(15, TimeUnit.MINUTES)
            .recordStats();
        
        longLivedCacheManager.setCaffeine(longLivedCaffeine);
        
        // Combinar os gerenciadores de cache
        return new CompositeCacheManager(simpleCacheManager, shortLivedCacheManager, longLivedCacheManager);
    }
}
