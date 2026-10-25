package com.elocampo.auth.token.service;

import com.elocampo.auth.token.TokenInput;
import com.elocampo.auth.token.TokenResponse;

public interface TokenService {

    TokenResponse generate(TokenInput request, String clientAddress);
}
