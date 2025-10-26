# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for significant technical decisions in the Casual Chic 3.0 project.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences.

## Format

Each ADR follows this structure:
- **Title**: Short descriptive title
- **Status**: Proposed | Accepted | Deprecated | Superseded
- **Context**: What is the issue we're addressing?
- **Decision**: What decision did we make?
- **Consequences**: What are the results of this decision?

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](001-pages-collection-architecture.md) | Pages Collection Architecture | Accepted | 2024-10-25 |

## Creating New ADRs

When making a significant architectural decision:

1. Copy `template.md` to `NNN-title.md` (increment number)
2. Fill in the template
3. Discuss with team
4. Mark as Accepted when implemented
5. Update this index

## Resources

- [ADR GitHub](https://adr.github.io/)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
