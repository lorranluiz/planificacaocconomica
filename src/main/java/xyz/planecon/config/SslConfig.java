package xyz.planecon.config;

import org.apache.catalina.connector.Connector;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.Ssl;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.boot.web.servlet.server.ServletWebServerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.File;

@Configuration
public class SslConfig {

    @Value("${server.port:8443}")
    private int serverPort;

    @Value("${server.http.port:8080}")
    private int httpPort;

    @Value("${server.prod.keystore.path:/path/to/production/keystore.p12}")
    private String prodKeystorePath;

    @Bean
    public ServletWebServerFactory servletContainer() {
        TomcatServletWebServerFactory tomcat = new TomcatServletWebServerFactory();
        
        // Add HTTP connector alongside HTTPS
        tomcat.addAdditionalTomcatConnectors(createStandardConnector());
        
        return tomcat;
    }

    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> sslCustomizer() {
        return (factory) -> {
            Ssl ssl = new Ssl();
            
            File prodKeystore = new File(prodKeystorePath);
            if (prodKeystore.exists()) {
                // Use production certificate if available
                System.out.println("Using production keystore: " + prodKeystorePath);
                ssl.setKeyStore(prodKeystorePath);
                ssl.setKeyStorePassword("your-prod-password");
            } else {
                // Fall back to self-signed certificate
                System.out.println("Production keystore not found. Using self-signed certificate.");
                ssl.setKeyStore("classpath:keystore/planecon-keystore.p12");
                ssl.setKeyStoreType("PKCS12");
                ssl.setKeyPassword("planecon123");
                ssl.setKeyStorePassword("planecon123");
            }
            
            ssl.setEnabled(true);
            factory.setSsl(ssl);
        };
    }

    private Connector createStandardConnector() {
        Connector connector = new Connector(TomcatServletWebServerFactory.DEFAULT_PROTOCOL);
        connector.setPort(httpPort);
        return connector;
    }
}