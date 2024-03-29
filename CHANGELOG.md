## 1.2.2 (2023-03-04)

### Features

- **assessments:** added several fields to the assessment GraphQL type definition: nbInstances, nbEvaluations and takesStatus (teacher and student)

## 1.2.1 (2023-02-11)

### Features

- **assessments:** configure an assessment to be a 'group' assessment or not (teacher)

- **evaluations:** provide an optional acceptance comment when accepting an evaluation request (teacher)

## 1.2.0 (2023-02-04)

### Features

- **assessments:** added a finished field for assessment instances
- **assessments:** configure an assessment to make URL required when requesting an evaluation

- **courses:** define an end of evaluation requests date

- **evaluations:** added an URL field for evaluations
- **evaluations:** unpublish an evaluation

### Improvements

- **assessments:** added several fields to get additional information (existence of a schedule and existence of evaluations)

### Code Refactoring

- renamed the entities representing assessment instances (from assessmentInstance to just instance)

## 1.1.22 (2022-12-18)

### Bug Fixes

- **courses:** fixed issue with wrong values for boolean GraphQL fields in courses resolver

## 1.1.21 (2022-12-07)

### Features

- **evaluations:** publish evaluation for phased assessments

### Improvements

- **assessments:** refactored assessment creation and edit resolvers

### Bug Fixes

- **evaluations:** fixed a bug when deleting an evaluation request
- **evaluations:** fixed a bug when publishing an evaluation for an incremental assessment

## 1.1.20 (2022-11-26)

### Bug Fixes

- **registrations:** fixed issue with the computation of students' progress when there are competencies using learning outcomes

## 1.1.19 (2022-11-24)

### Features

- **evaluations:** added a 'phase' field for evaluations

### Improvements

- **registrations:** added a specific resolver to retrieve the user associated to the registration

### Bug Fixes

- **registrations:** fixed issue with the computation of students' progress

## 1.1.18 (2022-11-17)

### Bug Fixes

- **evaluations:** fixed issue in the 'pastCompetencies' resolver
- **evaluations:** fixed issue when creating an evaluation (not the first one) for a single instance incremental assessment

## 1.1.17 (2022-11-15)

### Improvements

- added one field to the assessment GraphQL type definition (nbPhases)

### Bug Fixes

- **evaluations:** fixed issue when requesting an evaluation without any competencies

## 1.1.16 (2022-11-14)

### Bug Fixes

- **evaluations:** fixed issue when creating an evaluation without any competencies

## 1.1.15 (2022-11-12)

### Features

- **registrations:** get the progress associated to a registration for a given course and a given learner (teacher)

### Improvements

- added two fields to the evaluation GraphQL type definition (accepted and rejected dates) and one to the assessment GraphQL type definition (hasProvider)
- set the evaluation date to the accept date for evaluation upon first edit (if none is provided)

### Code Refactoring

- refactored evaluations args cleaning function
- refactored registrations related resolver by simplifying the code args

### Bug Fixes

- **evaluations:** fixed issue when publishing an evaluation without any competencies
- **evaluations:** fixed issue with a wrong check on instances constraint when creating a new evaluation

## 1.1.14 (2022-11-01)

### Features

- **evaluations:** correct evaluations from assessment with the 'tfq' provider (teacher)
- **evaluations:** display solution and feedback for evaluations from assessment with the 'tfq' provider (teacher)

### Code Refactoring

- refactored several pieces of code (increasing the visibility of several fields, defining resolvers specific to GraphQL 'secondary' types)

## 1.1.13 (2022-10-28)

### Features

- **assessments:** export evaluation form for a given assessment (teacher)

### Improvements

- improved the handling of assessments with the 'tfq' provider

## 1.1.12 (2022-10-27)

### Features

- **courses:** define working groups for a course (coordinator)

### Improvements

- added checks for the evaluation request against the assessement dates

### Bug Fixes

