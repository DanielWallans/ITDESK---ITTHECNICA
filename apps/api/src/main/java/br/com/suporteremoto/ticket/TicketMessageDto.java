package br.com.suporteremoto.ticket;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class TicketMessageDto {
    private Long id;
    private Long ticketId;
    private Long authorId;
    private String authorName;
    private String authorRole;
    private String message;
    private boolean internal;
    private String attachmentName;
    private String attachmentPath;
    private Instant createdAt;
}
