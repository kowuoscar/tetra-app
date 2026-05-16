package com.tetramobile.tetra.user;

import com.tetramobile.tetra.user.dto.CreateUserRequest;
import com.tetramobile.tetra.user.dto.UpdateUserRequest;
import com.tetramobile.tetra.user.dto.UserSummaryResponse;
import com.tetramobile.tetra.user.model.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface UserService {

    Page<UserSummaryResponse> listUsers(UserRole roleFilter, Pageable pageable);

    UserSummaryResponse createUser(CreateUserRequest request);

    UserSummaryResponse updateUser(UUID id, UpdateUserRequest request);

    void deactivateUser(UUID id, UUID callerUserId);
}
