package xyz.planecon;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

@RestController
public class HelloController {

    @GetMapping(value = "/", produces = MediaType.TEXT_HTML_VALUE)
    public String hello() {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();
        String scheme = request.getScheme();
        StringBuilder response = new StringBuilder();
        response.append("<html><body>");
        response.append("<h1>Hello, Planecon!</h1>");
        response.append("<p>(Running with ").append(scheme.toUpperCase()).append(")</p>");
        response.append("<h2>Available pages:</h2>");
        response.append("<ul>");
        response.append("<li><a href=\"/security-info\">Security Info</a></li>");
        response.append("<li><a href=\"/user-registration.html\">User Registration</a></li>");
        response.append("</ul>");
        response.append("</body></html>");
        return response.toString();
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