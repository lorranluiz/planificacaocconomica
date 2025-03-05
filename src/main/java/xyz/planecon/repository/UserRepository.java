package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.planecon.model.entity.Instance;
import xyz.planecon.model.entity.User;

import java.util.List;

public interface UserRepository extends JpaRepository<User, Integer> {
    User findByUsername(String username);
    
    // Adicionar este método para contar usuários por ID de instância
    Long countByInstanceId(Integer instanceId);
    
    // Adicionar este método para buscar usuários por instância
    List<User> findByInstanceId(Integer instanceId);
    
    User findByInstance(Instance instance);
    
    List<User> findAllByInstance(Instance instance);
}
