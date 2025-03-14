package xyz.planecon;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.web.servlet.context.ServletWebServerInitializedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;

@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
    
    @Bean
    public ApplicationListener<ServletWebServerInitializedEvent> serverPortLogger(Environment environment) {
        return event -> {
            Integer port = event.getWebServer().getPort();
            String protocol = "https"; // We know it's HTTPS now
            String contextPath = event.getApplicationContext().getServletContext().getContextPath();
            if (contextPath == null || contextPath.isEmpty()) {
                contextPath = "/";
            }
            
            String hostAddress = "localhost";
            String portDisplay = port == 443 ? "" : ":" + port;
            
            System.out.println("\n----------------------------------------------------------");
            System.out.println("Application is running!");
            System.out.println("Access URL: " + protocol + "://" + hostAddress + portDisplay + contextPath);
            System.out.println("HTTP requests will be redirected to HTTPS");
            System.out.println("----------------------------------------------------------\n");
        };
    }
}
