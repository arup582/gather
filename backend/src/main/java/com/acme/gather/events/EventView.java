package com.acme.gather.events;

import java.time.Instant;
import java.util.UUID;

public record EventView(
    UUID id,
    String title,
    String description,
    String venue,
    Instant startsAt,
    Instant endsAt,
    UUID organizerId,
    String organizerName,
    EventStatus status) {}
