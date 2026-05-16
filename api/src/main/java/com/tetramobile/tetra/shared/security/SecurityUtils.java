package com.tetramobile.tetra.shared.security;

import com.tetramobile.tetra.shared.exception.ForbiddenException;
import com.tetramobile.tetra.shared.exception.UnauthorizedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class SecurityUtils {

    private SecurityUtils() {}

    public static AuthenticatedUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthenticatedUser user)) {
            throw new UnauthorizedException("unauthenticated", "Authentication required");
        }
        return user;
    }

    public static void requireAdmin() {
        AuthenticatedUser user = currentUser();
        if (!user.isAdmin()) {
            throw new ForbiddenException("forbidden", "Admin access required");
        }
    }

    public static void requireAdminOrCompany() {
        AuthenticatedUser user = currentUser();
        if (user.isCustomer()) {
            throw new ForbiddenException("forbidden", "Access denied");
        }
    }
}
