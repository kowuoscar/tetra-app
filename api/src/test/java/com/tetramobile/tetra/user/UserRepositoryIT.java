package com.tetramobile.tetra.user;

import com.tetramobile.tetra.user.model.User;
import com.tetramobile.tetra.user.model.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Testcontainers
class UserRepositoryIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("tetra")
            .withUsername("tetra")
            .withPassword("tetra");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private UserRepository userRepository;

    @Test
    void findByEmailIgnoreCase_returnsUserRegardlessOfCase() {
        User user = new User();
        user.setEmail("test.user@example.com");
        user.setPasswordHash("hashed");
        user.setName("Test User");
        user.setRole(UserRole.customer);
        userRepository.save(user);

        Optional<User> found = userRepository.findByEmailIgnoreCase("TEST.USER@EXAMPLE.COM");
        assertThat(found).isPresent();
        assertThat(found.get().getEmail()).isEqualTo("test.user@example.com");
    }

    @Test
    void existsByEmailIgnoreCase_returnsTrueForSavedUser() {
        User user = new User();
        user.setEmail("exists@example.com");
        user.setPasswordHash("hashed");
        user.setName("Exists User");
        user.setRole(UserRole.company);
        userRepository.save(user);

        assertThat(userRepository.existsByEmailIgnoreCase("EXISTS@EXAMPLE.COM")).isTrue();
        assertThat(userRepository.existsByEmailIgnoreCase("notfound@example.com")).isFalse();
    }

    @Test
    void findByEmailIgnoreCase_returnsSeededAdminUser() {
        Optional<User> admin = userRepository.findByEmailIgnoreCase("ADMIN@TETRAMOBILE.AE");
        assertThat(admin).isPresent();
        assertThat(admin.get().getRole()).isEqualTo(UserRole.admin);
    }
}
