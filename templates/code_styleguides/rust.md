# Rust Style Guide

## General Principles

- Follow the Rust API Guidelines
- Use `rustfmt` for formatting
- Use `clippy` for linting
- Prefer safe code; use `unsafe` only when necessary
- Leverage the type system for correctness

## Naming Conventions

```rust
// Variables and functions: snake_case
let user_name = "john";
fn get_user_by_id(id: &str) -> Option<User> {}

// Types and traits: PascalCase
struct UserProfile {}
trait Repository {}
enum UserRole {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT: u32 = 3;
static DEFAULT_CONFIG: Config = Config::new();

// Lifetimes: short lowercase
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {}

// Type parameters: single uppercase or descriptive PascalCase
fn process<T>(item: T) {}
fn convert<Input, Output>(value: Input) -> Output {}
```

## Structs and Enums

```rust
// Structs with derive macros
#[derive(Debug, Clone, PartialEq)]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: String,
    created_at: DateTime<Utc>,
}

impl User {
    // Constructor
    pub fn new(name: String, email: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            email,
            created_at: Utc::now(),
        }
    }

    // Methods
    pub fn update_email(&mut self, email: String) {
        self.email = email;
    }
}

// Enums for state machines
#[derive(Debug, Clone)]
pub enum RequestState {
    Pending,
    Processing { started_at: DateTime<Utc> },
    Completed { result: String },
    Failed { error: String },
}
```

## Error Handling

```rust
use thiserror::Error;

// Custom error types
#[derive(Error, Debug)]
pub enum ServiceError {
    #[error("user not found: {0}")]
    NotFound(String),

    #[error("validation failed: {field} - {message}")]
    Validation { field: String, message: String },

    #[error("database error")]
    Database(#[from] sqlx::Error),
}

// Result type alias
pub type Result<T> = std::result::Result<T, ServiceError>;

// Error propagation with ?
pub fn get_user(id: &str) -> Result<User> {
    let user = repository.find(id)?;
    Ok(user)
}

// Match on errors when needed
match get_user(id) {
    Ok(user) => println!("Found: {}", user.name),
    Err(ServiceError::NotFound(_)) => println!("User not found"),
    Err(e) => return Err(e),
}
```

## Option Handling

```rust
// Use combinators
let name = user.map(|u| u.name).unwrap_or_default();

// Pattern matching
match user {
    Some(u) => process(u),
    None => handle_missing(),
}

// If let for single case
if let Some(user) = find_user(id) {
    process(user);
}

// ? operator with Option
fn get_user_email(id: &str) -> Option<String> {
    let user = find_user(id)?;
    Some(user.email)
}
```

## Traits

```rust
// Define traits for behavior
pub trait Repository<T> {
    fn get(&self, id: &str) -> Result<Option<T>>;
    fn save(&self, entity: &T) -> Result<()>;
    fn delete(&self, id: &str) -> Result<()>;
}

// Implement traits
impl Repository<User> for PostgresUserRepository {
    fn get(&self, id: &str) -> Result<Option<User>> {
        // implementation
    }

    fn save(&self, entity: &User) -> Result<()> {
        // implementation
    }

    fn delete(&self, id: &str) -> Result<()> {
        // implementation
    }
}

// Use trait bounds
fn process<T: Repository<User>>(repo: &T) -> Result<()> {
    let user = repo.get("123")?;
    Ok(())
}

// Where clauses for complex bounds
fn complex_function<T, U>(t: T, u: U) -> Result<()>
where
    T: Repository<User> + Send + Sync,
    U: Serialize + DeserializeOwned,
{
    // implementation
}
```

## Async/Await

```rust
use tokio;

// Async functions
async fn fetch_user(id: &str) -> Result<User> {
    let response = reqwest::get(format!("/api/users/{}", id))
        .await?
        .json::<User>()
        .await?;
    Ok(response)
}

// Concurrent execution
async fn fetch_all(ids: Vec<String>) -> Vec<Result<User>> {
    let futures: Vec<_> = ids.iter().map(|id| fetch_user(id)).collect();
    futures::future::join_all(futures).await
}
```

## Project Structure

```
project/
├── src/
│   ├── main.rs
│   ├── lib.rs
│   ├── domain/
│   │   ├── mod.rs
│   │   └── user.rs
│   ├── service/
│   │   ├── mod.rs
│   │   └── user_service.rs
│   └── repository/
│       ├── mod.rs
│       └── user_repository.rs
├── tests/
│   └── integration_tests.rs
├── Cargo.toml
└── Cargo.lock
```

## Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_creation() {
        let user = User::new("John".into(), "john@example.com".into());

        assert_eq!(user.name, "John");
        assert_eq!(user.email, "john@example.com");
        assert!(!user.id.is_empty());
    }

    #[test]
    fn test_validation_error() {
        let result = validate_email("");
        assert!(matches!(result, Err(ServiceError::Validation { .. })));
    }

    #[tokio::test]
    async fn test_async_fetch() {
        let user = fetch_user("123").await.unwrap();
        assert_eq!(user.id, "123");
    }
}
```
