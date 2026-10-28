package br.com.suporteremoto.ticket;

import br.com.suporteremoto.catalog.ServiceEntity;
import br.com.suporteremoto.catalog.ServiceRepository;
import br.com.suporteremoto.identity.AuthService;
import br.com.suporteremoto.identity.Role;
import br.com.suporteremoto.identity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.Year;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final TicketMessageRepository messageRepository;
    private final ServiceRepository serviceRepository;
    private final AuthService authService;

    @Transactional
    public TicketResponseDto createTicket(CreateTicketRequest request) {
        User currentUser = authService.getCurrentAuthenticatedUser();

        ServiceEntity service = null;
        if (request.getServiceId() != null) {
            service = serviceRepository.findById(request.getServiceId()).orElse(null);
        }

        // Gera código legível e único: CH-2026-000XXX
        long count = ticketRepository.count() + 101;
        String code = String.format("CH-%d-%06d", Year.now().getValue(), count);

        Ticket ticket = Ticket.builder()
                .code(code)
                .customer(currentUser)
                .service(service)
                .title(request.getTitle())
                .description(request.getDescription())
                .status(TicketStatus.NEW)
                .priority(request.getPriority() != null ? request.getPriority() : TicketPriority.MEDIUM)
                .remoteAccessTool(request.getRemoteAccessTool() != null ? request.getRemoteAccessTool() : "ANYDESK")
                .remoteAccessId(request.getRemoteAccessId())
                .estimatedPrice(service != null ? service.getReferencePrice() : null)
                .build();

        ticket = ticketRepository.save(ticket);
        return mapToDto(ticket);
    }

    @Transactional(readOnly = true)
    public List<TicketResponseDto> listTickets(TicketStatus status) {
        User currentUser = authService.getCurrentAuthenticatedUser();

        List<Ticket> tickets;
        if (currentUser.getRole() == Role.CUSTOMER) {
            // Cliente só visualiza seus próprios chamados
            tickets = ticketRepository.findByCustomerOrderByCreatedAtDesc(currentUser);
        } else {
            // Técnico e Admin visualizam chamados operacionais
            if (status != null) {
                tickets = ticketRepository.findByStatusOrderByCreatedAtDesc(status);
            } else {
                tickets = ticketRepository.findAllByOrderByCreatedAtDesc();
            }
        }

        return tickets.stream().map(this::mapToDto).toList();
    }

    @Transactional(readOnly = true)
    public TicketResponseDto getTicketById(Long id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Chamado não encontrado: " + id));

        verifyAccess(ticket);
        return mapToDto(ticket);
    }

    @Transactional
    public TicketResponseDto updateStatus(Long id, UpdateTicketStatusRequest request) {
        User currentUser = authService.getCurrentAuthenticatedUser();
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Chamado não encontrado: " + id));

        verifyAccess(ticket);

        // Regra de segurança: Cliente só pode cancelar chamado novo ou fechar chamado resolvido
        if (currentUser.getRole() == Role.CUSTOMER) {
            if (request.getStatus() != TicketStatus.CANCELLED && request.getStatus() != TicketStatus.CLOSED) {
                throw new AccessDeniedException("Clientes só podem solicitar cancelamento ou encerramento");
            }
        }

        ticket.setStatus(request.getStatus());
        if (request.getStatus() == TicketStatus.RESOLVED) {
            ticket.setResolvedAt(Instant.now());
        } else if (request.getStatus() == TicketStatus.CLOSED) {
            ticket.setClosedAt(Instant.now());
        }

        ticket = ticketRepository.save(ticket);
        return mapToDto(ticket);
    }

    @Transactional(readOnly = true)
    public List<TicketMessageDto> getMessages(Long ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Chamado não encontrado: " + ticketId));

        verifyAccess(ticket);
        User currentUser = authService.getCurrentAuthenticatedUser();

        List<TicketMessage> messages;
        if (currentUser.getRole() == Role.CUSTOMER) {
            // Regra crítica obrigatória: Cliente NUNCA tem acesso a notas internas
            messages = messageRepository.findByTicketIdAndInternalFalseOrderByCreatedAtAsc(ticketId);
        } else {
            messages = messageRepository.findByTicketIdOrderByCreatedAtAsc(ticketId);
        }

        return messages.stream().map(this::mapMessageToDto).toList();
    }

    @Transactional
    public TicketMessageDto addMessage(Long ticketId, CreateMessageRequest request) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Chamado não encontrado: " + ticketId));

        verifyAccess(ticket);
        User currentUser = authService.getCurrentAuthenticatedUser();

        // Cliente não pode criar notas internas
        boolean isInternal = request.isInternal();
        if (currentUser.getRole() == Role.CUSTOMER) {
            isInternal = false;
        }

        TicketMessage message = TicketMessage.builder()
                .ticket(ticket)
                .author(currentUser)
                .message(request.getMessage())
                .internal(isInternal)
                .attachmentName(request.getAttachmentName())
                .attachmentPath(request.getAttachmentPath())
                .build();

        message = messageRepository.save(message);
        return mapMessageToDto(message);
    }

    private void verifyAccess(Ticket ticket) {
        User currentUser = authService.getCurrentAuthenticatedUser();
        if (currentUser.getRole() == Role.CUSTOMER && !ticket.getCustomer().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Você não possui permissão para acessar este chamado");
        }
    }

    private TicketResponseDto mapToDto(Ticket ticket) {
        return TicketResponseDto.builder()
                .id(ticket.getId())
                .code(ticket.getCode())
                .customerId(ticket.getCustomer().getId())
                .customerName(ticket.getCustomer().getFullName())
                .customerEmail(ticket.getCustomer().getEmail())
                .technicianId(ticket.getTechnician() != null ? ticket.getTechnician().getId() : null)
                .technicianName(ticket.getTechnician() != null ? ticket.getTechnician().getFullName() : null)
                .serviceId(ticket.getService() != null ? ticket.getService().getId() : null)
                .serviceName(ticket.getService() != null ? ticket.getService().getName() : "Atendimento Geral")
                .title(ticket.getTitle())
                .description(ticket.getDescription())
                .status(ticket.getStatus())
                .priority(ticket.getPriority())
                .remoteAccessTool(ticket.getRemoteAccessTool())
                .remoteAccessId(ticket.getRemoteAccessId())
                .estimatedPrice(ticket.getEstimatedPrice())
                .resolvedAt(ticket.getResolvedAt())
                .closedAt(ticket.getClosedAt())
                .createdAt(ticket.getCreatedAt())
                .updatedAt(ticket.getUpdatedAt())
                .build();
    }

    private TicketMessageDto mapMessageToDto(TicketMessage msg) {
        return TicketMessageDto.builder()
                .id(msg.getId())
                .ticketId(msg.getTicket().getId())
                .authorId(msg.getAuthor().getId())
                .authorName(msg.getAuthor().getFullName())
                .authorRole(msg.getAuthor().getRole().name())
                .message(msg.getMessage())
                .internal(msg.isInternal())
                .attachmentName(msg.getAttachmentName())
                .attachmentPath(msg.getAttachmentPath())
                .createdAt(msg.getCreatedAt())
                .build();
    }
}
