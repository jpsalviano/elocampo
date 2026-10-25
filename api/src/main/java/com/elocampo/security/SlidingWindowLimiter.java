package com.elocampo.security;

import com.elocampo.common.exceptions.TooManyRequestsException;

import java.time.Clock;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

// No máximo `max` eventos por chave (endereço, usuário) numa janela deslizante.
// Em memória: é uma instância da API, e reiniciar só dá a um atacante uma janela nova.
public class SlidingWindowLimiter {

    private final int max;
    private final long windowMs;
    private final String message;
    private final Clock clock;
    private final ConcurrentHashMap<String, Deque<Long>> events = new ConcurrentHashMap<>();

    public SlidingWindowLimiter(int max, long windowMs, String message, Clock clock) {
        this.max = max;
        this.windowMs = windowMs;
        this.message = message;
        this.clock = clock;
    }

    public void check(String key) {
        var recent = events.get(key);
        if (recent == null) return;
        synchronized (recent) {
            prune(recent);
            if (recent.size() >= max) {
                throw new TooManyRequestsException(message);
            }
        }
    }

    public void record(String key) {
        var recent = events.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (recent) {
            prune(recent);
            recent.addLast(clock.millis());
        }
        if (events.size() > 10_000) {
            events.entrySet().removeIf(e -> {
                synchronized (e.getValue()) {
                    prune(e.getValue());
                    return e.getValue().isEmpty();
                }
            });
        }
    }

    private void prune(Deque<Long> recent) {
        var cutoff = clock.millis() - windowMs;
        while (!recent.isEmpty() && recent.peekFirst() < cutoff) recent.removeFirst();
    }
}
