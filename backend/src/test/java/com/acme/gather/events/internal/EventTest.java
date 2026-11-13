package com.acme.gather.events.internal;

import static org.assertj.core.api.Assertions.*;

import com.acme.gather.events.*;
import com.acme.gather.shared.ApiException;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class EventTest {
  final Instant now = Instant.parse("2030-01-01T10:00:00Z");

  EventInput input() {
    return new EventInput(
        "Community night", "Bring an idea", "Studio", now.plusSeconds(3600), now.plusSeconds(7200));
  }

  @Test
  void beginsAsDraftAndPublicationIsIdempotent() {
    var e = new Event(UUID.randomUUID(), input(), now);
    assertThat(e.status).isEqualTo(EventStatus.DRAFT);
    e.publish(now);
    e.publish(now);
    assertThat(e.status).isEqualTo(EventStatus.PUBLISHED);
    assertThat(e.publishedAt).isEqualTo(now);
  }

  @Test
  void cancellationIsTerminalAndIdempotent() {
    var e = new Event(UUID.randomUUID(), input(), now);
    assertThat(e.cancel()).isTrue();
    assertThat(e.cancel()).isFalse();
    assertThatThrownBy(() -> e.publish(now)).isInstanceOf(ApiException.class);
    assertThatThrownBy(() -> e.edit(input(), now)).isInstanceOf(ApiException.class);
  }

  @Test
  void refusesInvalidDateRange() {
    var in = new EventInput("T", "D", "V", now.plusSeconds(90), now.plusSeconds(10));
    assertThatThrownBy(() -> new Event(UUID.randomUUID(), in, now))
        .hasMessageContaining("end must be after");
  }

  @Test
  void refusesPastOrEqualStart() {
    var in = new EventInput("T", "D", "V", now, now.plusSeconds(10));
    assertThatThrownBy(() -> new Event(UUID.randomUUID(), in, now))
        .hasMessageContaining("start must be in the future");
  }

  @Test
  void cannotPublishAStartedDraft() {
    var e = new Event(UUID.randomUUID(), input(), now);
    assertThatThrownBy(() -> e.publish(now.plusSeconds(3600))).hasMessageContaining("Started");
  }

  @Test
  void publishedTimesAreImmutableButDescriptionCanChange() {
    var e = new Event(UUID.randomUUID(), input(), now);
    e.publish(now);
    e.edit(new EventInput("Updated", "New description", "New venue", e.startsAt, e.endsAt), now);
    assertThat(e.title).isEqualTo("Updated");
    assertThatThrownBy(
            () ->
                e.edit(
                    new EventInput("T", "D", "V", now.plusSeconds(4000), now.plusSeconds(8000)),
                    now))
        .hasMessageContaining("Published event times cannot change");
  }

  @Test
  void cannotEditStartedEvent() {
    var e = new Event(UUID.randomUUID(), input(), now);
    assertThatThrownBy(() -> e.edit(input(), now.plusSeconds(3600)))
        .hasMessageContaining("Started events");
  }
}
