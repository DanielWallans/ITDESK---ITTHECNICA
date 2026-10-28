package br.com.suporteremoto.reporting;

import br.com.suporteremoto.remote_session.RemoteSessionDto;
import br.com.suporteremoto.ticket.TicketResponseDto;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class DashboardSummaryDto {
    private long totalTickets;
    private long openTickets;
    private long inProgressTickets;
    private long waitingApprovalTickets;
    private long resolvedTickets;
    private BigDecimal monthlyRevenue;
    private long totalMinutesWorked;
    private RemoteSessionDto activeSession;
    private List<TicketResponseDto> recentTickets;
}
