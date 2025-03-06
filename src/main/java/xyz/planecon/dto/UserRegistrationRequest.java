package xyz.planecon.dto;

import xyz.planecon.model.enums.PronounType;
import xyz.planecon.model.enums.UserType;

public class UserRegistrationRequest {
    private String name;
    private String username;
    private String password;
    private String type;
    private String pronoun;
    private Integer instanceId;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
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

    public Integer getInstanceId() {
        return instanceId;
    }

    public void setInstanceId(Integer instanceId) {
        this.instanceId = instanceId;
    }

    public UserType getUserType() {
        return UserType.valueOf(type);
    }

    public PronounType getPronounType() {
        return PronounType.valueOf(pronoun);
    }

    @Override
    public String toString() {
        return "UserRegistrationRequest{" +
                "name='" + name + '\'' +
                ", username='" + username + '\'' +
                ", password='[PROTECTED]'" +
                ", type='" + type + '\'' +
                ", pronoun='" + pronoun + '\'' +
                ", instanceId=" + instanceId +
                '}';
    }
}