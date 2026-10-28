package br.com.suporteremoto.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceRepository extends JpaRepository<ServiceEntity, Long> {
    List<ServiceEntity> findByActiveTrue();
    List<ServiceEntity> findByCategoryIdAndActiveTrue(Long categoryId);
}
