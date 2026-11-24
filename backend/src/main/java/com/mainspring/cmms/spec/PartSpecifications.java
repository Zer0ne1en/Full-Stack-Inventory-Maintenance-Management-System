package com.mainspring.cmms.spec;

import com.mainspring.cmms.domain.SparePart;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

/** Composable JPA predicates for spare part search. */
public final class PartSpecifications {

    private PartSpecifications() {
    }

    public static Specification<SparePart> withFilters(String query, String category, boolean lowStock) {
        return (root, criteriaQuery, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (query != null && !query.isBlank()) {
                String like = "%" + query.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("sku")), like),
                        cb.like(cb.lower(root.get("name")), like),
                        cb.like(cb.lower(root.get("description")), like),
                        cb.like(cb.lower(root.get("category")), like)));
            }
            if (category != null && !category.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("category")), category.trim().toLowerCase()));
            }
            if (lowStock) {
                predicates.add(cb.lessThanOrEqualTo(
                        root.get("quantityOnHand"), root.get("reorderThreshold")));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
