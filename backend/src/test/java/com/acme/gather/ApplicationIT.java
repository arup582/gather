package com.acme.gather;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.acme.gather.attendance.*;
import com.acme.gather.events.*;
import com.acme.gather.identity.*;
import com.acme.gather.registrations.*;
import com.acme.gather.shared.ApiException;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(classes = {GatherApplication.class, ApplicationIT.Config.class})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApplicationIT {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired JdbcTemplate jdbc;
  @Autowired IdentityService identity;
  @Autowired EventService events;
  @Autowired RegistrationService registrations;
  @Autowired AttendanceService attendance;
  @Autowired MutableClock clock;
  @Autowired PlatformTransactionManager transactionManager;
  Actor admin, host, other, attendee;
  String password;
  final Instant base = Instant.parse("2030-01-01T10:00:00Z");

  @BeforeEach
  void setup() {
    jdbc.execute("TRUNCATE attendance,registration,event,app_user CASCADE");
    clock.now.set(base);
    password = UUID.randomUUID().toString();
    admin = identity.create("admin@example.test", "Admin", password, Role.ADMIN);
    host = identity.create("host@example.test", "Host", password, Role.ORGANIZER);
    other = identity.create("other@example.test", "Other", password, Role.ORGANIZER);
    attendee = identity.signup("attendee@example.test", "Attendee", password);
  }

  EventInput input() {
    return new EventInput(
        "Community night",
        "A real gathering",
        "Local studio",
        base.plusSeconds(3600),
        base.plusSeconds(7200));
  }

  EventView published() {
    return events.publish(host, events.create(host, input()).id());
  }

  String body(Object value) {
    return json.writeValueAsString(value);
  }

  MockHttpSession login(String email) throws Exception {
    return (MockHttpSession)
        mvc.perform(
                post("/api/auth/login")
                    .with(csrf())
                    .param("email", email)
                    .param("password", password))
            .andExpect(status().isNoContent())
            .andReturn()
            .getRequest()
            .getSession(false);
  }

  @Test
  void realSessionCsrfRotationAndLogout() throws Exception {
    mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    mvc.perform(
            post("/api/auth/login").param("email", attendee.email()).param("password", password))
        .andExpect(status().isForbidden());
    var tokenResult = mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andReturn();
    var session = (MockHttpSession) tokenResult.getRequest().getSession(false);
    var oldSessionId = session.getId();
    var token = json.readTree(tokenResult.getResponse().getContentAsString()).get("token").asText();
    mvc.perform(
            post("/api/auth/login")
                .session(session)
                .with(
                    req -> {
                      req.setRequestedSessionId(session.getId());
                      req.setRequestedSessionIdValid(true);
                      return req;
                    })
                .header("X-CSRF-TOKEN", token)
                .param("email", attendee.email())
                .param("password", password))
        .andExpect(status().isNoContent());
    assertThat(session.getId()).isNotEqualTo(oldSessionId);
    mvc.perform(get("/api/auth/me").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value(attendee.email()));
    mvc.perform(post("/api/auth/logout").session(session).header("X-CSRF-TOKEN", token))
        .andExpect(status().isForbidden());
    var next = mvc.perform(get("/api/auth/csrf").session(session)).andReturn();
    var fresh = json.readTree(next.getResponse().getContentAsString()).get("token").asText();
    mvc.perform(post("/api/auth/logout").session(session).header("X-CSRF-TOKEN", fresh))
        .andExpect(status().isNoContent());
    assertThat(session.isInvalid()).isTrue();
  }

  @Test
  void signupIgnoresRoleAndHashesPasswordsAndRejectsDuplicateEmail() throws Exception {
    var data =
        Map.of(
            "email",
            "NEW@example.test",
            "displayName",
            "New user",
            "password",
            password,
            "role",
            "ADMIN");
    mvc.perform(
            post("/api/auth/signup")
                .with(csrf())
                .contentType("application/json")
                .content(body(data)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.role").value("ATTENDEE"))
        .andExpect(jsonPath("$.passwordHash").doesNotExist());
    var hash =
        jdbc.queryForObject(
            "select password_hash from app_user where email='new@example.test'", String.class);
    assertThat(hash).startsWith("$2");
    assertThat(hash).isNotEqualTo(password);
    mvc.perform(
            post("/api/auth/signup")
                .with(csrf())
                .contentType("application/json")
                .content(body(data)))
        .andExpect(status().isConflict());
    mvc.perform(
            post("/api/auth/signup")
                .with(csrf())
                .contentType("application/json")
                .content(body(Map.of("email", "bad", "displayName", "", "password", "short"))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fields.email").exists());
  }

  @Test
  void loginRejectsBadCredentialsAndDisabledAccounts() throws Exception {
    mvc.perform(
            post("/api/auth/login")
                .with(csrf())
                .param("email", attendee.email())
                .param("password", "incorrect"))
        .andExpect(status().isUnauthorized());
    identity.update(admin, attendee.id(), Role.ATTENDEE, false);
    mvc.perform(
            post("/api/auth/login")
                .with(csrf())
                .param("email", attendee.email())
                .param("password", password))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void ownershipAndAdminAccessAndDraftPrivacyAreEnforcedByApi() throws Exception {
    var draft = events.create(host, input());
    mvc.perform(get("/api/events/" + draft.id())).andExpect(status().isNotFound());
    mvc.perform(get("/api/events/" + draft.id()).with(user(other.email())))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/events/" + draft.id()).with(user(host.email())))
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/manage/events/" + draft.id() + "/publish")
                .with(user(other.email()))
                .with(csrf()))
        .andExpect(status().isForbidden());
    mvc.perform(
            post("/api/manage/events")
                .with(user(attendee.email()))
                .with(csrf())
                .contentType("application/json")
                .content(body(input())))
        .andExpect(status().isForbidden());
    mvc.perform(
            post("/api/manage/events/" + draft.id() + "/publish")
                .with(user(admin.email()))
                .with(csrf()))
        .andExpect(status().isOk());
    mvc.perform(get("/api/events/" + draft.id())).andExpect(status().isOk());
    var privateDraft = events.create(host, input());
    events.cancel(host, privateDraft.id());
    mvc.perform(get("/api/events/" + privateDraft.id())).andExpect(status().isNotFound());
  }

  @Test
  void roleAndDisableChangesApplyToExistingSessionsAndSelfDemotionIsBlocked() throws Exception {
    var session = login(host.email());
    mvc.perform(get("/api/manage/events").session(session)).andExpect(status().isOk());
    mvc.perform(
            patch("/api/admin/users/" + host.id())
                .with(user(attendee.email()))
                .with(csrf())
                .contentType("application/json")
                .content(body(Map.of("role", "ADMIN", "enabled", true))))
        .andExpect(status().isForbidden());
    identity.update(admin, host.id(), Role.ATTENDEE, true);
    mvc.perform(get("/api/manage/events").session(session)).andExpect(status().isForbidden());
    identity.update(admin, host.id(), Role.ORGANIZER, false);
    mvc.perform(get("/api/manage/events").session(session)).andExpect(status().isUnauthorized());
    mvc.perform(
            patch("/api/admin/users/" + admin.id())
                .with(user(admin.email()))
                .with(csrf())
                .contentType("application/json")
                .content(body(Map.of("role", "ATTENDEE", "enabled", true))))
        .andExpect(status().isConflict());
  }

  @Test
  void publicBrowseSearchPaginationAndValidation() throws Exception {
    published();
    events.create(host, input());
    mvc.perform(get("/api/events").param("q", "community").param("size", "1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(jsonPath("$.content.length()").value(1));
    mvc.perform(get("/api/events").param("q", "%")).andExpect(jsonPath("$.totalElements").value(0));
    mvc.perform(get("/api/events").param("size", "1000")).andExpect(status().isBadRequest());
    mvc.perform(
            post("/api/manage/events")
                .with(user(host.email()))
                .with(csrf())
                .contentType("application/json")
                .content(
                    body(
                        new EventInput(" ", "D", "V", base.plusSeconds(20), base.plusSeconds(30)))))
        .andExpect(status().isBadRequest());
    clock.now.set(base.plusSeconds(3600));
    mvc.perform(get("/api/events")).andExpect(jsonPath("$.totalElements").value(0));
  }

  @Test
  void registrationHistoryDuplicateCancellationAndPrivacy() throws Exception {
    var e = published();
    var first = registrations.register(attendee, e.id());
    assertThat(registrations.register(attendee, e.id()).id()).isEqualTo(first.id());
    mvc.perform(
            post("/api/registrations/" + first.id() + "/cancel")
                .with(user(other.email()))
                .with(csrf()))
        .andExpect(status().isNotFound());
    mvc.perform(get("/api/registrations").with(user(other.email())))
        .andExpect(jsonPath("$.totalElements").value(0));
    mvc.perform(get("/api/manage/events/" + e.id() + "/registrations").with(user(other.email())))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/manage/events/" + e.id() + "/registrations").with(user(host.email())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(1));
    assertThat(registrations.cancel(attendee, first.id()).status()).isEqualTo("CANCELLED");
    assertThat(registrations.cancel(attendee, first.id()).status()).isEqualTo("CANCELLED");
    assertThat(registrations.register(attendee, e.id()).id()).isNotEqualTo(first.id());
    assertThat(registrations.mine(attendee, 0, 20).totalElements()).isEqualTo(2);
  }

  @Test
  void registrationRejectsDraftCancelledAndStartedEventsAndLateCancellation() {
    var draft = events.create(host, input());
    assertThatThrownBy(() -> registrations.register(attendee, draft.id()))
        .isInstanceOf(ApiException.class);
    events.cancel(host, draft.id());
    assertThatThrownBy(() -> registrations.register(attendee, draft.id()))
        .isInstanceOf(ApiException.class);
    var e = published();
    var r = registrations.register(attendee, e.id());
    clock.now.set(e.startsAt());
    assertThatThrownBy(() -> registrations.register(other, e.id()))
        .hasMessageContaining("not started");
    assertThatThrownBy(() -> registrations.cancel(attendee, r.id()))
        .hasMessageContaining("after the event starts");
  }

  @Test
  void eventCancellationCancelsRegistrationsAtomicallyAndPreservesHistory() {
    var e = published();
    var r = registrations.register(attendee, e.id());
    var tx = new TransactionTemplate(transactionManager);
    assertThatThrownBy(
            () ->
                tx.executeWithoutResult(
                    s -> {
                      events.cancel(host, e.id());
                      throw new IllegalStateException("rollback");
                    }))
        .isInstanceOf(IllegalStateException.class);
    assertThat(events.get(e.id(), null).status()).isEqualTo(EventStatus.PUBLISHED);
    assertThat(registrations.mine(attendee, 0, 20).content().getFirst().status())
        .isEqualTo("ACTIVE");
    events.cancel(host, e.id());
    events.cancel(host, e.id());
    var cancelled = registrations.mine(attendee, 0, 20).content().getFirst();
    assertThat(cancelled.id()).isEqualTo(r.id());
    assertThat(cancelled.status()).isEqualTo("CANCELLED");
    assertThat(cancelled.cancellationReason()).isEqualTo("EVENT_CANCELLED");
  }

  @Test
  void checkInRequiresOwnerActiveRegistrationAndEventWindowAndIsIdempotent() throws Exception {
    var e = published();
    var first = registrations.register(attendee, e.id());
    registrations.cancel(attendee, first.id());
    var active = registrations.register(attendee, e.id());
    assertThatThrownBy(() -> attendance.checkIn(host, e.id(), active.id()))
        .hasMessageContaining("in progress");
    clock.now.set(e.startsAt());
    mvc.perform(
            post("/api/manage/events/" + e.id() + "/registrations/" + active.id() + "/check-in")
                .with(user(other.email()))
                .with(csrf()))
        .andExpect(status().isForbidden());
    mvc.perform(
            post("/api/manage/events/" + e.id() + "/registrations/" + first.id() + "/check-in")
                .with(user(host.email()))
                .with(csrf()))
        .andExpect(status().isConflict());
    var checked = attendance.checkIn(host, e.id(), active.id());
    assertThat(attendance.checkIn(host, e.id(), active.id())).isEqualTo(checked);
    mvc.perform(get("/api/manage/events/" + e.id() + "/attendance").with(user(host.email())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1));
    clock.now.set(e.endsAt());
    assertThat(attendance.checkIn(host, e.id(), active.id())).isEqualTo(checked);
  }

  @Test
  void checkInRejectsCrossEventIdsEndedAndCancelledEvents() {
    var a = published();
    var b = published();
    var r = registrations.register(attendee, a.id());
    clock.now.set(a.startsAt());
    assertThatThrownBy(() -> attendance.checkIn(host, b.id(), r.id()))
        .hasMessage("Resource not found");
    clock.now.set(a.endsAt());
    assertThatThrownBy(() -> attendance.checkIn(host, a.id(), r.id()))
        .hasMessageContaining("in progress");
    events.cancel(host, a.id());
    assertThatThrownBy(() -> attendance.checkIn(host, a.id(), r.id()))
        .hasMessageContaining("active registrations");
  }

  @Test
  void postgresConstraintsRejectDuplicateActiveInvalidDateAndOrphan() {
    var e = published();
    registrations.register(attendee, e.id());
    assertThatThrownBy(
            () ->
                jdbc.update(
                    "insert into registration(id,event_id,attendee_id,status,registered_at) values"
                        + " (?,?,?,'ACTIVE',now())",
                    UUID.randomUUID(),
                    e.id(),
                    attendee.id()))
        .isInstanceOf(DataIntegrityViolationException.class);
    assertThatThrownBy(() -> jdbc.update("update event set ends_at=starts_at where id=?", e.id()))
        .isInstanceOf(DataIntegrityViolationException.class);
    assertThatThrownBy(
            () ->
                jdbc.update(
                    "insert into attendance(id,registration_id,checked_in_by,checked_in_at) values"
                        + " (?,?,?,now())",
                    UUID.randomUUID(),
                    UUID.randomUUID(),
                    host.id()))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void simultaneousRegistrationsCommitExactlyOneActiveRow() throws Exception {
    var e = published();
    var start = new CountDownLatch(1);
    try (var pool = Executors.newFixedThreadPool(8)) {
      var tasks = new ArrayList<Future<UUID>>();
      for (int i = 0; i < 8; i++)
        tasks.add(
            pool.submit(
                () -> {
                  start.await();
                  return registrations.register(attendee, e.id()).id();
                }));
      start.countDown();
      var ids = new HashSet<UUID>();
      for (var task : tasks) ids.add(task.get(20, TimeUnit.SECONDS));
      assertThat(ids).hasSize(1);
    }
    assertThat(
            jdbc.queryForObject(
                "select count(*) from registration where event_id=? and status='ACTIVE'",
                Integer.class,
                e.id()))
        .isEqualTo(1);
  }

  @Test
  void registrationRacingEventCancellationCannotLeaveActiveRows() throws Exception {
    var e = published();
    var start = new CountDownLatch(1);
    try (var pool = Executors.newFixedThreadPool(2)) {
      var register =
          pool.submit(
              () -> {
                start.await();
                try {
                  registrations.register(attendee, e.id());
                } catch (ApiException expected) {
                  assertThat(expected.status().value()).isEqualTo(409);
                }
                return true;
              });
      var cancel =
          pool.submit(
              () -> {
                start.await();
                events.cancel(host, e.id());
                return true;
              });
      start.countDown();
      register.get(20, TimeUnit.SECONDS);
      cancel.get(20, TimeUnit.SECONDS);
    }
    assertThat(
            jdbc.queryForObject(
                "select count(*) from registration where event_id=? and status='ACTIVE'",
                Integer.class,
                e.id()))
        .isZero();
  }

  @Test
  void postgresRejectsCancelledRegistrationWithoutReason() {
    var event = published();
    var registration = registrations.register(attendee, event.id());
    assertThatThrownBy(
            () ->
                jdbc.update(
                    "update registration set status='CANCELLED', cancelled_at=now(),"
                        + " cancellation_reason=null where id=?",
                    registration.id()))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void concurrentAdministratorsCannotDisableEachOther() throws Exception {
    var secondAdmin = identity.update(admin, other.id(), Role.ADMIN, true);
    var start = new CountDownLatch(1);
    try (var pool = Executors.newFixedThreadPool(2)) {
      var first =
          pool.submit(
              () -> {
                start.await();
                try {
                  identity.update(admin, secondAdmin.id(), Role.ADMIN, false);
                } catch (ApiException e) {
                  assertThat(e.status().value()).isEqualTo(403);
                }
                return true;
              });
      var second =
          pool.submit(
              () -> {
                start.await();
                try {
                  identity.update(secondAdmin, admin.id(), Role.ADMIN, false);
                } catch (ApiException e) {
                  assertThat(e.status().value()).isEqualTo(403);
                }
                return true;
              });
      start.countDown();
      first.get(20, TimeUnit.SECONDS);
      second.get(20, TimeUnit.SECONDS);
    }
    assertThat(
            jdbc.queryForObject(
                "select count(*) from app_user where role='ADMIN' and enabled=true", Integer.class))
        .isEqualTo(1);
  }

  @TestConfiguration
  static class Config {
    @Bean
    @Primary
    MutableClock testClock() {
      return new MutableClock();
    }

    @Bean
    @Primary
    PasswordEncoder testEncoder() {
      return new BCryptPasswordEncoder(4);
    }
  }

  static class MutableClock extends Clock {
    final AtomicReference<Instant> now =
        new AtomicReference<>(Instant.parse("2030-01-01T10:00:00Z"));

    public ZoneId getZone() {
      return ZoneOffset.UTC;
    }

    public Clock withZone(ZoneId zone) {
      return this;
    }

    public Instant instant() {
      return now.get();
    }
  }
}
