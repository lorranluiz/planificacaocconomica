package xyz.planecon.dto;

import xyz.planecon.model.entity.User;
import xyz.planecon.model.enums.PronounType;
import xyz.planecon.model.enums.UserType;

public class UserResponse {
    private Integer id;
    private String username;
    private String name;
    private String type;
    private String pronoun;
    
    public static UserResponse fromEntity(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setName(user.getName());
        response.setType(user.getType().toString());
        response.setPronoun(user.getPronoun().toString());
        return response;
    }
    
    // Getters e setters
    public Integer getId() {
        return id;
    }
    
    public void setId(Integer id) {
        this.id = id;
    }
    
    public String getUsername() {
        return username;
    }
    
    public void setUsername(String username) {
        this.username = username;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getType() {
        return type;
    }
    
    public void setType(String type) {
        this.type = type;
    }
    
    public String getPronoun() {
        return pronoun;
    }
    
    public void setPronoun(String pronoun) {
        this.pronoun = pronoun;
    }
}