- **evaluations:** fixed issue with the 'canRequestEvaluation' field by making the difference between the 'evaluationRequest' MongoDB field and the 'canRequestEvaluation' GraphQL field
- **evaluations:** fixed issue with the 'requestedCompetencies' field that can now be accessed for teachers as an evaluation GraphQL field

## 1.1.11 (2022-10-24)

### Features

- **assessments:** delete an instance (admin)

- **evaluations:** get the list of all the evaluations, or only the published ones, associated to a given assessment (teacher)
- **evaluations:** get competencies acquired by past evaluations for incremental assessment (teacher and student)

- **files:** get the list of files (resources) associated to a given course (student)

- **users:** reset the password (user)

### Bug Fixes

- fixed a bug in the banner update resolver (unlink failed when the file does not exist)
- fixed a bug in the resolver to delete an evaluation

## 1.1.10 (2022-10-19)

### Bug Fixes

- **evaluations:** fixed issue in the evaluation creation mutation that avoided the creation of an evaluation on an existing instance

## 1.1.9 (2022-10-17)

### Features

- **evaluations:** accept an evaluation request (teacher)
- **evaluations:** delete a published evaluation (teacher)
- **evaluations:** edit a non-published or accepted evaluation (teacher)
- **evaluations:** reject an evaluation request (teacher)

## 1.1.8 (2022-10-15)

### Features

- **assessments:** take and submit an assessment that has been defined with the tfq provider (student)

### Improvements

- added the requested status for evaluations

## 1.1.7 (2022-10-09)

### Features

- **assessments:** configure an assessment to not authorise evaluation request (coordinator)

### Improvements

- added field to the evaluation GraphQL type definition

### Bug Fixes

- made the pre-commit hook executable

## 1.1.6 (2022-10-08)

### Features

- **assessments:** made assessment instances available to students (student)

- **competencies:** archive a competency (coordinator)

- **evaluations:** define a private note for an evaluation (teacher)
- **evaluations:** request an evaluation (student)

### Improvements

- the displayName resolver has been fixed to either retrieve the concatenation of first and last names or the email address (user)

## 1.1.5 (2022-09-28)

### Features

- **evaluations:** get the list of all the evaluations associated to a given course (student)

- **registrations:** delete a registration that is not confirmed yet (coordinator)
- **registrations:** get the progress associated to a registration for a given course (student and teacher)

### Improvements

- made it possible to resend the confirmation email from the email address (user)

### Bug Fixes

- **courses:** fix an issue for invitation requests for a course
- **courses:** fix an issue with wrong field auth requirements

- **evaluations:** fix an issue with wrong field auth requirements

## 1.1.4 (2022-09-22)

### Bug Fixes

- **competencies:** fixed competency cleaning function for competencies without learning outcomes

## 1.1.3 (2022-09-21)

### Features

- **evaluations:** delete a non-published evaluation (teacher)

- **users:** edit a user (user)
- **users:** resend the confirmation email (user and admin)

### Improvements

- added assessment instances objects in the database model in order to keep track of the different instances of the same assessment
- added progress history objects in the database model in order to keep track of either the stars or the learning outcomes progress of students
- made the 'isClosed' field of assessments visible to students

## 1.1.2 (2022-09-18)

### Features

- **evaluations:** define acquired competencies with associated stars or LOs (teacher)

## 1.1.1 (2022-09-17)

### Features

- **assessments:** create an assessment instance (coordinator)
- **assessments:** define a provider and its config for an assessment (coordinator)
- **assessments:** get the details of an assessment instance (coordinator)

- **programs:** create a program with the 'unit' type (coordinator)

### Bug Fixes

- **courses:** made 'isArchived' and 'isPublished' fields available to students

## 1.1.0 (2022-09-15)

### Features

