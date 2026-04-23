type BashProviderState =
  | "tool:read"
  | "tool:search"
  | "tool:explore"
  | "tool:web"
  | "tool:vcs_read"
  | "tool:vcs_write"
  | "tool:test"
  | "tool:build";

export type ProviderToolState = BashProviderState;

const BASH_CLASSIFIERS: Array<{
  state: BashProviderState;
  patterns: RegExp[];
}> = [
  {
    state: "tool:build",
    patterns: [
      /^(?:npm|pnpm)\s+build(?:\s|$)/,
      /^cargo\s+build(?:\s|$)/,
      /^tsc(?:\s|$)/,
    ],
  },
  {
    state: "tool:test",
    patterns: [
      /^(?:npm|pnpm)\s+test(?:\s|$)/,
      /^pytest(?:\s|$)/,
      /^jest(?:\s|$)/,
      /^vitest(?:\s|$)/,
      /^cargo\s+test(?:\s|$)/,
    ],
  },
  {
    state: "tool:vcs_write",
    patterns: [/^git\s+(?:add|commit|push)(?:\s|$)/],
  },
  {
    state: "tool:vcs_read",
    patterns: [/^git\s+(?:diff|log|show)(?:\s|$)/],
  },
  {
    state: "tool:web",
    patterns: [/^(?:curl|wget)(?:\s|$)/],
  },
  {
    state: "tool:search",
    patterns: [/^(?:rg|grep|ag|find)(?:\s|$)/],
  },
  {
    state: "tool:read",
    patterns: [/^(?:cat|less|head|tail)(?:\s|$)/, /^sed\s+-n(?:\s|$)/],
  },
  {
    state: "tool:explore",
    patterns: [/^(?:ls|fd|tree)(?:\s|$)/],
  },
];

const NON_BASH_TOOL_NAME_TO_PROVIDER_STATE: Record<string, ProviderToolState> =
  {
    Read: "tool:read",
    Glob: "tool:explore",
    Grep: "tool:search",
    Write: "tool:vcs_write",
    Edit: "tool:vcs_write",
    MultiEdit: "tool:vcs_write",
    WebFetch: "tool:web",
    WebSearch: "tool:web",
  };

export function resolveNonBashProviderState(
  toolName: string,
): ProviderToolState | null {
  return NON_BASH_TOOL_NAME_TO_PROVIDER_STATE[toolName] ?? null;
}

export function resolveClaudeProviderState(
  toolName: string,
  toolInput: unknown,
): ProviderToolState | null {
  if (toolName === "Bash") {
    void toolInput;
    return null;
  }

  return resolveNonBashProviderState(toolName);
}

export function classifyBashProviderState(
  toolInput: unknown,
): BashProviderState | null {
  const command = readCommand(toolInput);

  if (command === null) {
    return null;
  }

  if (hasCompoundShellSyntax(command)) {
    return null;
  }

  return classifyCommandSegment(stripCommandWrappers(command));
}

function classifyCommandSegment(segment: string): BashProviderState | null {
  for (const classifier of BASH_CLASSIFIERS) {
    if (classifier.patterns.some((pattern) => pattern.test(segment))) {
      return classifier.state;
    }
  }

  return null;
}

function hasCompoundShellSyntax(command: string): boolean {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    const nextCharacter = command[index + 1];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === "\\" && !inSingleQuote) {
      escaped = true;
      continue;
    }

    if (!inDoubleQuote && character === "'") {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (!inSingleQuote && character === '"') {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (inSingleQuote) {
      continue;
    }

    if (
      character === "`" ||
      (character === "$" && nextCharacter === "(") ||
      (character === "<" && nextCharacter === "(") ||
      (character === ">" && nextCharacter === "(")
    ) {
      return true;
    }

    if (inDoubleQuote) {
      continue;
    }

    if (
      character === "\n" ||
      character === "\r" ||
      character === "|" ||
      character === "&" ||
      character === ";" ||
      character === "<" ||
      character === ">"
    ) {
      return true;
    }
  }

  return false;
}

function readCommand(toolInput: unknown): string | null {
  if (!isRecord(toolInput)) {
    return null;
  }

  return readString(toolInput.command);
}

function stripCommandWrappers(segment: string): string {
  let current = segment.trimStart();

  while (true) {
    const before = current;

    current = current.replace(/^(?:(?:sudo|time|command)\s+)+/, "");
    current = current.replace(/^env\s+/, "");
    current = current.replace(/^(?:-i\s+|-u\s+[A-Za-z_][A-Za-z0-9_]*\s+)+/, "");
    current = current.replace(
      /^(?:[A-Za-z_][A-Za-z0-9_]*=(?:'[^']*'|"[^"]*"|[^\s]+)\s+)+/,
      "",
    );
    current = current.trimStart();

    if (current === before) {
      return current;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
