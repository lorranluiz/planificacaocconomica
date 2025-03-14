package xyz.planecon.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import xyz.planecon.model.entity.User;
import xyz.planecon.repository.UserRepository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@Service
public class UserService {

    private final UserRepository userRepository;

    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<User> getAllUsers() {
        return StreamSupport.stream(userRepository.findAll().spliterator(), false)
                .collect(Collectors.toList());
    }

    public Optional<User> getUserById(Integer id) {
        return userRepository.findById(id);
    }

    public Optional<User> authenticate(String username, String password) {
        User user = userRepository.findByUsername(username);
        
        if (user != null && password.equals(user.getPassword())) {
            return Optional.of(user);
        }
        
        return Optional.empty();
    }

    public Optional<User> getUserByUsername(String username) {
        User user = userRepository.findByUsername(username);
        return Optional.ofNullable(user);
    }

    public User saveUser(User user) {
        return userRepository.save(user);
    }

    public void deleteUser(Integer id) {
        userRepository.deleteById(id);
    }

    public Page<User> findAllPaginated(Pageable pageable) {
        return userRepository.findAll(pageable);
    }
}
