package com.acme.gather.attendance.internal;

import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {
  Optional<Attendance> findByRegistrationId(UUID id);

  // Query uses IDs only; no cross-module JPA association or internal Java dependency.
  @Query(
      value =
          "select a.* from attendance a join registration r on r.id=a.registration_id where"
              + " r.event_id=:id order by a.checked_in_at",
      nativeQuery = true)
  List<Attendance> forEvent(UUID id);
}
