package com.acme.gather.attendance.internal;

import com.acme.gather.attendance.*;
import com.acme.gather.identity.IdentityService;
import java.util.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
public class AttendanceController {
  private final AttendanceService attendance;
  private final IdentityService identity;

  public AttendanceController(AttendanceService attendance, IdentityService identity) {
    this.attendance = attendance;
    this.identity = identity;
  }

  @PostMapping("/api/manage/events/{eventId}/registrations/{registrationId}/check-in")
  AttendanceView checkIn(
      Authentication auth, @PathVariable UUID eventId, @PathVariable UUID registrationId) {
    return attendance.checkIn(identity.current(auth), eventId, registrationId);
  }

  @GetMapping("/api/manage/events/{eventId}/attendance")
  List<AttendanceView> list(Authentication auth, @PathVariable UUID eventId) {
    return attendance.list(identity.current(auth), eventId);
  }
}
