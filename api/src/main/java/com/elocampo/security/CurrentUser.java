package com.elocampo.security;

import com.elocampo.common.exceptions.ForbiddenException;
import org.springframework.security.core.context.SecurityContextHolder;

// Quem está chamando: lido do banco a cada requisição (JwtAuthFilter), então um
// usuário desativado ou um admin revogado perde o acesso na hora, diga o token o que disser.
public record CurrentUser(String userId, String email, boolean admin) {

    public static CurrentUser get() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof CurrentUser user)) {
            throw new ForbiddenException("authentication required");
        }
        return user;
    }

    public void requireAdmin() {
        if (!admin) {
            throw new ForbiddenException("admin only");
        }
    }
}
