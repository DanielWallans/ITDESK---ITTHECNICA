package br.com.suporteremoto.ticket;

public enum TicketStatus {
    NEW,
    TRIAGE,
    WAITING_CUSTOMER,
    WAITING_APPROVAL,
    READY_TO_SCHEDULE,
    SCHEDULED,
    IN_PROGRESS,
    WAITING_EXTERNAL,
    RESOLVED,
    CLOSED,
    CANCELLED
}
