# Python Style Guide

## General Principles

- Follow PEP 8
- Use type hints for all public functions
- Prefer explicit over implicit
- Write docstrings for public APIs
- Use f-strings for string formatting

## Naming Conventions

```python
# Variables and functions: snake_case
user_name = "john"
def get_user_by_id(user_id: str) -> User:
    pass

# Classes: PascalCase
class UserService:
    pass

# Constants: UPPER_SNAKE_CASE
MAX_RETRY_COUNT = 3
DEFAULT_TIMEOUT = 30

# Private members: prefix with underscore
class Service:
    def __init__(self):
        self._cache = {}

    def _internal_method(self):
        pass

# Module-level private: prefix with underscore
_module_config = {}
```

## Type Hints

```python
from typing import Optional, List, Dict, Union, TypeVar, Generic

# Function signatures
def process_user(user: User, options: Optional[Dict[str, str]] = None) -> ProcessedUser:
    pass

# Generic types
T = TypeVar('T')

class Repository(Generic[T]):
    def get(self, id: str) -> Optional[T]:
        pass

# Union types (Python 3.10+)
def parse_value(value: str | int) -> float:
    pass

# Type aliases
UserId = str
UserList = List[User]
```

## Functions

```python
# Use keyword arguments for clarity
def create_user(
    name: str,
    email: str,
    *,
    role: str = "member",
    active: bool = True,
) -> User:
    pass

# Docstrings (Google style)
def calculate_total(items: List[Item]) -> float:
    """Calculate the total price of items.

    Args:
        items: List of items to sum.

    Returns:
        Total price as a float.

    Raises:
        ValueError: If items list is empty.
    """
    if not items:
        raise ValueError("Items list cannot be empty")
    return sum(item.price for item in items)
```

## Classes

```python
from dataclasses import dataclass
from abc import ABC, abstractmethod

# Use dataclasses for data containers
@dataclass
class User:
    id: str
    name: str
    email: str
    active: bool = True

# Use ABC for interfaces
class Repository(ABC):
    @abstractmethod
    def get(self, id: str) -> Optional[User]:
        pass

    @abstractmethod
    def save(self, entity: User) -> None:
        pass
```

## Error Handling

```python
# Custom exceptions
class ValidationError(Exception):
    def __init__(self, message: str, field: str):
        super().__init__(message)
        self.field = field

# Context managers for cleanup
from contextlib import contextmanager

@contextmanager
def database_transaction():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
```

## Async/Await

```python
import asyncio
from typing import List

async def fetch_user(user_id: str) -> User:
    async with aiohttp.ClientSession() as session:
        async with session.get(f"/api/users/{user_id}") as response:
            data = await response.json()
            return User(**data)

async def fetch_all_users(user_ids: List[str]) -> List[User]:
    tasks = [fetch_user(uid) for uid in user_ids]
    return await asyncio.gather(*tasks)
```

## Imports

```python
# Standard library
import os
import sys
from typing import Optional, List

# Third-party
import requests
from pydantic import BaseModel

# Local
from .models import User
from .services import UserService
```

## File Organization

```
src/
├── __init__.py
├── models/         # Data models
├── services/       # Business logic
├── repositories/   # Data access
├── api/            # API endpoints
├── utils/          # Utilities
└── config.py       # Configuration
```
