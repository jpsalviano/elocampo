package com.elocampo.auth.token.controller;

import com.elocampo.auth.token.TokenInput;
import com.elocampo.auth.token.TokenResponse;
import com.elocampo.auth.token.service.TokenService;
import com.elocampo.security.ClientAddress;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/token")
@RequiredArgsConstructor
public class TokenController {

    private final TokenService tokenService;

    @PostMapping
    public ResponseEntity<TokenResponse> generate(@Valid @RequestBody TokenInput request, HttpServletRequest http) {
        return ResponseEntity.ok(tokenService.generate(request, ClientAddress.of(http)));
    }
}
