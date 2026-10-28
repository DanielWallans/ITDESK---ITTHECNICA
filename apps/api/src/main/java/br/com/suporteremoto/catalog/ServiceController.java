package br.com.suporteremoto.catalog;

import br.com.suporteremoto.shared.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/services")
@RequiredArgsConstructor
@Tag(name = "Catálogo de Serviços", description = "Endpoints para consulta do catálogo de serviços e categorias")
public class ServiceController {

    private final ServiceService serviceService;

    @GetMapping
    @Operation(summary = "Lista todos os serviços ativos disponíveis")
    public ResponseEntity<ApiResponse<List<ServiceDto>>> listServices() {
        return ResponseEntity.ok(ApiResponse.ok(serviceService.getAllActiveServices()));
    }

    @GetMapping("/categories")
    @Operation(summary = "Lista todas as categorias do catálogo")
    public ResponseEntity<ApiResponse<List<ServiceCategory>>> listCategories() {
        return ResponseEntity.ok(ApiResponse.ok(serviceService.getAllCategories()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtém detalhes de um serviço específico")
    public ResponseEntity<ApiResponse<ServiceDto>> getService(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(serviceService.getServiceById(id)));
    }
}
