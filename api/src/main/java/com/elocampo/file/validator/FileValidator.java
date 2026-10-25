package com.elocampo.file.validator;

import org.springframework.stereotype.Component;

import java.util.Arrays;

// O tipo vem dos primeiros bytes do arquivo, nunca do nome ou do Content-Type
// que o cliente manda: só entram imagens JPEG e PNG de verdade.
@Component
public class FileValidator {

    public static final long MAX_BYTES = 2 * 1024 * 1024;

    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};

    public record Image(String format, String contentType) {}

    public Image validate(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            throw new IllegalArgumentException("Arquivo vazio ou ausente");
        }
        if (bytes.length > MAX_BYTES) {
            throw new IllegalArgumentException("Arquivo maior que 2 MB");
        }
        if (startsWith(bytes, JPEG)) return new Image("jpg", "image/jpeg");
        if (startsWith(bytes, PNG)) return new Image("png", "image/png");
        throw new IllegalArgumentException("Tipo de arquivo não suportado: envie JPEG ou PNG");
    }

    private static boolean startsWith(byte[] bytes, byte[] prefix) {
        return bytes.length >= prefix.length && Arrays.equals(bytes, 0, prefix.length, prefix, 0, prefix.length);
    }
}
