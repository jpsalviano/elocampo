package com.elocampo.demo;

import com.elocampo.config.ElocampoProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

// O que a tela de login mostra: as contas de exemplo e a senha delas.
// Pública de propósito: é uma demonstração, zerada todo dia.
@RestController
@RequiredArgsConstructor
public class DemoController {

    private final ElocampoProperties properties;

    @GetMapping("/demo")
    public ResponseEntity<Map<String, Object>> demo() {
        if (!properties.demoEnabled()) {
            return ResponseEntity.ok(Map.of("enabled", false));
        }
        var accounts = List.of(
                Map.of("label", "Produtor", "email", DemoSeeder.VENDOR_EMAIL),
                Map.of("label", "Comprador", "email", DemoSeeder.BUYER_EMAIL),
                Map.of("label", "Administrador", "email", DemoSeeder.ADMIN_EMAIL));
        return ResponseEntity.ok(Map.of(
                "enabled", true,
                "password", properties.demoPassword(),
                "accounts", accounts,
                "resetsAt", "04:00 (" + properties.demoZone() + ")"));
    }
}
