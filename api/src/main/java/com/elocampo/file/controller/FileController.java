package com.elocampo.file.controller;

import com.elocampo.file.FileEntityType;
import com.elocampo.file.FileUploadResponse;
import com.elocampo.file.service.FileService;
import com.elocampo.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/file")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("entityType") FileEntityType entityType,
            @RequestParam("entityId") UUID entityId
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(fileService.upload(file, entityType, entityId, CurrentUser.get()));
    }

    @GetMapping
    public ResponseEntity<List<FileUploadResponse>> findByEntity(
            @RequestParam FileEntityType entityType,
            @RequestParam UUID entityId
    ) {
        return ResponseEntity.ok(fileService.findByEntity(entityType, entityId));
    }

    // Pública (um <img> não manda o token). Servida só como imagem: o tipo foi
    // checado no envio, o nosniff impede o navegador de adivinhar outro, e a CSP
    // com sandbox não deixa nada rodar se o arquivo for aberto direto.
    @GetMapping("/{id}/content")
    public ResponseEntity<byte[]> content(@PathVariable UUID id) {
        var file = fileService.content(id.toString());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePublic())
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'; sandbox")
                .header("Content-Disposition", "inline")
                .body(file.bytes());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        fileService.delete(id.toString(), CurrentUser.get());
        return ResponseEntity.noContent().build();
    }
}
