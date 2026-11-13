package com.acme.gather.registrations.internal;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "registration")
public class Registration {
  @Id public UUID id;
  public UUID eventId;
  public UUID attendeeId;
  public String status;
  public Instant registeredAt;
  public Instant cancelledAt;
  public String cancellationReason;

  protected Registration() {}

  public Registration(UUID event, UUID attendee, Instant now) {
    id = UUID.randomUUID();
    eventId = event;
    attendeeId = attendee;
    status = "ACTIVE";
    registeredAt = now;
  }

  public void cancel(Instant now) {
    status = "CANCELLED";
    cancelledAt = now;
    cancellationReason = "ATTENDEE";
  }
}
