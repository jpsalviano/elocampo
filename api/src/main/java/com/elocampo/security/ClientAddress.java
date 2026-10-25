package com.elocampo.security;

import jakarta.servlet.http.HttpServletRequest;

public final class ClientAddress {

    private ClientAddress() {}

    // O nginx põe em X-Real-IP o endereço de quem chama; localmente e nos testes
    // não há proxy, então vale o endereço da conexão.
    public static String of(HttpServletRequest request) {
        var real = request.getHeader("X-Real-IP");
        return real != null && !real.isBlank() ? real : request.getRemoteAddr();
    }
}
