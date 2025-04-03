package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import xyz.planecon.model.entity.User;
import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {
    User findByUsername(String username);
    
    @Query("SELECT u FROM User u WHERE u.instance.id = :instanceId")
    List<User> findByInstanceId(@Param("instanceId") Integer instanceId);
}
