package com.elocampo.account.repository;

import com.elocampo.account.entity.Account;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface AccountRepository extends MongoRepository<Account, String> {

    Optional<Account> findByIdAndRemovedFalse(String id);

    Optional<Account> findByUserIdAndRemovedFalse(String userId);

    Optional<Account> findByCpfAndRemovedFalse(String cpf);

    Optional<Account> findByCnpjAndRemovedFalse(String cnpj);
}
