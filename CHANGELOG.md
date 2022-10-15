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

- **evaluations:** delete an non-published evaluation (teacher)

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
