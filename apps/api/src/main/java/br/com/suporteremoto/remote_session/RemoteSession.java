package br.com.suporteremoto.remote_session;

import br.com.suporteremoto.identity.User;
import br.com.suporteremoto.ticket.Ticket;
import jakarta.persistence.*;
import lombok.*;

import java.time.Duration;
import java.time.Instant;

@Entity
@Table(name = "remote_sessions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RemoteSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "technician_id", nullable = false)
    private User technician;

    @Column(name = "tool_used", nullable = false, length = 50)
    private String toolUsed; // ANYDESK, TEAMVIEWER, etc.

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "paused_at")
    private Instant pausedAt;

    @Column(name = "last_resumed_at")
    private Instant lastResumedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(nullable = false, length = 50)
    private String status; // IN_PROGRESS, PAUSED, COMPLETED, CANCELLED

    @Builder.Default
    @Column(name = "accumulated_seconds", nullable = false)
    private Long accumulatedSeconds = 0L;

    @Builder.Default
    @Column(name = "billable_seconds", nullable = false)
    private Long billableSeconds = 0L;

    @Builder.Default
    @Column(name = "customer_consent", nullable = false)
    private boolean customerConsent = true;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public long calculateCurrentTotalSeconds() {
        if ("PAUSED".equals(status) || "COMPLETED".equals(status) || "CANCELLED".equals(status)) {
            return accumulatedSeconds;
        }
        Instant reference = lastResumedAt != null ? lastResumedAt : startedAt;
        long currentSegment = Duration.between(reference, Instant.now()).getSeconds();
        return accumulatedSeconds + Math.max(0, currentSegment);
    }
}
