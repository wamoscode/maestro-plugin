# Go Style Guide

## General Principles

- Follow Effective Go and Go Code Review Comments
- Keep it simple and readable
- Use `gofmt` for formatting
- Write idiomatic Go
- Handle errors explicitly

## Naming Conventions

```go
// Variables: camelCase (unexported), PascalCase (exported)
var userName string      // unexported
var UserName string      // exported

// Functions: same as variables
func getUserByID(id string) *User {}  // unexported
func GetUserByID(id string) *User {}  // exported

// Interfaces: usually end with -er
type Reader interface {
    Read(p []byte) (n int, err error)
}

type UserRepository interface {
    Get(id string) (*User, error)
    Save(user *User) error
}

// Constants
const MaxRetryCount = 3
const defaultTimeout = 30 * time.Second

// Acronyms: keep consistent case
var userID string    // not userId
var httpClient *http.Client
type HTTPServer struct{}
```

## Structs

```go
// Group related fields
type User struct {
    ID        string
    Name      string
    Email     string
    CreatedAt time.Time
    UpdatedAt time.Time
}

// Use constructor functions
func NewUser(name, email string) *User {
    now := time.Now()
    return &User{
        ID:        uuid.New().String(),
        Name:      name,
        Email:     email,
        CreatedAt: now,
        UpdatedAt: now,
    }
}

// Methods: use pointer receivers for mutation
func (u *User) UpdateEmail(email string) {
    u.Email = email
    u.UpdatedAt = time.Now()
}

// Methods: use value receivers for read-only
func (u User) FullName() string {
    return u.Name
}
```

## Error Handling

```go
// Always check errors
result, err := doSomething()
if err != nil {
    return fmt.Errorf("failed to do something: %w", err)
}

// Custom errors
var ErrNotFound = errors.New("not found")

type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

// Wrap errors with context
if err != nil {
    return fmt.Errorf("processing user %s: %w", userID, err)
}
```

## Interfaces

```go
// Define interfaces where they're used
type UserStore interface {
    Get(ctx context.Context, id string) (*User, error)
    Save(ctx context.Context, user *User) error
}

// Accept interfaces, return structs
func NewUserService(store UserStore) *UserService {
    return &UserService{store: store}
}

// Keep interfaces small
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type ReadWriter interface {
    Reader
    Writer
}
```

## Context

```go
// Pass context as first parameter
func (s *Service) GetUser(ctx context.Context, id string) (*User, error) {
    // Use context for cancellation and timeouts
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    return s.store.Get(ctx, id)
}
```

## Concurrency

```go
// Use channels for communication
func processItems(items []Item) <-chan Result {
    results := make(chan Result)
    go func() {
        defer close(results)
        for _, item := range items {
            results <- process(item)
        }
    }()
    return results
}

// Use sync.WaitGroup for coordination
func processAll(items []Item) []Result {
    var wg sync.WaitGroup
    results := make([]Result, len(items))

    for i, item := range items {
        wg.Add(1)
        go func(i int, item Item) {
            defer wg.Done()
            results[i] = process(item)
        }(i, item)
    }

    wg.Wait()
    return results
}
```

## Project Structure

```
project/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── domain/
│   ├── service/
│   └── repository/
├── pkg/
│   └── utils/
├── go.mod
└── go.sum
```

## Testing

```go
func TestUserService_GetUser(t *testing.T) {
    // Arrange
    store := &mockUserStore{}
    service := NewUserService(store)

    // Act
    user, err := service.GetUser(context.Background(), "123")

    // Assert
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if user.ID != "123" {
        t.Errorf("expected ID 123, got %s", user.ID)
    }
}

// Table-driven tests
func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name    string
        email   string
        wantErr bool
    }{
        {"valid", "user@example.com", false},
        {"missing @", "userexample.com", true},
        {"empty", "", true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := ValidateEmail(tt.email)
            if (err != nil) != tt.wantErr {
                t.Errorf("ValidateEmail(%q) error = %v, wantErr %v", tt.email, err, tt.wantErr)
            }
        })
    }
}
```
