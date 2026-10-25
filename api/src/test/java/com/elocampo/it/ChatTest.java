package com.elocampo.it;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ChatTest extends IntegrationTest {

    @Test
    void onlyTheTwoAccountsReadAndWrite() throws Exception {
        var buyer = person("BUYER");
        var vendor = person("VENDOR");
        var stranger = person("BUYER");
        var created = send("POST", "/chat", buyer.token(), "{\"senderAccountId\":\"%s\",\"receiverAccountId\":\"%s\"}"
                .formatted(stranger.accountId(), vendor.accountId()));
        assertThat(status(created)).isEqualTo(201);
        assertThat((String) json(created, "$.senderAccountId")).isEqualTo(buyer.accountId());
        String id = json(created, "$.id");
        var message = "{\"accountId\":\"%s\",\"content\":\"Olá\"}".formatted(vendor.accountId());
        assertThat(status(send("POST", "/chat/" + id + "/message", buyer.token(), message))).isEqualTo(201);
        assertThat(status(send("POST", "/chat/" + id + "/message", stranger.token(), message))).isEqualTo(403);
        assertThat(status(get("/chat/" + id, stranger.token()))).isEqualTo(403);
        var read = get("/chat/" + id, vendor.token());
        assertThat((String) json(read, "$.messages[0].senderAccountId")).isEqualTo(buyer.accountId());
        assertThat((Integer) json(get("/chat", stranger.token()), "$.length()")).isZero();
    }

    @Test
    void eachMessageKeepsItsSenderAndTheConversationComesBackInOrder() throws Exception {
        var buyer = person("BUYER");
        var vendor = person("VENDOR");
        String id = json(send("POST", "/chat", buyer.token(), "{\"receiverAccountId\":\"%s\"}".formatted(vendor.accountId())), "$.id");

        var lines = new String[][] {
                {buyer.token(), buyer.accountId(), "Bom dia, ainda tem tomate?"},
                {vendor.token(), vendor.accountId(), "Tenho 90 kg."},
                {vendor.token(), vendor.accountId(), "Posso entregar na sexta."},
                {buyer.token(), buyer.accountId(), "Fechado."},
        };
        for (var line : lines) {
            var sent = send("POST", "/chat/" + id + "/message", line[0],
                    "{\"accountId\":\"%s\",\"content\":\"%s\"}".formatted(java.util.UUID.randomUUID(), line[2]));
            assertThat(status(sent)).isEqualTo(201);
            // A resposta já diz quem enviou: o dono do token, não o que vier no corpo.
            assertThat((String) json(sent, "$.senderAccountId")).isEqualTo(line[1]);
        }

        for (var reader : new String[] {buyer.token(), vendor.token()}) {
            var chat = get("/chat/" + id, reader);
            assertThat(status(chat)).isEqualTo(200);
            assertThat((Integer) json(chat, "$.messages.length()")).isEqualTo(lines.length);
            for (int i = 0; i < lines.length; i++) {
                assertThat((String) json(chat, "$.messages[%d].content".formatted(i))).isEqualTo(lines[i][2]);
                assertThat((String) json(chat, "$.messages[%d].senderAccountId".formatted(i))).isEqualTo(lines[i][1]);
            }
        }

        // A lista de conversas de cada um traz a mesma conversa, na mesma ordem.
        var mine = get("/chat", vendor.token());
        assertThat((Integer) json(mine, "$.length()")).isEqualTo(1);
        assertThat((String) json(mine, "$[0].messages[3].content")).isEqualTo("Fechado.");
        assertThat((String) json(mine, "$[0].messages[3].senderAccountId")).isEqualTo(buyer.accountId());
    }

    @Test
    void messagesStoredOutOfOrderComeBackInOrder() throws Exception {
        var buyer = person("BUYER");
        var vendor = person("VENDOR");
        var start = java.time.Instant.parse("2026-01-10T12:00:00Z");
        var stored = new java.util.LinkedHashSet<com.elocampo.chat.entity.Message>();
        for (int i = 2; i >= 0; i--) {
            stored.add(com.elocampo.chat.entity.Message.builder()
                    .id(java.util.UUID.randomUUID().toString())
                    .senderAccountId(i % 2 == 0 ? buyer.accountId() : vendor.accountId())
                    .content("mensagem " + i)
                    .createdAt(start.plusSeconds(i))
                    .updatedAt(start.plusSeconds(i))
                    .build());
        }
        var id = java.util.UUID.randomUUID().toString();
        mongo.save(com.elocampo.chat.entity.Chat.builder()
                .id(id).senderAccountId(buyer.accountId()).receiverAccountId(vendor.accountId())
                .messages(stored).removed(false).createdAt(start).updatedAt(start).build());

        var chat = get("/chat/" + id, vendor.token());
        for (int i = 0; i < 3; i++) {
            assertThat((String) json(chat, "$.messages[%d].content".formatted(i))).isEqualTo("mensagem " + i);
        }
        assertThat((String) json(chat, "$.messages[1].senderAccountId")).isEqualTo(vendor.accountId());

        // A próxima mensagem vem depois de todas, mesmo que o relógio esteja "atrás".
        var sent = send("POST", "/chat/" + id + "/message", buyer.token(), "{\"content\":\"última\"}");
        assertThat(status(sent)).isEqualTo(201);
        assertThat((String) json(get("/chat/" + id, buyer.token()), "$.messages[3].content")).isEqualTo("última");
    }
}
