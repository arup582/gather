package com.acme.gather.events;

import jakarta.validation.constraints.*;
import java.time.Instant;

public record EventInput(
    @NotBlank @Size(max = 160) String title,
    @NotBlank @Size(max = 10000) String description,
    @NotBlank @Size(max = 240) String venue,
    @NotNull Instant startsAt,
    @NotNull Instant endsAt) {}
