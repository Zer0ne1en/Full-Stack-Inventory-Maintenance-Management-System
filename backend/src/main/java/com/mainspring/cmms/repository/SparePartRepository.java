package com.mainspring.cmms.repository;

import com.mainspring.cmms.domain.SparePart;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SparePartRepository extends JpaRepository<SparePart, Long>, JpaSpecificationExecutor<SparePart> {

    Optional<SparePart> findBySkuIgnoreCase(String sku);

    boolean existsBySkuIgnoreCase(String sku);

    boolean existsBySkuIgnoreCaseAndIdNot(String sku, Long id);

    List<SparePart> findByQuantityOnHandLessThanEqual(int quantity);

    Page<SparePart> findByQuantityOnHandLessThanEqual(int quantity, Pageable pageable);

    @Query("select p from SparePart p where p.quantityOnHand <= p.reorderThreshold order by "
            + "(p.reorderThreshold - p.quantityOnHand) desc")
    List<SparePart> findAllLowStock();

    @Query("select distinct p.category from SparePart p where p.category is not null order by p.category")
    List<String> findDistinctCategories();

    /**
     * Loads a part with a pessimistic write lock ({@code SELECT ... FOR UPDATE}).
     *
     * <p>Must be called inside a transaction. Two technicians closing tickets
     * against the same part serialise here, which is what makes the "stock never
     * goes negative" guarantee real rather than aspirational.</p>
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from SparePart p where p.id = :id")
    Optional<SparePart> findByIdForUpdate(@Param("id") Long id);
}
