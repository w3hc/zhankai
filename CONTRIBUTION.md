# Contributing to Zhankai

First off, thank you for considering contributing to Zhankai! It's people like you that make Zhankai such a great tool.

## Code of Conduct

By participating in this project, you are expected to uphold our values of openness, respect, and inclusivity. Please treat everyone with respect.

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report for Zhankai. Following these guidelines helps maintainers understand your report, reproduce the issue, and find related reports.

- Use a clear and descriptive title for the issue
- Describe the exact steps which reproduce the problem
- Provide specific examples to demonstrate the steps
- Describe the behavior you observed after following the steps
- Explain which behavior you expected to see instead and why
- Include screenshots or terminal output if possible

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for Zhankai, including completely new features and minor improvements to existing functionality.

- Use a clear and descriptive title for the issue
- Provide a step-by-step description of the suggested enhancement
- Provide specific examples to demonstrate the steps
- Describe the current behavior and explain which behavior you expected to see instead
- Explain why this enhancement would be useful to most Zhankai users

### Contribution Workflow

We follow a standard GitHub workflow for contributions:

1. **Create an Issue** - Begin by creating an issue that describes the bug, enhancement, or feature you intend to address
2. **Fork and Branch** - Fork the repository and create a branch from `main` specifically for the issue
   ```bash
   git checkout -b issue-XXX-brief-description
   ```
3. **Implement Changes** - Make your changes following our code style guidelines
4. **Submit Pull Request** - Create a pull request against the `main` branch
   - Reference the issue number in the PR description (not the title)
   - Provide a clear description of the changes
   - Follow the TypeScript styleguide
   - Consider adding tests for new functionality (once testing is implemented)
   - End all files with a newline
   - Avoid platform-dependent code
5. **Request Review** - Explicitly request a review from a maintainer
6. **Address Feedback** - Make any requested changes from the code review
7. **Merge** - Once approved, a maintainer will merge your PR

PRs will not be merged without a linked issue and a code review.

## Development Process

### Setting Up the Development Environment

```bash
# Clone the repository
git clone https://github.com/w3hc/zhankai.git
cd zhankai

# Install dependencies
pnpm install

# Build the project
pnpm build
```

### Testing

Currently, Zhankai doesn't have a formal test suite. We plan to add tests in the future, and contributions to test coverage are welcome!

### Styleguides

#### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

#### TypeScript Styleguide

- Use 2 spaces for indentation
- Use camelCase for variable and function names
- Use PascalCase for class and interface names
- Add JSDoc comments for functions and classes
- Use `const` for variables that don't need to be reassigned
- Use `interface` over `type` when possible

## Join the Project Team

- Contribute regularly to the project
- Engage with the community
- Help review pull requests
- Participate in discussions in issues

## Attribution

This Contributing Guide is adapted from the [Atom Contributing Guide](https://github.com/atom/atom/blob/master/CONTRIBUTING.md).