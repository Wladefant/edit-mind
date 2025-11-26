# Contributing to Edit Mind

We welcome contributions to Edit Mind! Whether you're fixing bugs, adding new features, improving documentation, or suggesting enhancements, your help is valuable. Please take a moment to review this document to understand how to contribute effectively.

## Code of Conduct

We are committed to fostering an open and welcoming environment. Please review our [Code of Conduct](CODE_OF_CONDUCT.md) (placeholder for now) to understand the expectations for all contributors.

## How to Contribute

### 1. Reporting Bugs

If you find a bug, please open an issue using our [Bug Report Form](https://github.com/Wladefant/edit-mind/issues/new?template=bug-report.yml). This form will guide you through providing all the necessary information, such as:

-   A clear description of the bug.
-   Steps to reproduce.
-   Expected behavior.
-   Logs and screenshots.
-   Platform details (Desktop vs Web).

### 2. Suggesting Enhancements

We'd love to hear your ideas for improving Edit Mind! You can suggest enhancements using our [Feature Request Form](https://github.com/Wladefant/edit-mind/issues/new?template=feature-request.yml). Please include:

-   The problem you're trying to solve.
-   Your proposed solution.
-   The target platform (Desktop, Web, or All).
-   The impact on your workflow.

### 3. Setting up Your Development Environment

To get started with development, please follow the instructions in the [README.md](README.md) file under the "Getting Started" section.

### 4. Making Changes

1.  **Fork the repository** and clone it to your local machine.
2.  **Create a new branch** for your feature or bug fix:
    ```bash
    git checkout -b feature/your-feature-name
    # or
    git checkout -b bugfix/issue-description
    ```
3.  **Make your changes.** Ensure your code adheres to the project's coding style and conventions.
4.  **Test your changes.** Run existing tests and add new ones if necessary to cover your changes.
5.  **Commit your changes** with a clear and descriptive commit message. Follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification if possible (e.g., `feat: add new plugin system`, `fix: resolve indexing error`).
6.  **Push your branch** to your forked repository.
7.  **Open a Pull Request** to the `main` branch of the original repository. Provide a detailed description of your changes and reference any related issues.

### 5. Coding Style

-   We use **ESLint** for JavaScript/TypeScript linting and **Prettier** for code formatting. Please ensure your code passes linting and is formatted correctly before submitting a pull request.
-   For Python code, adhere to **PEP 8** guidelines.

### 6. Testing

-   Before submitting a pull request, please ensure all existing tests pass.
-   If you're adding new features, please include appropriate unit and/or integration tests.

## Plugin Development

Edit Mind features a powerful plugin system for extending its video analysis capabilities. If you're interested in creating new analyzer plugins:

1.  Refer to the "Plugin System" section in the [README.md](README.md) for an overview.
2.  Explore the existing plugins in the `python/plugins` directory for examples.
3.  Ensure your plugin adheres to the `AnalyzerPlugin` interface defined in `python/plugins/base.py`.

Thank you for contributing to Edit Mind!
