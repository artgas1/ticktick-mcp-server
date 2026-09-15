#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  type CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

import * as tasks from './operations/tasks.js';
import * as projects from './operations/projects.js';

import { formatTickTickError, isTickTickError } from './common/errors.js';
import { VERSION } from './common/version.js';
import z from 'zod';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import console from 'console';
import { createServer as createHttpServer, type IncomingMessage } from 'node:http';
import { main } from './cli.js';

// If fetch doesn't exist in global scope, add it
if (!globalThis.fetch) {
  globalThis.fetch = fetch as unknown as typeof global.fetch;
}

const listTools = async () => {
  return {
    tools: [
      {
        name: 'get_user_projects',
        description: 'Get all user projects',
        inputSchema: zodToJsonSchema(z.object({})),
      },
      {
        name: 'get_project_by_id',
        description: 'Get a project by ID',
        inputSchema: zodToJsonSchema(projects.ProjectIdOptionsSchema),
      },
      {
        name: 'get_project_with_data',
        description: 'Get a project with its tasks and columns',
        inputSchema: zodToJsonSchema(projects.ProjectIdOptionsSchema),
      },
      {
        name: 'create_project',
        description: 'Create a new project',
        inputSchema: zodToJsonSchema(projects.CreateProjectOptionsSchema),
      },
      {
        name: 'update_project',
        description: 'Update an existing project',
        inputSchema: zodToJsonSchema(projects.UpdateProjectOptionsSchema),
      },
      {
        name: 'delete_project',
        description: 'Delete a project',
        inputSchema: zodToJsonSchema(projects.ProjectIdOptionsSchema),
      },
      {
        name: 'get_task_by_ids',
        description: 'Get a task by ProjectId and TaskId',
        inputSchema: zodToJsonSchema(tasks.GetTaskByIdsOptionsSchema),
      },
      {
        name: 'create_task',
        description: 'Create a new task',
        inputSchema: zodToJsonSchema(tasks.CreateTaskOptionsSchema),
      },
      {
        name: 'update_task',
        description: 'Update an existing task',
        inputSchema: zodToJsonSchema(tasks.UpdateTaskOptionsSchema),
      },
      {
        name: 'complete_task',
        description: 'Complete a task',
        inputSchema: zodToJsonSchema(tasks.TasksIdsOptionsSchema),
      },
      {
        name: 'delete_task',
        description: 'Delete a task',
        inputSchema: zodToJsonSchema(tasks.TasksIdsOptionsSchema),
      },
      {
        name: 'get_completed_tasks',
        description:
          'Get completed tasks across all projects within a date range',
        inputSchema: zodToJsonSchema(tasks.GetCompletedTasksOptionsSchema),
      },
      {
        name: 'batch_update_tasks',
        description:
          'Batch create, update, and/or delete multiple tasks in a single request',
        inputSchema: zodToJsonSchema(
          tasks.BatchUpdateTasksOptionsSchema.innerType()
        ),
      },
      {
        name: 'get_subtasks',
        description:
          'Get all subtasks of a parent task by fetching project data and filtering by parentId',
        inputSchema: zodToJsonSchema(tasks.GetSubtasksOptionsSchema),
      },
      {
        name: 'get_current_user',
        description: 'Get the current authenticated user profile',
        inputSchema: zodToJsonSchema(z.object({})),
      },
      {
        name: 'get_inbox_tasks',
        description:
          'Get tasks from the inbox (resolves inbox project ID automatically from user profile)',
        inputSchema: zodToJsonSchema(tasks.GetInboxTasksOptionsSchema),
      },
    ],
  };
};

