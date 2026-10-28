package br.com.suporteremoto.remote_session;

import br.com.suporteremoto.shared.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/remote-sessions")
@RequiredArgsConstructor
@Tag(name = "Sessões Remotas", description = "Endpoints para controle de atendimentos remotos e cronômetro persistido")
public class RemoteSessionController {

    private final RemoteSessionService sessionService;

    @PostMapping("/start")
    @Operation(summary = "Inicia uma nova sessão de suporte remoto e ativa o cronômetro")
    public ResponseEntity<ApiResponse<RemoteSessionDto>> startSession(@Valid @RequestBody StartSessionRequest request) {
        RemoteSessionDto dto = sessionService.startSession(request);
        return ResponseEntity.ok(ApiResponse.ok("Sessão remota iniciada com sucesso", dto));
    }

    @PostMapping("/{id}/pause")
    @Operation(summary = "Pausa a sessão remota ativa")
    public ResponseEntity<ApiResponse<RemoteSessionDto>> pauseSession(@PathVariable Long id) {
        RemoteSessionDto dto = sessionService.pauseSession(id);
        return ResponseEntity.ok(ApiResponse.ok("Sessão pausada com sucesso", dto));
    }

    @PostMapping("/{id}/resume")
    @Operation(summary = "Retoma a sessão remota pausada")
    public ResponseEntity<ApiResponse<RemoteSessionDto>> resumeSession(@PathVariable Long id) {
        RemoteSessionDto dto = sessionService.resumeSession(id);
        return ResponseEntity.ok(ApiResponse.ok("Sessão retomada com sucesso", dto));
    }

    @PostMapping("/{id}/end")
    @Operation(summary = "Finaliza a sessão remota e consolida o tempo faturável")
    public ResponseEntity<ApiResponse<RemoteSessionDto>> endSession(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String notes = body != null ? body.get("notes") : null;
        RemoteSessionDto dto = sessionService.endSession(id, notes);
        return ResponseEntity.ok(ApiResponse.ok("Sessão finalizada com sucesso", dto));
    }

    @GetMapping("/active")
    @Operation(summary = "Retorna a sessão remota atualmente ativa, se houver")
    public ResponseEntity<ApiResponse<RemoteSessionDto>> getActiveSession() {
        return ResponseEntity.ok(ApiResponse.ok(sessionService.getActiveSession()));
    }

    @GetMapping("/ticket/{ticketId}")
    @Operation(summary = "Lista histórico de sessões de um chamado específico")
    public ResponseEntity<ApiResponse<List<RemoteSessionDto>>> getSessionsForTicket(@PathVariable Long ticketId) {
        return ResponseEntity.ok(ApiResponse.ok(sessionService.getSessionsForTicket(ticketId)));
    }
}
