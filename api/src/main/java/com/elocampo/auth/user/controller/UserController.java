package com.elocampo.auth.user.controller;

import com.elocampo.auth.user.UserInput;
import com.elocampo.auth.user.UserResponse;
import com.elocampo.auth.user.service.UserService;
import com.elocampo.security.ClientAddress;
import com.elocampo.security.CurrentUser;
import com.elocampo.security.SignupRateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final SignupRateLimiter signupRateLimiter;

    @PostMapping
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UserInput request, HttpServletRequest http) {
        var address = ClientAddress.of(http);
        signupRateLimiter.check(address);
        var created = userService.create(request);
        signupRateLimiter.record(address);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // Só admin (SecurityConfig).
    @GetMapping("/all")
    public ResponseEntity<List<UserResponse>> findAll() {
        return ResponseEntity.ok(userService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> findById(@PathVariable UUID id) {
        var me = CurrentUser.get();
        if (!me.admin() && !me.userId().equals(id.toString())) {
            me.requireAdmin();
        }
        return userService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Só admin (SecurityConfig): qualquer outro poderia sondar quais e-mails existem.
    @GetMapping("/email/{email}")
    public ResponseEntity<UserResponse> findByEmail(@PathVariable String email) {
        return userService.findByEmail(email)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/deactivate")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        userService.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/activate")
    public ResponseEntity<Void> activate(@PathVariable UUID id) {
        userService.activate(id);
        return ResponseEntity.noContent().build();
    }
}
