package com.elocampo.chat;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatInput {

    // Ignorado: o remetente é quem está logado.
    private UUID senderAccountId;

    @NotNull(message = "receiverAccountId is required")
    private UUID receiverAccountId;
}
