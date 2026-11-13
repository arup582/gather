package com.acme.gather.bootstrap;

import com.acme.gather.events.*;
import com.acme.gather.identity.*;
import com.acme.gather.registrations.RegistrationService;
import java.time.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.*;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("dev")
public class DevelopmentSeed implements ApplicationRunner {
  private final IdentityService identity;
  private final EventService events;
  private final RegistrationService registrations;
  private final String password;
  private final Clock clock;

  public DevelopmentSeed(
      IdentityService identity,
      EventService events,
      RegistrationService registrations,
      @Value("${app.seed-password}") String password,
      Clock clock) {
    this.identity = identity;
    this.events = events;
    this.registrations = registrations;
    this.password = password;
    this.clock = clock;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    // Whole seed is atomic. Do not modify existing accounts, passwords, or event dates on restart.
    if (identity.find("admin@example.test").isPresent()) return;
    identity.create("admin@example.test", "Alex Admin", password, Role.ADMIN);
    var host = identity.create("organizer@example.test", "Sam Organizer", password, Role.ORGANIZER);
    var attendee =
        identity.create("attendee@example.test", "Taylor Attendee", password, Role.ATTENDEE);
    identity.create("other-organizer@example.test", "Jordan Organizer", password, Role.ORGANIZER);
    var now = clock.instant().truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
    String[][] samples = {
      {
        "Ideas after hours",
        "An evening for curious people. Share a project, meet local makers, and leave with a fresh"
            + " perspective.",
        "The Workshop, Bengaluru"
      },
      {
        "A walk through the city",
        "Discover the stories hidden in familiar streets with a small group of fellow explorers."
            + " Comfortable shoes encouraged.",
        "Cubbon Park, Bengaluru"
      },
      {
        "Build something together",
        "A hands-on afternoon of creative collaboration. Bring a laptop and an idea; all experience"
            + " levels are welcome.",
        "Studio 12, Bengaluru"
      },
      {
        "The community table",
        "Good food and new connections. Join a relaxed conversation about what makes our"
            + " neighbourhood special.",
        "Common Ground, Bengaluru"
      }
    };
    for (int i = 0; i < samples.length; i++) {
      var s = samples[i];
      var start = now.plus(Duration.ofDays(i + 2));
      var e =
          events.create(
              host, new EventInput(s[0], s[1], s[2], start, start.plus(Duration.ofHours(2))));
      events.publish(host, e.id());
      if (i == 0) registrations.register(attendee, e.id());
    }
    events.create(
        host,
        new EventInput(
            "Next season planning",
            "A draft event to try the publishing workflow.",
            "Community studio",
            now.plus(Duration.ofDays(14)),
            now.plus(Duration.ofDays(14)).plus(Duration.ofHours(2))));
  }
}
