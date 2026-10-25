package com.elocampo.file.service;

import com.elocampo.file.FileEntityType;
import com.elocampo.file.FileUploadResponse;
import com.elocampo.security.CurrentUser;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface FileService {

    FileUploadResponse upload(MultipartFile file, FileEntityType entityType, UUID entityId, CurrentUser user);

    List<FileUploadResponse> findByEntity(FileEntityType entityType, UUID entityId);

    StoredFile content(String id);

    void delete(String id, CurrentUser user);

    // Grava uma imagem para a carga da demonstração, sem as checagens de posse.
    FileUploadResponse store(byte[] bytes, FileEntityType entityType, String entityId, String uploadedBy);

    record StoredFile(byte[] bytes, String contentType) {}
}
