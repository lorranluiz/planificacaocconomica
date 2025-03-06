package xyz.planecon.repository;

import xyz.planecon.model.entity.User;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Integer> {
    User findByUsername(String username);
    
    List<User> findByInstanceId(Integer instanceId);
}
