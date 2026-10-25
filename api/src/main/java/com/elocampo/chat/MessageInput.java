package com.elocampo.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class MessageInput {

    // Ignorado: o autor é quem está logado.
    private UUID accountId;

    @NotBlank(message = "content is required")
    @Size(max = 280, message = "content cannot be greater than 280 characters")
    private String content;

    private Long createdAt;
    private Long updatedAt;
}
