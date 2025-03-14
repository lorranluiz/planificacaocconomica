package xyz.planecon.dto;

import lombok.Data;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.User;
import xyz.planecon.model.enums.PronounType;
import xyz.planecon.model.enums.UserType;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonFormat;

@Data
public class UserResponse {
    private Integer id;
    private String username;
    private String name;
    private PronounType pronoun;
    private UserType type;
    private InstanceDTO instance;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    // DTO aninhado para instância
    @Data
    public static class InstanceDTO {
        private Integer id;
        private String type;
        private String committeeName;
    }
    
    public static UserResponse fromEntity(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setName(user.getName());
        response.setPronoun(user.getPronoun());
        response.setType(user.getType());
        response.setCreatedAt(user.getCreatedAt());
        
        // Converter instância se existir
        if (user.getInstance() != null) {
            InstanceDTO instanceDTO = new InstanceDTO();
            instanceDTO.setId(user.getInstance().getId());
            instanceDTO.setType(user.getInstance().getType().toString());
            instanceDTO.setCommitteeName(user.getInstance().getCommitteeName());
            response.setInstance(instanceDTO);
        }
        
        return response;
    }
}