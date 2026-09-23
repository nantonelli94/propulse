# Contributing to PROPULSE

Thank you for your interest in contributing to PROPULSE! This document provides guidelines for contributing to the project.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in the [Issues](https://github.com/nantonelli94/propulse/issues) section.
2. If not, create a new issue with:
   - A clear, descriptive title
   - Steps to reproduce the bug
   - Expected behavior vs actual behavior
   - Your environment (OS, Python version, etc.)

### Suggesting Features

1. Open a new issue with the label `enhancement`.
2. Describe the feature and its use case.
3. Explain why this feature would be valuable.

### Pull Requests

1. Fork the repository.
2. Create a new branch for your feature/fix: `git checkout -b feature/my-feature`
3. Make your changes.
4. Ensure tests pass: `pytest backend/tests/ -v`
5. Commit with a clear, descriptive message.
6. Push to your fork and create a pull request.

### Code Style

- Follow [PEP 8](https://peps.python.org/pep-0008/) for Python code.
- Use meaningful variable and function names.
- Add docstrings to all public functions.
- Keep functions small and focused.

### Testing

- Add tests for any new functionality.
- Ensure all existing tests pass before submitting a PR.

### Documentation

- Update documentation when adding new features.
- Keep the README.md current.

## Development Setup

```bash
git clone https://github.com/nantonelli94/propulse.git
cd propulse
pip install -r backend/requirements.txt
pytest backend/tests/ -v
```

## Code of Conduct

Be respectful and considerate in all interactions. We want to maintain a welcoming community for everyone.
