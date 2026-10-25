package com.elocampo.file;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadResponse {

    private String id;
    // Mantidos da época do Cloudinary por causa da web: os dois são a URL da imagem.
    private String publicId;
    private String url;
    private String secureUrl;
    private String format;
    private long size;
    private FileEntityType entityType;
    private String entityId;
    private Long uploadedAt;
}
