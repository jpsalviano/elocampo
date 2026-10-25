package com.elocampo.health;

import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

// Para o health check do contêiner e o monitor de disponibilidade: ok só
// enquanto o banco responde.
@RestController
@RequiredArgsConstructor
public class HealthController {

    private final MongoTemplate mongoTemplate;

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        try {
            mongoTemplate.executeCommand(new Document("ping", 1));
            return ResponseEntity.ok(Map.of("status", "ok"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(503).body(Map.of("status", "unavailable"));
        }
    }
}
