package com.acme.gather.events;

import java.time.Instant;
import java.util.UUID;

public record EventCancelled(UUID eventId, Instant at) {}
