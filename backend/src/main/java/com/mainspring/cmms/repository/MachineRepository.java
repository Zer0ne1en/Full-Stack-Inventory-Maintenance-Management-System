package com.mainspring.cmms.repository;

import com.mainspring.cmms.domain.Machine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface MachineRepository extends JpaRepository<Machine, Long>, JpaSpecificationExecutor<Machine> {

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    java.util.List<Machine> findByNextServiceAtLessThanEqual(java.time.LocalDate date);

    long countByStatus(com.mainspring.cmms.domain.MachineStatus status);
}