- **assessments:** associate an event to an assessment
- **assessments:** define an estimated grading load for a given assessment (coordinator)
- **assessments:** define an estimated workload for a given assessment (coordinator)
- **assessments:** define public and private checklist for competencies for a given assessment (coordinator)
- **assessments:** define the learning outcomes covered by a given assessment (coordinator)
- **assessments:** define the number of instances and of evaluations that can be taken for a given assessment (coordinator)
- **assessments:** define whether a given assessment is open or closed (coordinator)
- **assessments:** define whether a given assessment is visible or hidden (coordinator)
- **assessments:** delete an assessment (coordinator)
- **assessments:** edit an assessment (coordinator)
- **assessments:** limit the maximum number of stars that can be acquired with a given assessment (coordinator)

- **competencies:** define learning outcomes for a competency (teacher)
- **competencies:** define the number of times each LO of a competency must be proven (teacher)
- **competencies:** edit a competency (teacher)

- **courses:** accept an invitation received for a given course (user, student)
- **courses:** define advanced information for a given course (teacher)
- **courses:** edit a course (teacher)
- **courses:** get the list of my own students (teacher)
- **courses:** invite a user or student to a given course (coordinator)
- **courses:** select how a competency is used (stars or LO) when creating a course (teacher)

- **evaluations:** create a new evaluation for a given assessment of a given course (teacher)
- **evaluations:** get the details of a given evaluation (teacher)
- **evaluations:** get the list of all the evaluations associated to a given course (teacher)
- **evaluations:** publish an evaluation (teacher)

- **events:** create a new event corresponding to a course session (teacher)
- **events:** get the list of all events available to the connected teacher for a given course (teacher)

- **partners:** create a new partner (manager)
- **partners:** get the list of all partners (admin)
- **partners:** get the list of partners created by a manager (manager)

- **programs:** accept an invitation request from a user or student for a given program (coordinator)
- **programs:** edit a program (teacher)
- **programs:** get the details of a given program (user, coordinator)
- **programs:** get the list of students registered to my program (coordinator)
- **programs:** publish a program (teacher)
- **programs:** request an invitation for a program (user, student)

- **users:** sign out of the platform (user)
- **users:** validate a user account (user)

## 1.0.2 (2022-08-24)

### Bug Fixes

- **registrations:** add resolver to correctly retrieve the 'datetime' field of the registration

## 1.0.1 (2022-08-12)

### Bug Fixes

- **assessments:** add resolver to correctly retrieve the 'id' of the assessment

## 1.0.0 (2022-08-08)

### Features

- **assessments:** create a new assessment for a given course (coordinator)
- **assessments:** get the details of a given assessment from a given course (coordinator)
- **assessments:** get the list of assessments of a given course (coordinator)

- **competencies:** create a new competency (teacher)
- **competencies:** define tags for a competency (teacher)
- **competencies:** get the details of a given competency from a teacher (teacher)
- **competencies:** get the list of all competencies (admin)
- **competencies:** get the list of competencies available to the connected teacher (teacher)

- **courses:** accept an invitation request from a user or student for a given course (coordinator)
- **courses:** archive a course (teacher)
- **courses:** clone a course (teacher)
- **courses:** create a new course (teacher)
- **courses:** define teaching groups for a course (coordinator)
- **courses:** define the banner for a course (coordinator)
- **courses:** assign registered students to a teaching group for a given course (coordinator)
- **courses:** get the details of a given course (user, coordinator)
- **courses:** get the list of all courses (admin)
- **courses:** get the list of courses available to the connected student (student)
- **courses:** get the list of courses available to the connected teacher (teacher)
- **courses:** get the list of courses created by a teacher (coordinator)
- **courses:** get the list of registrations for a given (coordinator)
- **courses:** publish a course (teacher)
- **courses:** register to a course (student)
- **courses:** request an invitation for a course (user, student)

- **partners:** get the details of a given partner (user)

- **programs:** create a new program (teacher)
- **programs:** get the details of a given program from a teacher (teacher)
- **programs:** get the list of programs available to the connected teacher (teacher)

- **public:** get the list of all "public" courses, programs and partners (user)
- **public:** get the list of recent courses, programs and partners (user)

- **users:** connect to the platform (user)
- **users:** create an account (user)
- **users:** get the list of all users (admin)
