package com.elocampo.security;

import org.springframework.stereotype.Component;

import java.time.Clock;

// No máximo 10 cadastros por endereço por hora: o cadastro é aberto, e cada
// conta pode criar produtos e enviar imagens.
@Component
public class SignupRateLimiter extends SlidingWindowLimiter {

    public SignupRateLimiter() {
        super(10, 60 * 60 * 1000, "Muitos cadastros a partir deste endereço. Tente de novo mais tarde.", Clock.systemUTC());
    }
}
