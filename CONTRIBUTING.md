# Contributing

- [Contributing](#contributing)
  - [Development Workflow](#development-workflow)
    - [Local Setup](#local-setup)
    - [Setup Git Hooks](#setup-git-hooks)
  - [Commit Message Guidelines](#commit-message-guidelines)
    - [Valid Types](#valid-types)
  - [Coding Standards](#coding-standards)
    - [React](#react)
    - [Styling](#styling)
    - [Code Quality](#code-quality)
  - [Project Confidentiality](#project-confidentiality)

## Development Workflow

### Local Setup

1. Clone the repository.

2. Install dependencies:

   ```sh
   pnpm install
   ```

3. Configure environment variables:

   ```sh
   cp .env.example .env
   ```

4. Start the development server:

   ```sh
   pnpm dev
   ```

### Setup Git Hooks

This project uses Git hooks for commit message validation and quality checks.

```sh
git config core.hooksPath .githooks
```

## Commit Message Guidelines

This project follows **Conventional Commits**.

Format:

```text
<type>(<optional scope>): <description>
```

### Valid Types

* `feat`: A new feature.
* `fix`: A bug fix.
* `docs`: Documentation changes.
* `style`: Formatting or styling changes.
* `refactor`: Code restructuring without feature or bug changes.
* `test`: Adding or updating tests.
* `chore`: Maintenance tasks.
* `build`: Build system changes.
* `ci`: CI/CD configuration changes.
* `perf`: Performance improvements.
* `revert`: Reverting a previous commit.

Example:

```text
feat(contact): add inquiry form
fix(hero): resolve mobile overflow issue
```

## Coding Standards

### React

* Use TypeScript for all new code.
* Prefer functional components and hooks.
* Keep components focused and reusable.
* Avoid unnecessary prop drilling.
* Maintain strict typing whenever possible.

### Styling

* Tailwind CSS is the primary styling solution.
* Use custom CSS only when Tailwind is not a suitable option.
* Keep styling consistent with the established design system.

### Code Quality

* Ensure there are no ESLint errors.
* Format code using Prettier.
* Remove unused imports, variables, and code before submitting changes.

## Project Confidentiality

This repository contains proprietary client code, assets, and project information.

* Do not share source code outside authorized contributors.
* Do not distribute project assets without approval.
* Respect any client confidentiality requirements and agreements.
