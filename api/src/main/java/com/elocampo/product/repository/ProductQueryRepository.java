package com.elocampo.product.repository;

import com.elocampo.product.ProductFilter;
import com.elocampo.product.ProductStatus;
import com.elocampo.product.entity.Product;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Repository
@RequiredArgsConstructor
public class ProductQueryRepository {

    static final int LIMIT = 200;

    private final MongoTemplate mongoTemplate;

    // O catálogo: o que está à venda. O texto buscado vai escapado, então é
    // comparado literalmente em vez de rodar como expressão regular.
    public List<Product> findByFilter(ProductFilter filter) {
        var criteria = new ArrayList<Criteria>();
        criteria.add(Criteria.where("removed").is(false));
        criteria.add(Criteria.where("status").is(ProductStatus.AVAILABLE));
        if (filter.description() != null && !filter.description().isBlank()) {
            criteria.add(Criteria.where("description").regex(Pattern.quote(filter.description().trim()), "i"));
        }
        if (filter.category() != null) {
            criteria.add(Criteria.where("category").is(filter.category()));
        }
        if (filter.vendorCity() != null && !filter.vendorCity().isBlank()) {
            criteria.add(Criteria.where("vendorCity").is(filter.vendorCity()));
        }
        if (filter.vendorState() != null && !filter.vendorState().isBlank()) {
            criteria.add(Criteria.where("vendorState").is(filter.vendorState()));
        }
        var query = new Query(new Criteria().andOperator(criteria.toArray(new Criteria[0])))
                .with(Sort.by(Sort.Direction.DESC, "createdAt"))
                .limit(LIMIT);
        return mongoTemplate.find(query, Product.class);
    }
}
