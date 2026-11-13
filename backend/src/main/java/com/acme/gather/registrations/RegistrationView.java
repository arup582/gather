package com.acme.gather.registrations;

import com.acme.gather.events.EventView;
import java.time.Instant;
import java.util.UUID;

public record RegistrationView(
    UUID id,
    EventView event,
    UUID attendeeId,
    String attendeeName,
    String attendeeEmail,
    String status,
    Instant registeredAt,
    Instant cancelledAt,
    String cancellationReason) {}
