package com.elocampo.account.controller;

import com.elocampo.account.AccountEvaluationInput;
import com.elocampo.account.AccountEvaluationResponse;
import com.elocampo.account.AccountInput;
import com.elocampo.account.AccountResponse;
import com.elocampo.account.service.AccountService;
import com.elocampo.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/account")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @PostMapping
    public ResponseEntity<AccountResponse> create(@Valid @RequestBody AccountInput request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(accountService.create(request, CurrentUser.get()));
    }

    // Só admin (SecurityConfig).
    @GetMapping("/all")
    public ResponseEntity<List<AccountResponse>> findAll() {
        return ResponseEntity.ok(accountService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AccountResponse> findById(@PathVariable UUID id) {
        return accountService.findById(id, CurrentUser.get())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<AccountResponse> update(@PathVariable UUID id, @Valid @RequestBody AccountInput request) {
        return ResponseEntity.ok(accountService.update(id, request, CurrentUser.get()));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<AccountResponse> findByUserId(@PathVariable UUID userId) {
        return accountService.findByUserId(userId, CurrentUser.get())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Só admin (SecurityConfig).
    @PutMapping("/{id}/deactivate")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        accountService.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/activate")
    public ResponseEntity<Void> activate(@PathVariable UUID id) {
        accountService.activate(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{accountId}/evaluate")
    public ResponseEntity<AccountResponse> evaluate(@PathVariable UUID accountId,
                                                    @Valid @RequestBody AccountEvaluationInput request) {
        return accountService.evaluate(accountId, request, CurrentUser.get())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{accountId}/evaluations")
    public ResponseEntity<List<AccountEvaluationResponse>> evaluations(@PathVariable UUID accountId) {
        return ResponseEntity.ok(accountService.evaluations(accountId));
    }
}
