package com.elocampo.chat.service;

import com.elocampo.chat.ChatInput;
import com.elocampo.chat.ChatResponse;
import com.elocampo.chat.MessageInput;
import com.elocampo.chat.MessageResponse;
import com.elocampo.security.CurrentUser;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatService {

    ChatResponse create(@Valid ChatInput request, CurrentUser user);

    List<ChatResponse> getMine(CurrentUser user);

    Optional<ChatResponse> findById(UUID id, CurrentUser user);

    MessageResponse addMessage(UUID id, @Valid MessageInput input, CurrentUser user);
}
