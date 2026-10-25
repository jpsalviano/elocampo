package com.elocampo.file.repository;

import com.elocampo.file.FileEntityType;
import com.elocampo.file.entity.FileRecord;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface FileRecordRepository extends MongoRepository<FileRecord, String> {

    List<FileRecord> findByEntityTypeAndEntityId(FileEntityType entityType, String entityId);

    long countByEntityTypeAndEntityId(FileEntityType entityType, String entityId);
}
