package br.com.suporteremoto.reporting;

import br.com.suporteremoto.shared.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Endpoints para métricas operacionais, financeiras e sessões")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    @Operation(summary = "Retorna o resumo operacional e financeiro do dashboard")
    public ResponseEntity<ApiResponse<DashboardSummaryDto>> getSummary() {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getSummary()));
    }
}
