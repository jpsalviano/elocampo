package com.elocampo.account.service;

import com.elocampo.account.AccountEvaluationInput;
import com.elocampo.account.AccountEvaluationResponse;
import com.elocampo.account.AccountInput;
import com.elocampo.account.AccountResponse;
import com.elocampo.security.CurrentUser;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccountService {

    AccountResponse create(@Valid AccountInput request, CurrentUser user);

    AccountResponse update(UUID accountId, @Valid AccountInput request, CurrentUser user);

    // Dados completos para o dono e os admins; os outros recebem o perfil público.
    Optional<AccountResponse> findById(UUID accountId, CurrentUser viewer);

    List<AccountResponse> findAll();

    Optional<AccountResponse> findByUserId(UUID userId, CurrentUser viewer);

    void deactivate(UUID accountId);

    void activate(UUID accountId);

    Optional<AccountResponse> evaluate(UUID accountId, @Valid AccountEvaluationInput request, CurrentUser user);

    List<AccountEvaluationResponse> evaluations(UUID accountId);

    // Para os outros domínios.
    Optional<AccountResponse> findOwn(CurrentUser user);

    AccountResponse requireOwn(CurrentUser user);

    Optional<AccountResponse> findActive(UUID accountId);
}
