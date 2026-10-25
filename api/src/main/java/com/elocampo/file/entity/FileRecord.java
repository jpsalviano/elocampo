package com.elocampo.file.entity;

import com.elocampo.file.FileEntityType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

// Uma imagem em disco (files-root/<id>.<formato>), ligada a um produto ou a um perfil.
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "file_record")
public class FileRecord {

    @Id
    private String id;
    private String format;
    private String contentType;
    private long size;
    private FileEntityType entityType;
    @Indexed
    private String entityId;
    private String uploadedBy;
    private Instant uploadedAt;
}
