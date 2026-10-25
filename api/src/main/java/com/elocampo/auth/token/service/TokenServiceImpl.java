package com.elocampo.auth.token.service;

import com.elocampo.auth.token.TokenInput;
import com.elocampo.auth.token.TokenResponse;
import com.elocampo.auth.user.repository.UserRepository;
import com.elocampo.common.exceptions.ValidationErrorException;
import com.elocampo.security.JwtService;
import com.elocampo.security.LoginRateLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
@Slf4j
@RequiredArgsConstructor
public class TokenServiceImpl implements TokenService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginRateLimiter rateLimiter;

    // Comparado quando o e-mail não existe: um e-mail errado demora o mesmo que
    // uma senha errada, e o tempo de resposta não revela quais contas existem.
    private String dummyHash;

    private String dummyHash() {
        if (dummyHash == null) dummyHash = passwordEncoder.encode(java.util.UUID.randomUUID().toString());
        return dummyHash;
    }

    @Override
    public TokenResponse generate(TokenInput request, String clientAddress) {
        rateLimiter.check(clientAddress);
        var email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        var user = userRepository.findByEmailAndRemovedFalse(email);
        var matches = passwordEncoder.matches(request.getPassword(), user.map(u -> u.getPassword()).orElseGet(this::dummyHash));
        if (user.isEmpty() || !matches) {
            rateLimiter.failed(clientAddress);
            throw new ValidationErrorException("Invalid credentials");
        }
        var found = user.get();
        log.info("Token generated for user (userId={})", found.getId());
        return new TokenResponse(jwtService.issue(found.getId(), found.getEmail(), found.isAdmin()));
    }
}
