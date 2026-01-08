# TypeScript Style Guide

## General Principles

- Use TypeScript strict mode
- Prefer explicit types over inference for public APIs
- Use `const` by default, `let` when reassignment needed
- Never use `var`
- Avoid `any`; use `unknown` when type is truly unknown

## Naming Conventions

```typescript
// Variables and functions: camelCase
const userName = 'john';
function getUserById(id: string): User {}

// Classes and interfaces: PascalCase
class UserService {}
interface UserProfile {}

// Type aliases: PascalCase
type UserId = string;

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;

// Enums: PascalCase with PascalCase members
enum UserRole {
  Admin = 'ADMIN',
  Member = 'MEMBER',
}

// Private members: prefix with underscore
class Service {
  private _cache: Map<string, unknown>;
}
```

## Type Definitions

```typescript
// Prefer interfaces for object shapes
interface User {
  id: string;
  name: string;
  email: string;
}

// Use type for unions, intersections, and utilities
type Status = 'pending' | 'active' | 'inactive';
type WithTimestamps<T> = T & { createdAt: Date; updatedAt: Date };

// Use readonly for immutable properties
interface Config {
  readonly apiUrl: string;
  readonly timeout: number;
}
```

## Functions

```typescript
// Use arrow functions for callbacks
users.map((user) => user.name);

// Use function declarations for top-level functions
function processUser(user: User): ProcessedUser {
  // ...
}

// Always type return values for public functions
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Use optional parameters or defaults
function greet(name: string, greeting = 'Hello'): string {
  return `${greeting}, ${name}!`;
}
```

## Async/Await

```typescript
// Prefer async/await over .then()
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`);
  }
  return response.json();
}

// Handle errors with try/catch
async function safeGetUser(id: string): Promise<User | null> {
  try {
    return await fetchUser(id);
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
}
```

## Imports

```typescript
// Order: external, internal, relative
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { formatDate } from '../utils';
import type { User } from './types';

// Use type imports when importing only types
import type { Config } from './config';
```

## Error Handling

```typescript
// Use custom error classes
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Use Result type for expected failures
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
```

## File Organization

```
src/
├── components/     # React components
├── hooks/          # Custom hooks
├── services/       # API and business logic
├── types/          # Shared type definitions
├── utils/          # Utility functions
└── index.ts        # Public exports
```
