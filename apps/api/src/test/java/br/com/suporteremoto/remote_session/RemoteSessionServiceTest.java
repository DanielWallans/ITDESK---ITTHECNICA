package br.com.suporteremoto.remote_session;

import br.com.suporteremoto.identity.AuthService;
import br.com.suporteremoto.identity.Role;
import br.com.suporteremoto.identity.User;
import br.com.suporteremoto.ticket.Ticket;
import br.com.suporteremoto.ticket.TicketRepository;
import br.com.suporteremoto.ticket.TicketStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RemoteSessionServiceTest {

    @Mock
    private RemoteSessionRepository sessionRepository;

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private AuthService authService;

    @InjectMocks
    private RemoteSessionService sessionService;

    private User technician;
    private User customer;
    private Ticket ticket;

    @BeforeEach
    void setUp() {
        technician = User.builder().id(1L).fullName("Técnico Suporte").role(Role.TECHNICIAN).build();
        customer = User.builder().id(2L).fullName("Cliente Teste").role(Role.CUSTOMER).build();
        ticket = Ticket.builder()
                .id(50L)
                .code("CH-2026-000050")
                .customer(customer)
                .title("Instalação remota")
                .status(TicketStatus.NEW)
                .build();
    }

    @Test
    @DisplayName("Cenário Crítico: Iniciar sessão remota deve definir status IN_PROGRESS e atualizar chamado")
    void shouldStartRemoteSessionCorrectly() {
        StartSessionRequest req = new StartSessionRequest();
        req.setTicketId(50L);
        req.setToolUsed("ANYDESK");
        req.setCustomerConsent(true);

        when(authService.getCurrentAuthenticatedUser()).thenReturn(technician);
        when(ticketRepository.findById(50L)).thenReturn(Optional.of(ticket));
        when(sessionRepository.findFirstByTicketIdAndStatusIn(eq(50L), anyList())).thenReturn(Optional.empty());
        when(sessionRepository.save(any(RemoteSession.class))).thenAnswer(invocation -> {
            RemoteSession s = invocation.getArgument(0);
            s.setId(10L);
            return s;
        });

        RemoteSessionDto result = sessionService.startSession(req);

        assertNotNull(result);
        assertEquals("IN_PROGRESS", result.getStatus());
        assertEquals(TicketStatus.IN_PROGRESS, ticket.getStatus());
        assertEquals(technician, ticket.getTechnician());
        verify(ticketRepository, times(1)).save(ticket);
    }

    @Test
    @DisplayName("Cenário Crítico: Finalizar sessão deve consolidar o status COMPLETED e o tempo faturável")
    void shouldEndRemoteSessionAndConsolidateBillableTime() {
        RemoteSession activeSession = RemoteSession.builder()
                .id(10L)
                .ticket(ticket)
                .technician(technician)
                .toolUsed("ANYDESK")
                .startedAt(Instant.now().minusSeconds(1800))
                .accumulatedSeconds(0L)
                .status("IN_PROGRESS")
                .build();

        when(sessionRepository.findById(10L)).thenReturn(Optional.of(activeSession));
        when(sessionRepository.save(any(RemoteSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RemoteSessionDto result = sessionService.endSession(10L, "Atendimento concluído com êxito.");

        assertNotNull(result);
        assertEquals("COMPLETED", result.getStatus());
        assertTrue(result.getBillableSeconds() >= 1700);
        assertNotNull(result.getEndedAt());
    }
}
