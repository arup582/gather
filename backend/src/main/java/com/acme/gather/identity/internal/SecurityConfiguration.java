package com.acme.gather.identity.internal;

import java.util.Locale;
import org.springframework.context.annotation.*;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfiguration {
  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  UserDetailsService userDetailsService(UserRepository users) {
    return email ->
        users
            .findByEmail(email.trim().toLowerCase(Locale.ROOT))
            .map(
                u ->
                    User.withUsername(u.email)
                        .password(u.passwordHash)
                        .roles(u.role.name())
                        .disabled(!u.enabled)
                        .build())
            .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
  }

  @Bean
  SecurityFilterChain security(HttpSecurity http) throws Exception {
    http.authorizeHttpRequests(
            a ->
                a.requestMatchers(
                        "/api/auth/csrf", "/api/auth/signup", "/api/auth/login", "/api/auth/me")
                    .permitAll()
                    .requestMatchers(
                        org.springframework.http.HttpMethod.GET, "/api/events", "/api/events/*")
                    .permitAll()
                    .requestMatchers("/api/**")
                    .authenticated()
                    .anyRequest()
                    .denyAll())
        .csrf(Customizer.withDefaults())
        .requestCache(c -> c.disable())
        .formLogin(
            f ->
                f.loginProcessingUrl("/api/auth/login")
                    .usernameParameter("email")
                    .successHandler((req, res, auth) -> res.setStatus(204))
                    .failureHandler(
                        (req, res, e) -> json(res, 401, "Email or password is incorrect")))
        .logout(
            l ->
                l.logoutUrl("/api/auth/logout")
                    .logoutSuccessHandler((req, res, a) -> res.setStatus(204))
                    .deleteCookies("JSESSIONID"))
        .exceptionHandling(
            e ->
                e.authenticationEntryPoint((req, res, ex) -> json(res, 401, "Please sign in"))
                    .accessDeniedHandler(
                        (req, res, ex) ->
                            json(
                                res,
                                403,
                                "Access denied or your security token expired. Refresh and try"
                                    + " again.")))
        .headers(
            h ->
                h.contentSecurityPolicy(
                    c -> c.policyDirectives("default-src 'none'; frame-ancestors 'none'")));
    return http.build();
  }

  private static void json(jakarta.servlet.http.HttpServletResponse res, int status, String message)
      throws java.io.IOException {
    res.setStatus(status);
    res.setContentType("application/json");
    res.getWriter().write("{\"message\":\"" + message + "\",\"fields\":{}}");
  }
}
