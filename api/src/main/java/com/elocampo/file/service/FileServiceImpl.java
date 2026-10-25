package com.elocampo.file.service;

import com.elocampo.account.AccountResponse;
import com.elocampo.account.service.AccountService;
import com.elocampo.common.UuidV7;
import com.elocampo.common.exceptions.ForbiddenException;
import com.elocampo.common.exceptions.NotFoundException;
import com.elocampo.common.exceptions.ValidationErrorException;
import com.elocampo.config.ElocampoProperties;
import com.elocampo.file.FileEntityType;
import com.elocampo.file.FileUploadResponse;
import com.elocampo.file.entity.FileRecord;
import com.elocampo.file.repository.FileRecordRepository;
import com.elocampo.file.validator.FileValidator;
import com.elocampo.product.service.ProductService;
import com.elocampo.security.CurrentUser;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class FileServiceImpl implements FileService {

    static final int MAX_PER_ENTITY = 5;
    // Teto do volume de imagens, para o cadastro aberto não encher o disco.
    static final long MAX_TOTAL_BYTES = 500L * 1024 * 1024;

    private final FileValidator fileValidator;
    private final FileRecordRepository fileRecordRepository;
    private final ProductService productService;
    private final AccountService accountService;
    private final Path root;
    private final org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    public FileServiceImpl(FileValidator fileValidator, FileRecordRepository fileRecordRepository,
                           ProductService productService, AccountService accountService, ElocampoProperties properties,
                           org.springframework.data.mongodb.core.MongoTemplate mongoTemplate) {
        this.fileValidator = fileValidator;
        this.fileRecordRepository = fileRecordRepository;
        this.productService = productService;
        this.accountService = accountService;
        this.root = Path.of(properties.filesRoot());
        this.mongoTemplate = mongoTemplate;
    }

    // Só no próprio produto ou perfil (admins, em qualquer um).
    @Override
    public FileUploadResponse upload(MultipartFile file, FileEntityType entityType, UUID entityId, CurrentUser user) {
        requireOwner(entityType, entityId, user);
        if (fileRecordRepository.countByEntityTypeAndEntityId(entityType, entityId.toString()) >= MAX_PER_ENTITY) {
            throw new ValidationErrorException("No máximo " + MAX_PER_ENTITY + " imagens por item");
        }
        if (totalBytes() + file.getSize() > MAX_TOTAL_BYTES) {
            throw new ValidationErrorException("O espaço para imagens da demonstração acabou; ele é liberado todo dia às 4h");
        }
        try {
            return store(file.getBytes(), entityType, entityId.toString(), user.userId());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public FileUploadResponse store(byte[] bytes, FileEntityType entityType, String entityId, String uploadedBy) {
        var image = fileValidator.validate(bytes);
        var id = UuidV7.generate().toString();
        try {
            Files.createDirectories(root);
            Files.write(path(id, image.format()), bytes, StandardOpenOption.CREATE_NEW);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        var record = fileRecordRepository.save(FileRecord.builder()
                .id(id)
                .format(image.format())
                .contentType(image.contentType())
                .size(bytes.length)
                .entityType(entityType)
                .entityId(entityId)
                .uploadedBy(uploadedBy)
                .uploadedAt(Instant.now())
                .build());
        log.info("File stored (id={}, entity={}:{})", id, entityType, entityId);
        return toResponse(record);
    }

    @Override
    public List<FileUploadResponse> findByEntity(FileEntityType entityType, UUID entityId) {
        return fileRecordRepository.findByEntityTypeAndEntityId(entityType, entityId.toString())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public StoredFile content(String id) {
        var record = fileRecordRepository.findById(id).orElseThrow(() -> new NotFoundException("file not found"));
        try {
            return new StoredFile(Files.readAllBytes(path(record.getId(), record.getFormat())), record.getContentType());
        } catch (IOException e) {
            throw new NotFoundException("file not found");
        }
    }

    @Override
    public void delete(String id, CurrentUser user) {
        var record = fileRecordRepository.findById(id).orElseThrow(() -> new NotFoundException("Arquivo não encontrado"));
        if (!user.admin() && !user.userId().equals(record.getUploadedBy())) {
            requireOwner(record.getEntityType(), UUID.fromString(record.getEntityId()), user);
        }
        fileRecordRepository.delete(record);
        try {
            Files.deleteIfExists(path(record.getId(), record.getFormat()));
        } catch (IOException e) {
            log.warn("Could not delete file {} from disk", record.getId());
        }
        log.info("File deleted (id={})", id);
    }

    private long totalBytes() {
        var sum = mongoTemplate.aggregate(org.springframework.data.mongodb.core.aggregation.Aggregation.newAggregation(
                        org.springframework.data.mongodb.core.aggregation.Aggregation.group().sum("size").as("total")),
                FileRecord.class, org.bson.Document.class).getUniqueMappedResult();
        return sum == null ? 0 : ((Number) sum.get("total")).longValue();
    }

    private void requireOwner(FileEntityType entityType, UUID entityId, CurrentUser user) {
        if (user.admin()) return;
        var mine = accountService.findOwn(user).map(AccountResponse::getId).orElse(null);
        var owner = switch (entityType) {
            case PROFILE -> accountService.findActive(entityId).map(AccountResponse::getId).orElse(null);
            case PRODUCT -> productService.findById(entityId).map(p -> p.getVendorAccountId()).orElse(null);
        };
        if (owner == null) {
            throw new NotFoundException("entityId não corresponde a uma entidade existente");
        }
        if (!owner.equals(mine)) {
            throw new ForbiddenException("not yours");
        }
    }

    // Os ids são nossos (UUIDs) e o formato, um de dois valores: nenhum caminho vem do cliente.
    private Path path(String id, String format) {
        UUID.fromString(id);
        if (!format.equals("jpg") && !format.equals("png")) throw new IllegalStateException("format");
        return root.resolve(id + "." + format);
    }

    private FileUploadResponse toResponse(FileRecord r) {
        var url = "/api/v1/elocampo/file/" + r.getId() + "/content";
        return FileUploadResponse.builder()
                .id(r.getId())
                .publicId(r.getId())
                .url(url)
                .secureUrl(url)
                .format(r.getFormat())
                .size(r.getSize())
                .entityType(r.getEntityType())
                .entityId(r.getEntityId())
                .uploadedAt(r.getUploadedAt() != null ? r.getUploadedAt().toEpochMilli() : null)
                .build();
    }
}
