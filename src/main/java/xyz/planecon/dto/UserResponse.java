package xyz.planecon.dto;

import lombok.Data;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.User;
import xyz.planecon.model.enums.PronounType;
import xyz.planecon.model.enums.UserType;

@Data
public class UserResponse {
    private Integer id;
    private String username;
    private String name;
    private PronounType pronoun;
    private UserType type;
    private InstanceDTO instance;
    
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
        
        // Converter instância se existir
        if (user.getInstance() != null) {
            Instance userInstance = user.getInstance();
            InstanceDTO instanceDTO = new InstanceDTO();
            instanceDTO.setId(userInstance.getId());
            instanceDTO.setType(userInstance.getType().name());
            instanceDTO.setCommitteeName(userInstance.getCommitteeName());
            response.setInstance(instanceDTO);
        }
        
        return response;
    }
}