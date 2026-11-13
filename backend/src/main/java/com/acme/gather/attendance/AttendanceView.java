package com.acme.gather.attendance;

import java.time.Instant;
import java.util.UUID;

public record AttendanceView(UUID id, UUID registrationId, UUID checkedInBy, Instant checkedInAt) {}
