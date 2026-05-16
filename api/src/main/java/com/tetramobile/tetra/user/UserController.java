package com.tetramobile.tetra.user;

import com.tetramobile.tetra.shared.dto.PagedResponse;
import com.tetramobile.tetra.shared.security.AuthenticatedUser;
import com.tetramobile.tetra.shared.security.SecurityUtils;
import com.tetramobile.tetra.user.dto.CreateUserRequest;
import com.tetramobile.tetra.user.dto.UpdateUserRequest;
import com.tetramobile.tetra.user.dto.UserSummaryResponse;
import com.tetramobile.tetra.user.model.UserRole;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<PagedResponse<UserSummaryResponse>> list(
            @RequestParam(required = false) UserRole role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") @Max(100) int size) {
        SecurityUtils.requireAdmin();
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<UserSummaryResponse> result = userService.listUsers(role, pageable);
        return ResponseEntity.ok(PagedResponse.from(result));
    }

    @PostMapping
    public ResponseEntity<UserSummaryResponse> create(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(201).body(userService.createUser(request));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<UserSummaryResponse> update(@PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        AuthenticatedUser caller = SecurityUtils.currentUser();
        userService.deactivateUser(id, caller.userId());
        return ResponseEntity.noContent().build();
    }
}
