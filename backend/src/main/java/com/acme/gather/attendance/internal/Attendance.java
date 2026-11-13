package com.acme.gather.attendance.internal;

import com.acme.gather.attendance.AttendanceView;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "attendance")
public class Attendance {
  @Id public UUID id;
  public UUID registrationId;
  public UUID checkedInBy;
  public Instant checkedInAt;

  protected Attendance() {}

  public Attendance(UUID registration, UUID actor, Instant now) {
    id = UUID.randomUUID();
    registrationId = registration;
    checkedInBy = actor;
    checkedInAt = now;
  }

  public AttendanceView view() {
    return new AttendanceView(id, registrationId, checkedInBy, checkedInAt);
  }
}
