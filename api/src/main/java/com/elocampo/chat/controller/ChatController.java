package com.elocampo.chat.controller;

import com.elocampo.chat.ChatInput;
import com.elocampo.chat.ChatResponse;
import com.elocampo.chat.MessageInput;
import com.elocampo.chat.MessageResponse;
import com.elocampo.chat.service.ChatService;
import com.elocampo.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping
    public ResponseEntity<ChatResponse> create(@Valid @RequestBody ChatInput request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(chatService.create(request, CurrentUser.get()));
    }

    @GetMapping
    public ResponseEntity<List<ChatResponse>> mine() {
        return ResponseEntity.ok(chatService.getMine(CurrentUser.get()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChatResponse> findById(@PathVariable UUID id) {
        return chatService.findById(id, CurrentUser.get())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/message")
    public ResponseEntity<MessageResponse> createMessage(@PathVariable UUID id, @Valid @RequestBody MessageInput request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(chatService.addMessage(id, request, CurrentUser.get()));
    }
}
