package xyz.planecon.config;

import org.apache.catalina.connector.Connector;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ServerConfig {

    @Value("${server.port}")
    private int serverPort;

    // Comentado: não precisamos de conector HTTP adicional no desenvolvimento
    // Isso evita problemas com portas privilegiadas (<1024) que precisam de sudo
    //
    // @Bean
    // public WebServerFactoryCustomizer<TomcatServletWebServerFactory> servletContainerCustomizer() {
    //     return factory -> {
    //         Connector connector = new Connector(TomcatServletWebServerFactory.DEFAULT_PROTOCOL);
    //         connector.setPort(80);
    //         connector.setRedirectPort(serverPort);
    //         factory.addAdditionalTomcatConnectors(connector);
    //     };
    // }
}