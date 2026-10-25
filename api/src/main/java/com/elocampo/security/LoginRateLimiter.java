package com.elocampo.security;

import org.springframework.stereotype.Component;

import java.time.Clock;

// No máximo 10 logins errados por endereço a cada 15 minutos.
@Component
public class LoginRateLimiter extends SlidingWindowLimiter {

    public LoginRateLimiter() {
        super(10, 15 * 60 * 1000, "Muitas tentativas de login. Tente de novo em alguns minutos.", Clock.systemUTC());
    }

    public void failed(String address) {
        record(address);
    }
}
