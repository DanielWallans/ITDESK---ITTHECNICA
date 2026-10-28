package br.com.suporteremoto.ticket;

import br.com.suporteremoto.shared.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tickets")
@RequiredArgsConstructor
@Tag(name = "Chamados", description = "Endpoints para abertura, consulta, tramitação e mensagens de chamados")
public class TicketController {

    private final TicketService ticketService;

    @PostMapping
    @Operation(summary = "Abre um novo chamado de suporte")
    public ResponseEntity<ApiResponse<TicketResponseDto>> createTicket(@Valid @RequestBody CreateTicketRequest request) {
        TicketResponseDto ticket = ticketService.createTicket(request);
        return ResponseEntity.ok(ApiResponse.ok("Chamado aberto com sucesso", ticket));
    }

    @GetMapping
    @Operation(summary = "Lista os chamados disponíveis de acordo com as permissões do usuário")
    public ResponseEntity<ApiResponse<List<TicketResponseDto>>> listTickets(@RequestParam(required = false) TicketStatus status) {
        return ResponseEntity.ok(ApiResponse.ok(ticketService.listTickets(status)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consulta detalhes de um chamado específico")
    public ResponseEntity<ApiResponse<TicketResponseDto>> getTicket(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(ticketService.getTicketById(id)));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Atualiza o estado/status do chamado")
    public ResponseEntity<ApiResponse<TicketResponseDto>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTicketStatusRequest request
    ) {
        TicketResponseDto ticket = ticketService.updateStatus(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Status atualizado com sucesso", ticket));
    }

    @GetMapping("/{id}/messages")
    @Operation(summary = "Lista as mensagens do chamado (notas internas são filtradas para clientes)")
    public ResponseEntity<ApiResponse<List<TicketMessageDto>>> getMessages(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(ticketService.getMessages(id)));
    }

    @PostMapping("/{id}/messages")
    @Operation(summary = "Envia uma nova mensagem ou nota interna no chamado")
    public ResponseEntity<ApiResponse<TicketMessageDto>> addMessage(
            @PathVariable Long id,
            @Valid @RequestBody CreateMessageRequest request
    ) {
        TicketMessageDto message = ticketService.addMessage(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Mensagem enviada com sucesso", message));
    }
}
