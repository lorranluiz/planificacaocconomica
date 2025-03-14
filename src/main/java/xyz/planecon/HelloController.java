package xyz.planecon;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

@Controller // Alterado de RestController para Controller para permitir redirecionamento
public class HelloController {

    @GetMapping("/")
    public String home() {
        // Redirecionar para a página index.html
        return "redirect:/index.html";
    }
    
    @GetMapping(value = "/hello", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody // Necessário para retornar HTML diretamente
    public String hello() {
        return "<html><body><h1>Hello World!</h1></body></html>";
    }
    
    @GetMapping("/security-info")
    @ResponseBody
    public String securityInfo() {
        return "Security info";
    }
}