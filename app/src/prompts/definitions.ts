import { GetPromptResult, Prompt, PromptMessage } from "@modelcontextprotocol/sdk/types.js";

export function getAllPrompts(): Prompt[] {
  return [
    {
      name: "explore-instance",
      description: "Discover databases and summarize the CouchDB instance",
      arguments: [],
    },
    {
      name: "inspect-database",
      description: "Inspect one database: metadata, indexes, and sample documents",
      arguments: [
        {
          name: "databaseName",
          description: "Database to inspect",
          required: true,
        },
      ],
    },
    {
      name: "find-documents",
      description: "Search documents in a database using Mango query",
      arguments: [
        {
          name: "databaseName",
          description: "Target database",
          required: true,
        },
        {
          name: "criteria",
          description: "Natural-language description of what to find (e.g. 'users with status active')",
          required: true,
        },
      ],
    },
    {
      name: "setup-replication",
      description: "Set up replication between two databases",
      arguments: [
        {
          name: "source",
          description: "Source database name or URL",
          required: true,
        },
        {
          name: "target",
          description: "Target database name or URL",
          required: true,
        },
        {
          name: "continuous",
          description: "Set to 'true' for continuous replication, otherwise one-shot",
          required: false,
        },
      ],
    },
  ];
}

function userMessage(text: string): PromptMessage {
  return {
    role: "user",
    content: { type: "text", text },
  };
}

function requireArg(args: Record<string, string>, name: string): string {
  const value = args[name]?.trim();
  if (!value) {
    throw new Error(`Missing required prompt argument: ${name}`);
  }
  return value;
}

export function getPrompt(name: string, args: Record<string, string> = {}): GetPromptResult {
  switch (name) {
    case "explore-instance":
      return {
        description: "Explore the CouchDB instance and summarize database layout",
        messages: [
          userMessage(
            "Explore this CouchDB instance:\n" +
              "1. Call list-databases and report the total count.\n" +
              "2. Separate system databases (_users, _replicator, _global_changes) from user databases.\n" +
              "3. Call get-database-info on the 5 user databases with the highest doc_count.\n" +
              "4. Summarize findings in a short table: name, doc_count, disk_size."
          ),
        ],
      };

    case "inspect-database": {
      const databaseName = requireArg(args, "databaseName");
      return {
        description: `Inspect database ${databaseName}`,
        messages: [
          userMessage(
            `Inspect the CouchDB database "${databaseName}":\n` +
              "1. Call get-database-info and summarize doc count, update seq, and disk size.\n" +
              "2. Call list-database-indexes and list available Mango indexes.\n" +
              "3. Call list-documents with limit 5 (includeDocs: true) for sample documents.\n" +
              "4. Report any issues or notable patterns."
          ),
        ],
      };
    }

    case "find-documents": {
      const databaseName = requireArg(args, "databaseName");
      const criteria = requireArg(args, "criteria");
      return {
        description: `Find documents in ${databaseName} matching: ${criteria}`,
        messages: [
          userMessage(
            `Find documents in database "${databaseName}" matching: ${criteria}\n` +
              "1. If needed, call list-database-indexes to see existing indexes.\n" +
              "2. Build an appropriate Mango selector and call mango-query-database.\n" +
              "3. Use limit 20 unless I ask for more.\n" +
              "4. Summarize matches and show a few representative documents."
          ),
        ],
      };
    }

    case "setup-replication": {
      const source = requireArg(args, "source");
      const target = requireArg(args, "target");
      const continuous = args.continuous?.trim().toLowerCase() === "true";
      return {
        description: `Set up replication from ${source} to ${target}`,
        messages: [
          userMessage(
            `Set up CouchDB replication:\n` +
              `- Source: ${source}\n` +
              `- Target: ${target}\n` +
              `- Continuous: ${continuous}\n` +
              "1. Confirm source and target with me before creating replication.\n" +
              "2. Propose a replication _id and call create-replication with the replicationDoc.\n" +
              "3. Explain what was configured and how to verify sync status."
          ),
        ],
      };
    }

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}
