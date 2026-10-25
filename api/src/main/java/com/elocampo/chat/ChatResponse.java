package com.elocampo.chat;

import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class ChatResponse {

    private UUID id;
    private UUID senderAccountId;
    private UUID receiverAccountId;
    // Em ordem de envio (a entidade guarda um conjunto, sem ordem).
    private List<MessageResponse> messages;
    private Long createdAt;
    private Long updatedAt;
}
