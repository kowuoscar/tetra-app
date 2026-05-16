package com.tetramobile.tetra.user;

import com.tetramobile.tetra.customer.CustomerRepository;
import com.tetramobile.tetra.shared.exception.ConflictException;
import com.tetramobile.tetra.shared.exception.NotFoundException;
import com.tetramobile.tetra.shared.exception.UnprocessableEntityException;
import com.tetramobile.tetra.shared.security.SecurityUtils;
import com.tetramobile.tetra.user.dto.CreateUserRequest;
import com.tetramobile.tetra.user.dto.UpdateUserRequest;
import com.tetramobile.tetra.user.dto.UserSummaryResponse;
import com.tetramobile.tetra.user.model.User;
import com.tetramobile.tetra.user.model.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public Page<UserSummaryResponse> listUsers(UserRole roleFilter, Pageable pageable) {
        SecurityUtils.requireAdmin();
        if (roleFilter != null) {
            return userRepository.findByRole(roleFilter, pageable).map(UserSummaryResponse::from);
        }
        return userRepository.findAll(pageable).map(UserSummaryResponse::from);
    }

    @Override
    @Transactional
    public UserSummaryResponse createUser(CreateUserRequest request) {
        SecurityUtils.requireAdmin();
        if (request.role() == UserRole.admin)
            throw new UnprocessableEntityException("invalid_role", "Cannot create admin via API");
        if (userRepository.existsByEmailIgnoreCase(request.email()))
            throw new ConflictException("email_already_in_use", "Email address is already in use");
        if (request.role() == UserRole.customer) {
            if (request.customerId() == null)
                throw new UnprocessableEntityException("customer_id_required",
                        "customer_id is required for customer role");
            if (!customerRepository.existsById(request.customerId()))
                throw new UnprocessableEntityException("customer_not_found", "Customer not found");
        }

        User user = new User();
        user.setEmail(request.email().toLowerCase());
        user.setName(request.name());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role());
        user.setCustomerId(request.role() == UserRole.customer ? request.customerId() : null);
        return UserSummaryResponse.from(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserSummaryResponse updateUser(UUID id, UpdateUserRequest request) {
        SecurityUtils.requireAdmin();
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
        if (request.email() != null) {
            if (userRepository.existsByEmailIgnoreCaseAndIdNot(request.email(), id))
                throw new ConflictException("email_already_in_use", "Email address is already in use");
            user.setEmail(request.email().toLowerCase());
        }
        if (request.name() != null) user.setName(request.name());
        if (request.password() != null) user.setPasswordHash(passwordEncoder.encode(request.password()));
        return UserSummaryResponse.from(userRepository.save(user));
    }

    @Override
    @Transactional
    public void deactivateUser(UUID id, UUID callerUserId) {
        SecurityUtils.requireAdmin();
        if (id.equals(callerUserId))
            throw new UnprocessableEntityException("cannot_deactivate_self",
                    "Cannot deactivate your own account");
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.setActive(false);
        userRepository.save(user);
    }
}
