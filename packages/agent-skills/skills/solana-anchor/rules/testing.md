# Testing Rules for Anchor Programs

## Test Structure

1. **Unit Tests**: Test individual instructions in isolation
2. **Integration Tests**: Test complete workflows
3. **Security Tests**: Test access control and edge cases

## Setup Pattern

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

describe("program-name", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ProgramName as Program<ProgramName>;

  it("test case", async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## Best Practices

1. **Test Happy Path First**: Verify expected behavior works
2. **Test Error Cases**: Ensure proper error handling
3. **Test Access Control**: Verify only authorized users can act
4. **Clean State**: Use before/after hooks for state management

## Security Tests to Include

- Unauthorized signer attempts
- Invalid PDA seeds
- Account confusion attacks
- Reentrancy scenarios
- Integer overflow/underflow
