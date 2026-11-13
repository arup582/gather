package com.acme.gather;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import com.tngtech.archunit.core.importer.*;
import org.junit.jupiter.api.Test;

class ArchitectureTest {
  final com.tngtech.archunit.core.domain.JavaClasses classes =
      new ClassFileImporter()
          .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
          .importPackages("com.acme.gather");

  @Test
  void internalsStayInsideTheirBusinessModule() {
    for (String module : new String[] {"identity", "events", "registrations", "attendance"})
      noClasses()
          .that()
          .resideOutsideOfPackage("com.acme.gather." + module + "..")
          .should()
          .dependOnClassesThat()
          .resideInAPackage("com.acme.gather." + module + ".internal..")
          .check(classes);
  }

  @Test
  void modulesHaveNoCycles() {
    slices().matching("com.acme.gather.(*)..").should().beFreeOfCycles().check(classes);
  }

  @Test
  void controllersDoNotUseRepositories() {
    noClasses()
        .that()
        .haveSimpleNameEndingWith("Controller")
        .should()
        .dependOnClassesThat()
        .haveSimpleNameEndingWith("Repository")
        .check(classes);
  }
}
