package com.elocampo.chat.mapper;

import com.elocampo.chat.ChatResponse;
import com.elocampo.chat.MessageResponse;
import com.elocampo.chat.entity.Chat;
import com.elocampo.chat.entity.Message;
import org.springframework.util.CollectionUtils;

import java.util.Comparator;
import java.util.UUID;

import static org.apache.commons.lang3.StringUtils.isBlank;

public class ChatMapper {

    public static ChatResponse toChatResponse(Chat input) {

        var chatResponse = new ChatResponse();

        chatResponse.setId(UUID.fromString(input.getId()));
        chatResponse.setSenderAccountId(UUID.fromString(input.getSenderAccountId()));
        chatResponse.setReceiverAccountId(UUID.fromString(input.getReceiverAccountId()));

        if (!CollectionUtils.isEmpty(input.getMessages())) {
            chatResponse.setMessages(input.getMessages().stream()
                    .sorted(Comparator.comparing(Message::getCreatedAt).thenComparing(Message::getId))
                    .map(ChatMapper::toMessageResponse)
                    .toList());
        }

        chatResponse.setCreatedAt(input.getCreatedAt().toEpochMilli());
        chatResponse.setUpdatedAt(input.getUpdatedAt().toEpochMilli());

        return chatResponse;
    }

    public static MessageResponse toMessageResponse(Message input) {

        var messageResponse = new MessageResponse();

        messageResponse.setId(UUID.fromString(input.getId()));

        if (!isBlank(input.getSenderAccountId())) {
            messageResponse.setSenderAccountId(UUID.fromString(input.getSenderAccountId()));
        }

        messageResponse.setContent(input.getContent());
        messageResponse.setCreatedAt(input.getCreatedAt().toEpochMilli());
        messageResponse.setUpdatedAt(input.getUpdatedAt().toEpochMilli());

        return messageResponse;
    }
}
