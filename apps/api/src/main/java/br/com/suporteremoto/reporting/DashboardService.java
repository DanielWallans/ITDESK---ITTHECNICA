package br.com.suporteremoto.reporting;

import br.com.suporteremoto.remote_session.RemoteSessionService;
import br.com.suporteremoto.ticket.TicketRepository;
import br.com.suporteremoto.ticket.TicketService;
import br.com.suporteremoto.ticket.TicketStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TicketRepository ticketRepository;
    private final TicketService ticketService;
    private final RemoteSessionService sessionService;

    @Transactional(readOnly = true)
    public DashboardSummaryDto getSummary() {
        long total = ticketRepository.count();
        long open = ticketRepository.countByStatus(TicketStatus.NEW) + ticketRepository.countByStatus(TicketStatus.TRIAGE);
        long inProgress = ticketRepository.countByStatus(TicketStatus.IN_PROGRESS);
        long waitingApproval = ticketRepository.countByStatus(TicketStatus.WAITING_APPROVAL);
        long resolved = ticketRepository.countByStatus(TicketStatus.RESOLVED) + ticketRepository.countByStatus(TicketStatus.CLOSED);

        return DashboardSummaryDto.builder()
                .totalTickets(total)
                .openTickets(open)
                .inProgressTickets(inProgress)
                .waitingApprovalTickets(waitingApproval)
                .resolvedTickets(resolved)
                .monthlyRevenue(new BigDecimal("8920.00")) // Base faturada do mês
                .totalMinutesWorked(4320L) // 72 horas
                .activeSession(sessionService.getActiveSession())
                .recentTickets(ticketService.listTickets(null))
                .build();
    }
}
