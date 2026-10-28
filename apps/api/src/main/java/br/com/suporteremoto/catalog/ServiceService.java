package br.com.suporteremoto.catalog;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ServiceService {

    private final ServiceRepository serviceRepository;
    private final ServiceCategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public List<ServiceCategory> getAllCategories() {
        return categoryRepository.findAllByOrderByDisplayOrderAsc();
    }

    @Transactional(readOnly = true)
    public List<ServiceDto> getAllActiveServices() {
        return serviceRepository.findByActiveTrue().stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public ServiceDto getServiceById(Long id) {
        ServiceEntity entity = serviceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Serviço não encontrado: " + id));
        return mapToDto(entity);
    }

    private ServiceDto mapToDto(ServiceEntity entity) {
        return ServiceDto.builder()
                .id(entity.getId())
                .categoryId(entity.getCategory() != null ? entity.getCategory().getId() : null)
                .categoryName(entity.getCategory() != null ? entity.getCategory().getName() : null)
                .name(entity.getName())
                .description(entity.getDescription())
                .billingModel(entity.getBillingModel())
                .referencePrice(entity.getReferencePrice())
                .estimatedMinutes(entity.getEstimatedMinutes())
                .instructionsForCustomer(entity.getInstructionsForCustomer())
                .active(entity.isActive())
                .build();
    }
}
