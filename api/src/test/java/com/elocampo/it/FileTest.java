package com.elocampo.it;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

class FileTest extends IntegrationTest {

    static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0, 0, 0, 0};

    MvcResult upload(Person who, String type, String entityId, byte[] bytes, String contentType) throws Exception {
        return call(multipart("/file/upload")
                .file(new MockMultipartFile("file", "x.png", contentType, bytes))
                .param("entityType", type)
                .param("entityId", entityId), who.token());
    }

    @Test
    void onlyTheOwnerAttachesImages() throws Exception {
        var vendor = person("VENDOR");
        var other = person("VENDOR");
        var product = product(vendor, "Milho", "1.20", 10);
        assertThat(status(upload(other, "PRODUCT", product, PNG, "image/png"))).isEqualTo(403);
        assertThat(status(upload(other, "PROFILE", vendor.accountId(), PNG, "image/png"))).isEqualTo(403);
        assertThat(status(upload(vendor, "PRODUCT", product, PNG, "image/png"))).isEqualTo(201);
        assertThat(status(upload(vendor, "PROFILE", vendor.accountId(), PNG, "image/png"))).isEqualTo(201);
    }

    @Test
    void theContentDecidesTheTypeNotTheClient() throws Exception {
        var vendor = person("VENDOR");
        var html = "<html><script>alert(1)</script></html>".getBytes();
        assertThat(status(upload(vendor, "PROFILE", vendor.accountId(), html, "image/png"))).isEqualTo(400);
        var saved = upload(vendor, "PROFILE", vendor.accountId(), PNG, "text/html");
        assertThat(status(saved)).isEqualTo(201);
        String id = json(saved, "$.id");
        var content = get("/file/" + id + "/content", null);
        assertThat(status(content)).isEqualTo(200);
        assertThat(content.getResponse().getContentType()).isEqualTo("image/png");
        assertThat(content.getResponse().getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(content.getResponse().getHeader("Content-Security-Policy")).contains("sandbox");
        assertThat(content.getResponse().getContentAsByteArray()).isEqualTo(PNG);
    }

    @Test
    void atMostFiveImagesPerItem() throws Exception {
        var vendor = person("VENDOR");
        var product = product(vendor, "Milho", "1.20", 10);
        for (int i = 0; i < 5; i++) assertThat(status(upload(vendor, "PRODUCT", product, PNG, "image/png"))).isEqualTo(201);
        assertThat(status(upload(vendor, "PRODUCT", product, PNG, "image/png"))).isEqualTo(400);
    }

    @Test
    void onlyTheOwnerDeletes() throws Exception {
        var vendor = person("VENDOR");
        var other = person("VENDOR");
        String id = json(upload(vendor, "PROFILE", vendor.accountId(), PNG, "image/png"), "$.id");
        assertThat(status(send("DELETE", "/file/" + id, other.token(), null))).isEqualTo(403);
        assertThat(status(send("DELETE", "/file/" + id, vendor.token(), null))).isEqualTo(204);
        assertThat(status(get("/file/" + id + "/content", null))).isEqualTo(404);
    }

    @Test
    void contentIdsMustBeIdsNotPaths() throws Exception {
        assertThat(status(get("/file/..%2F..%2Fetc%2Fpasswd/content", null))).isIn(400, 404);
    }
}
