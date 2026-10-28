package br.com.suporteremoto.remote_session;

import br.com.suporteremoto.identity.AuthService;
import br.com.suporteremoto.identity.User;
import br.com.suporteremoto.ticket.Ticket;
import br.com.suporteremoto.ticket.TicketRepository;
import br.com.suporteremoto.ticket.TicketStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RemoteSessionService {

    private final RemoteSessionRepository sessionRepository;
    private final TicketRepository ticketRepository;
    private final AuthService authService;

    @Transactional
    public RemoteSessionDto startSession(StartSessionRequest request) {
        User technician = authService.getCurrentAuthenticatedUser();
        Ticket ticket = ticketRepository.findById(request.getTicketId())
                .orElseThrow(() -> new IllegalArgumentException("Chamado não encontrado: " + request.getTicketId()));

        // Evita múltiplas sessões ativas simultâneas para o mesmo chamado
        sessionRepository.findFirstByTicketIdAndStatusIn(ticket.getId(), List.of("IN_PROGRESS", "PAUSED"))
                .ifPresent(existing -> {
                    throw new IllegalStateException("Já existe uma sessão em andamento para este chamado (ID: " + existing.getId() + ")");
                });

        Instant now = Instant.now();
        RemoteSession session = RemoteSession.builder()
                .ticket(ticket)
                .technician(technician)
                .toolUsed(request.getToolUsed() != null ? request.getToolUsed() : "ANYDESK")
                .startedAt(now)
                .status("IN_PROGRESS")
                .accumulatedSeconds(0L)
                .billableSeconds(0L)
                .customerConsent(request.isCustomerConsent())
                .notes(request.getNotes())
                .build();

        session = sessionRepository.save(session);

        // Atualiza status do chamado para IN_PROGRESS
        ticket.setStatus(TicketStatus.IN_PROGRESS);
        if (ticket.getTechnician() == null) {
            ticket.setTechnician(technician);
        }
        ticketRepository.save(ticket);

        return mapToDto(session);
    }

    @Transactional
    public RemoteSessionDto pauseSession(Long sessionId) {
        RemoteSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Sessão não encontrada: " + sessionId));

        if (!"IN_PROGRESS".equals(session.getStatus())) {
            throw new IllegalStateException("Apenas sessões em andamento podem ser pausadas");
        }

        Instant now = Instant.now();
        Instant reference = session.getLastResumedAt() != null ? session.getLastResumedAt() : session.getStartedAt();
        long elapsedSegment = Duration.between(reference, now).getSeconds();

        session.setAccumulatedSeconds(session.getAccumulatedSeconds() + Math.max(0, elapsedSegment));
        session.setPausedAt(now);
        session.setStatus("PAUSED");

        session = sessionRepository.save(session);
        return mapToDto(session);
    }

    @Transactional
    public RemoteSessionDto resumeSession(Long sessionId) {
        RemoteSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Sessão não encontrada: " + sessionId));

        if (!"PAUSED".equals(session.getStatus())) {
            throw new IllegalStateException("Apenas sessões pausadas podem ser retomadas");
        }

        session.setLastResumedAt(Instant.now());
        session.setStatus("IN_PROGRESS");

        session = sessionRepository.save(session);
        return mapToDto(session);
    }

    @Transactional
    public RemoteSessionDto endSession(Long sessionId, String finalNotes) {
        RemoteSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Sessão não encontrada: " + sessionId));

        if ("COMPLETED".equals(session.getStatus()) || "CANCELLED".equals(session.getStatus())) {
            throw new IllegalStateException("Sessão já finalizada anteriormente");
        }

        Instant now = Instant.now();
        long totalSeconds;

        if ("IN_PROGRESS".equals(session.getStatus())) {
            Instant reference = session.getLastResumedAt() != null ? session.getLastResumedAt() : session.getStartedAt();
            long elapsedSegment = Duration.between(reference, now).getSeconds();
            totalSeconds = session.getAccumulatedSeconds() + Math.max(0, elapsedSegment);
        } else {
            totalSeconds = session.getAccumulatedSeconds();
        }

        session.setAccumulatedSeconds(totalSeconds);
        session.setBillableSeconds(totalSeconds);
        session.setEndedAt(now);
        session.setStatus("COMPLETED");
        if (finalNotes != null && !finalNotes.isBlank()) {
            session.setNotes((session.getNotes() != null ? session.getNotes() + "\n" : "") + finalNotes);
        }

        session = sessionRepository.save(session);
        return mapToDto(session);
    }

    @Transactional(readOnly = true)
    public RemoteSessionDto getActiveSession() {
        return sessionRepository.findByStatusIn(List.of("IN_PROGRESS", "PAUSED"))
                .stream()
                .findFirst()
                .map(this::mapToDto)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<RemoteSessionDto> getSessionsForTicket(Long ticketId) {
        return sessionRepository.findByTicketIdOrderByStartedAtDesc(ticketId).stream()
                .map(this::mapToDto)
                .toList();
    }

    public RemoteSessionDto mapToDto(RemoteSession session) {
        return RemoteSessionDto.builder()
                .id(session.getId())
                .ticketId(session.getTicket().getId())
                .ticketCode(session.getTicket().getCode())
                .ticketTitle(session.getTicket().getTitle())
                .customerName(session.getTicket().getCustomer().getFullName())
                .technicianId(session.getTechnician().getId())
                .technicianName(session.getTechnician().getFullName())
                .toolUsed(session.getToolUsed())
                .startedAt(session.getStartedAt())
                .pausedAt(session.getPausedAt())
                .endedAt(session.getEndedAt())
                .status(session.getStatus())
                .currentTotalSeconds(session.calculateCurrentTotalSeconds())
                .billableSeconds(session.getBillableSeconds())
                .customerConsent(session.isCustomerConsent())
                .notes(session.getNotes())
                .build();
    }
}
