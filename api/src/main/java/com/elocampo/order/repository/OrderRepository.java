package com.elocampo.order.repository;

import com.elocampo.order.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.Optional;

public interface OrderRepository extends MongoRepository<Order, String> {

    @Query(value = "{ 'status': 'COMPLETED', 'products.productId': ?2, '$or': ["
            + " { 'buyerAccountId': ?0, 'sellerAccountId': ?1 }, { 'buyerAccountId': ?1, 'sellerAccountId': ?0 } ] }",
            exists = true)
    boolean existsCompleted(String accountId, String otherAccountId, String productId);


    Optional<Order> findById(String id);

    long countByBuyerAccountIdAndCreatedAtAfter(String buyerAccountId, java.time.Instant after);

    Page<Order> findByBuyerAccountId(String buyerAccountId, Pageable pageable);

    Page<Order> findBySellerAccountId(String sellerAccountId, Pageable pageable);
}
