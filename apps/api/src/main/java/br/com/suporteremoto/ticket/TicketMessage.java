package br.com.suporteremoto.ticket;

import br.com.suporteremoto.identity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "ticket_messages")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "is_internal", nullable = false)
    private boolean internal;

    @Column(name = "attachment_name")
    private String attachmentName;

    @Column(name = "attachment_path")
    private String attachmentPath;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
