package xyz.planecon;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

@RestController
public class HelloController {

    @GetMapping("/")
    public String hello() {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();
        String scheme = request.getScheme();
        return "Hello, Planecon! (Running with " + scheme.toUpperCase() + ")\n";
    }
    
    @GetMapping("/security-info")
    public String securityInfo() {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();
        StringBuilder info = new StringBuilder();
        
        info.append("Protocol: ").append(request.getProtocol()).append("\n");
        info.append("Scheme: ").append(request.getScheme()).append("\n");
        info.append("Secure: ").append(request.isSecure()).append("\n");
        info.append("Server Name: ").append(request.getServerName()).append("\n");
        info.append("Server Port: ").append(request.getServerPort()).append("\n");
        
        return info.toString();
    }
}