const callTool = async (request: CallToolRequest) => {
  try {
    const toolsWithoutArguments = ['get_user_projects', 'get_current_user'];

    if (
      !request.params.arguments &&
      !toolsWithoutArguments.includes(request.params.name)
    ) {
      throw new Error('Arguments are required');
    }

    switch (request.params.name) {
      case 'get_user_projects': {
        const result = await projects.getUserProjects();

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_project_by_id': {
        const args = projects.ProjectIdOptionsSchema.parse(
          request.params.arguments
        );

        const result = await projects.getProjectById(args.projectId);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_project_with_data': {
        const args = projects.ProjectIdOptionsSchema.parse(
          request.params.arguments
        );

        const result = await projects.getProjectWithData(args.projectId);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'create_project': {
        const args = projects.CreateProjectOptionsSchema.parse(
          request.params.arguments
        );

        const result = await projects.createProject(args);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'update_project': {
        const args = projects.UpdateProjectOptionsSchema.parse(
          request.params.arguments
        );

        const result = await projects.updateProject(args);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'delete_project': {
        const args = projects.ProjectIdOptionsSchema.parse(
          request.params.arguments
        );

        await projects.deleteProject(args.projectId);

        return {
          content: [{ type: 'text', text: 'Project deleted successfully' }],
        };
      }

      case 'get_task_by_ids': {
        const args = tasks.GetTaskByIdsOptionsSchema.parse(
          request.params.arguments
        );

        const result = await tasks.getTaskByIds(args);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'create_task': {
        const args = tasks.CreateTaskOptionsSchema.parse(
          request.params.arguments
        );

        const result = await tasks.createTask(args);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'update_task': {
        const args = tasks.UpdateTaskOptionsSchema.parse(
          request.params.arguments
        );

        const result = await tasks.updateTask(args);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'complete_task': {
        const args = tasks.TasksIdsOptionsSchema.parse(
          request.params.arguments
        );

        await tasks.completeTask(args);

        return {
          content: [{ type: 'text', text: 'Task completed successfully' }],
        };
      }

      case 'delete_task': {
        const args = tasks.TasksIdsOptionsSchema.parse(
          request.params.arguments
        );

        await tasks.deleteTask(args);

        return {
          content: [{ type: 'text', text: 'Task deleted successfully' }],
        };
      }

      case 'get_completed_tasks': {
        const args = tasks.GetCompletedTasksOptionsSchema.parse(
          request.params.arguments
        );

        const result = await tasks.getCompletedTasks(args);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'batch_update_tasks': {
        const args = tasks.BatchUpdateTasksOptionsSchema.parse(
          request.params.arguments
        );

        const result = await tasks.batchUpdateTasks(args);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_subtasks': {
        const args = tasks.GetSubtasksOptionsSchema.parse(
          request.params.arguments
        );

        const result = await tasks.getSubtasks(args);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_current_user': {
        const result = await tasks.getCurrentUser();

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_inbox_tasks': {
        const args = tasks.GetInboxTasksOptionsSchema.parse(
          request.params.arguments ?? {}
        );

        const result = await tasks.getInboxTasks(args);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool name: ${request.params.name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
    }
    if (isTickTickError(error)) {
      throw new Error(formatTickTickError(error));
    }
    throw error;
  }
};

function createTickTickServer() {
  const server = new Server(
    {
      name: 'ticktick-mcp-server',
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );
  server.setRequestHandler(ListToolsRequestSchema, listTools);
  server.setRequestHandler(CallToolRequestSchema, callTool);
  return server;
}

function requestHost(request: IncomingMessage): string | undefined {
  const value = request.headers.host;
  if (!value) return undefined;
  if (value.startsWith('[')) return value.slice(0, value.indexOf(']') + 1);
  return value.split(':', 1)[0];
}

function isLoopbackHost(host: string): boolean {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1' || host === '[::1]';
}

async function runHttpServer(host: string, port: number) {
  if (!isLoopbackHost(host)) {
    throw new Error(`HTTP transport must bind to a loopback host, got ${host}`);
  }

  const app = createHttpServer(async (request, response) => {
    const hostHeader = requestHost(request);
    if (!hostHeader || !isLoopbackHost(hostHeader)) {
      response.writeHead(421).end('Misdirected Request');
      return;
    }

    const pathname = new URL(request.url ?? '/', `http://${hostHeader}`).pathname;
    if (pathname !== '/mcp') {
      response.writeHead(404).end('Not Found');
      return;
    }
    if (request.method !== 'POST') {
      response.writeHead(405, { Allow: 'POST' }).end('Method Not Allowed');
      return;
    }

    const server = createTickTickServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    response.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(request, response);
    } catch (error) {
      console.error('HTTP request failed:', error);
      if (!response.headersSent) {
        response.writeHead(500, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        }));
      }
    }
  });

  await new Promise<void>((resolve, reject) => {
    app.once('error', reject);
    app.listen(port, host, () => resolve());
  });
  console.error(`TickTick MCP Server running on http://${host}:${port}/mcp`);
}

async function runServer() {
  const initialized = await main();

  if (!initialized.ok) {
    console.error(initialized.message);
  }

  dotenv.config();

  const transportName = process.env.MCP_TRANSPORT ?? 'stdio';
  if (transportName === 'stdio') {
    const server = createTickTickServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('TickTick MCP Server running on stdio');
    return;
  }
  if (transportName === 'http') {
    const host = process.env.MCP_HOST ?? '127.0.0.1';
    const port = Number.parseInt(process.env.MCP_PORT ?? '8001', 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid MCP_PORT: ${process.env.MCP_PORT ?? ''}`);
    }
    await runHttpServer(host, port);
    return;
  }
  throw new Error(`Invalid MCP_TRANSPORT: ${transportName}. Expected stdio or http.`);
}

runServer().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
