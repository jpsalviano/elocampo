package com.elocampo.chat.service;

import com.elocampo.account.AccountResponse;
import com.elocampo.account.service.AccountService;
import com.elocampo.chat.ChatInput;
import com.elocampo.chat.ChatResponse;
import com.elocampo.chat.MessageInput;
import com.elocampo.chat.MessageResponse;
import com.elocampo.chat.entity.Chat;
import com.elocampo.chat.entity.Message;
import com.elocampo.chat.mapper.ChatMapper;
import com.elocampo.chat.repository.ChatRepository;
import com.elocampo.common.UuidV7;
import com.elocampo.common.exceptions.ForbiddenException;
import com.elocampo.common.exceptions.NotFoundException;
import com.elocampo.common.exceptions.ValidationErrorException;
import com.elocampo.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

// Conversas entre duas contas. Só as duas leem e escrevem nelas.
@Service
@Slf4j
@RequiredArgsConstructor
@Validated
public class ChatServiceImpl implements ChatService {

    static final int MAX_MESSAGES = 500;

    private final ChatRepository chatRepository;
    private final AccountService accountService;

    @Override
    public ChatResponse create(ChatInput request, CurrentUser user) {
        var sender = accountService.requireOwn(user).getId().toString();
        var receiver = request.getReceiverAccountId().toString();
        if (sender.equals(receiver)) {
            throw new ValidationErrorException("cannot chat with yourself");
        }
        if (accountService.findActive(request.getReceiverAccountId()).isEmpty()) {
            throw new NotFoundException("account not found");
        }
        var duplicated = chatRepository.findBySenderAccountIdAndReceiverAccountIdAndRemovedFalse(sender, receiver)
                .or(() -> chatRepository.findBySenderAccountIdAndReceiverAccountIdAndRemovedFalse(receiver, sender));
        if (duplicated.isPresent()) {
            throw new ValidationErrorException("duplicated chat for sender and receiver accounts");
        }
        var now = Instant.now();
        var chat = Chat.builder()
                .id(UuidV7.generate().toString())
                .receiverAccountId(receiver)
                .senderAccountId(sender)
                .removed(false)
                .createdAt(now)
                .updatedAt(now)
                .messages(new HashSet<>())
                .build();
        chatRepository.save(chat);
        return ChatMapper.toChatResponse(chat);
    }

    @Override
    public List<ChatResponse> getMine(CurrentUser user) {
        var mine = accountService.requireOwn(user).getId().toString();
        return chatRepository.findAllByAccountId(mine).stream().map(ChatMapper::toChatResponse).toList();
    }

    @Override
    public Optional<ChatResponse> findById(UUID id, CurrentUser user) {
        var chat = chatRepository.findByIdAndRemovedFalse(id.toString())
                .orElseThrow(() -> new NotFoundException("chat not found"));
        requireParticipant(chat, user);
        return Optional.of(ChatMapper.toChatResponse(chat));
    }

    @Override
    public MessageResponse addMessage(UUID id, MessageInput input, CurrentUser user) {
        var chat = chatRepository.findByIdAndRemovedFalse(id.toString())
                .orElseThrow(() -> new NotFoundException("chat not found by id"));
        var author = requireParticipant(chat, user);
        if (chat.getMessages() == null) {
            chat.setMessages(new HashSet<>());
        }
        if (chat.getMessages().size() >= MAX_MESSAGES) {
            throw new ValidationErrorException("this chat reached " + MAX_MESSAGES + " messages");
        }
        // O banco guarda milissegundos: cada mensagem fica pelo menos 1 ms depois
        // da anterior, para a conversa voltar sempre na ordem em que foi escrita.
        var now = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        var last = chat.getMessages().stream().map(Message::getCreatedAt).filter(Objects::nonNull).max(Comparator.naturalOrder());
        if (last.isPresent() && !now.isAfter(last.get())) {
            now = last.get().plusMillis(1);
        }
        var message = Message.builder()
                .id(UuidV7.generate().toString())
                .senderAccountId(author)
                .content(input.getContent())
                .createdAt(now)
                .updatedAt(now)
                .build();
        chat.getMessages().add(message);
        chat.setUpdatedAt(now);
        chatRepository.save(chat);
        return ChatMapper.toMessageResponse(message);
    }

    private String requireParticipant(Chat chat, CurrentUser user) {
        var mine = accountService.findOwn(user).map(AccountResponse::getId).map(UUID::toString).orElse(null);
        if (mine == null || !(mine.equals(chat.getSenderAccountId()) || mine.equals(chat.getReceiverAccountId()))) {
            throw new ForbiddenException("not your chat");
        }
        return mine;
    }
}
