package com.mainspring.cmms.repository;

import com.mainspring.cmms.domain.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Page<User> findByRole(com.mainspring.cmms.domain.Role role, Pageable pageable);

    List<User> findByRoleAndEnabledTrue(com.mainspring.cmms.domain.Role role);

    long countByRole(com.mainspring.cmms.domain.Role role);
}
