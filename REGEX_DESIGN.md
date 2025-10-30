# Regex Literal Design for MPP Parser

## Overview
The MPP parser will support regex literals with a **pluggable design** - the parser captures regex literals as strings without parsing the regex pattern itself. This allows different regex engines (PCRE, RE2, etc.) to be used upstream.

## Design Principles

1. **Parser is regex-agnostic** - Just captures the pattern string and flags
2. **PCRE subset support** - Not full Perl regex syntax
3. **Simple delimiter handling** - Start with `/pattern/flags` format
4. **Pluggable architecture** - Regex evaluation happens upstream

## Implementation Approach

### Phase 1: Basic Regex Literals

#### Tokenizer Changes
```typescript
// Recognize regex literals: /pattern/flags
if (char === '/' && !inDivisionContext()) {
    // Scan until closing / (handling \/ escapes)
    const pattern = scanUntilDelimiter('/');
    const flags = scanRegexFlags(); // [gimsx]*

    return {
        type: 'REGEX',
        value: pattern,
        flags: flags,
        raw: `/${pattern}/${flags}`
    };
}
```

#### AST Structure
```typescript
interface RegexLiteralNode extends ASTNode {
    type: 'RegexLiteral';
    pattern: string;      // The pattern as a string
    flags: string;        // Modifier flags (gimsx)
    raw: string;          // Original literal for reconstruction
}
```

### Phase 2: Pattern Matching Operators

#### Binary Operators: `=~` and `!~`
```typescript
// Pattern match
$string =~ /pattern/i;        // Returns true/false
$string !~ /pattern/;          // Negated match

// With captures (upstream handles this)
if ($text =~ /(\d+)/) {
    # $1 contains the capture
}
```

#### AST Structure
```typescript
interface PatternMatchNode extends ASTNode {
    type: 'PatternMatch';
    operator: '=~' | '!~';
    left: ASTNode;        // Usually a variable
    right: ASTNode;       // RegexLiteral or variable containing regex
}
```

## Context Disambiguation

The main challenge is distinguishing `/` as division vs regex delimiter:

### Division Context (/)
```perl
$x / $y;              # Division
10 / 2;               # Division
$result = $a / $b;    # Division
```

### Regex Context (/)
```perl
/pattern/;            # Regex literal
if (/test/) { }       # Regex in boolean context
$x =~ /foo/;          # After =~ operator
$x !~ /bar/;          # After !~ operator
```

### Disambiguation Rules

1. **After `=~` or `!~`**: Always regex
2. **After control keywords** (`if`, `unless`, `while`, etc.): Likely regex
3. **After operators expecting values**: Likely regex
4. **After complete expressions**: Likely division
5. **Start of statement**: Likely regex

## Escape Handling

The tokenizer needs minimal escape handling:

```perl
/\/path\/to\/file/    # Escaped forward slashes
/\\/                  # Escaped backslash
/\n\t\r/             # These remain as-is (upstream handles)
```

Only handle:
- `\/` → Keep as `\/` in the pattern string
- `\\` → Keep as `\\` in the pattern string
- Everything else → Pass through unchanged

## Regex Flags

Support common PCRE flags:
- `g` - Global matching
- `i` - Case insensitive
- `m` - Multi-line mode
- `s` - Single-line mode (. matches newline)
- `x` - Extended (ignore whitespace, allow comments)

## Alternative Delimiters (Future)

Perl supports alternative delimiters, but initially we'll only support `/`:

```perl
# Future support (not in initial implementation):
m{pattern}flags       # Curly braces
m[pattern]flags       # Square brackets
m(pattern)flags       # Parentheses
m!pattern!flags       # Exclamation marks
```

## Substitution (Future)

```perl
# Future support:
s/search/replace/g;   # Substitution
tr/abc/xyz/;          # Transliteration
```

## Integration Points

### Parser Output
```typescript
// For: if ($name =~ /^[A-Z]/) { ... }
{
    type: 'If',
    condition: {
        type: 'PatternMatch',
        operator: '=~',
        left: { type: 'Variable', name: '$name' },
        right: {
            type: 'RegexLiteral',
            pattern: '^[A-Z]',
            flags: '',
            raw: '/^[A-Z]/'
        }
    },
    thenBlock: [...]
}
```

### Upstream Processing
The consumer of the AST can:
1. Pass the pattern string to their regex engine
2. Compile with appropriate flags
3. Handle captures, replacements, etc.
4. Return match results

## Benefits of This Approach

1. **Separation of Concerns**: Parser doesn't need regex engine
2. **Flexibility**: Can swap regex engines (PCRE, RE2, JavaScript RegExp)
3. **Simplicity**: Parser remains focused on syntax
4. **Testability**: Can test parsing without regex evaluation
5. **Performance**: No regex compilation during parsing

## Implementation Steps

1. **Tokenizer**: Add regex literal recognition with context disambiguation
2. **Lexer**: Classify REGEX tokens appropriately
3. **Parser**:
   - Add RegexLiteralNode to AST types
   - Handle regex literals in primary expressions
   - Add `=~` and `!~` to binary operators
4. **Tests**: Focus on literal capture, not regex functionality

## Example Test Cases

```perl
# Basic regex literals
/hello/;
/world/i;
/^\d+$/gm;

# Pattern matching
$text =~ /pattern/;
$text !~ /pattern/i;

# In conditionals
if ($email =~ /@/) { }
unless ($name =~ /^[a-z]/) { }

# Complex patterns (just captured as strings)
/(?:foo|bar)/;
/\d{2,4}/;
/[a-zA-Z]+/;

# Division disambiguation
$x = 10 / 2;          # Division
if (/test/) { }       # Regex
$y = $a / $b / $c;    # Two divisions
```

## Summary

This pluggable approach keeps the parser simple while providing full regex support. The parser's job is just to:
1. Recognize regex literal syntax
2. Capture the pattern and flags as strings
3. Create appropriate AST nodes
4. Let upstream handle the actual regex processing

This design aligns perfectly with the MPP philosophy of keeping the parser focused on syntax while allowing flexibility in semantic interpretation.