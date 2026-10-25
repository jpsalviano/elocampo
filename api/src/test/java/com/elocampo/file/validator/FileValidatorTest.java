package com.elocampo.file.validator;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FileValidatorTest {

    private final FileValidator validator = new FileValidator();

    static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10, 0x4A, 0x46};
    static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0, 0};

    @Test
    void jpegIsAcceptedByItsBytes() {
        assertThat(validator.validate(JPEG)).isEqualTo(new FileValidator.Image("jpg", "image/jpeg"));
    }

    @Test
    void pngIsAcceptedByItsBytes() {
        assertThat(validator.validate(PNG)).isEqualTo(new FileValidator.Image("png", "image/png"));
    }

    @Test
    void textPretendingToBeAnImageIsRejected() {
        assertThatThrownBy(() -> validator.validate("<svg onload=alert(1)>".getBytes()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("não suportado");
    }

    @Test
    void emptyFileIsRejected() {
        assertThatThrownBy(() -> validator.validate(new byte[0]))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("vazio");
    }

    @Test
    void fileOver2MbIsRejected() {
        var big = new byte[(int) FileValidator.MAX_BYTES + 1];
        System.arraycopy(PNG, 0, big, 0, PNG.length);
        assertThatThrownBy(() -> validator.validate(big))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("2 MB");
    }
}
