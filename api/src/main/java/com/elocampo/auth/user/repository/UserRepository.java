package com.elocampo.auth.user.repository;

import com.elocampo.auth.user.entity.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByIdAndRemovedFalse(String id);

    Optional<User> findByEmailAndRemovedFalse(String email);

    Optional<User> findByEmail(String email);
}
