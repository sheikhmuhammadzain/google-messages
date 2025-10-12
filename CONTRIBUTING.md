# Contributing to Google Messages Clone

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the community

## How to Contribute

### Reporting Bugs

1. Check if the bug is already reported in Issues
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (OS, Node version, etc.)

### Suggesting Features

1. Check existing feature requests
2. Create an issue with:
   - Clear use case
   - Expected behavior
   - Why it would be useful
   - Possible implementation approach

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit with clear messages: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/google-messages.git

# Install dependencies
cd google-messages
cd backend && npm install
cd ../web && npm install
cd ../mobile && npm install

# Create feature branch
git checkout -b feature/my-feature
```

## Code Style

### TypeScript/JavaScript

- Use TypeScript for type safety
- Follow ESLint rules
- Use meaningful variable names
- Add comments for complex logic
- Write self-documenting code

### React

- Use functional components
- Use hooks appropriately
- Keep components small and focused
- Extract reusable logic to custom hooks
- Proper prop types with TypeScript

### File Structure

- One component per file
- Group related files in folders
- Use index.ts for exports
- Keep folder structure flat when possible

## Testing

- Write tests for new features
- Ensure existing tests pass
- Test on multiple devices/browsers
- Manual testing before PR

## Commit Messages

Follow conventional commits:

```
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting, no code change
refactor: code refactoring
test: add or update tests
chore: maintenance tasks
```

Examples:
```
feat: add message search functionality
fix: resolve WebSocket reconnection issue
docs: update setup instructions
```

## Pull Request Process

1. Update README.md if needed
2. Update documentation
3. Ensure all tests pass
4. Request review from maintainers
5. Address review comments
6. Squash commits if requested

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to ask questions in:
- GitHub Issues
- Pull Request comments
- Discussions

Thank you for contributing! 🎉
