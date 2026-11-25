import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findUserByEmail } from '../server/services/authService.js';
import { getUpcomingEvents, findEventByTitle, signUpForEvent } from '../server/services/eventService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// The lectures, read once when the server starts.
const lectures = JSON.parse(fs.readFileSync(path.join(__dirname, 'lectures.json'), 'utf8'));

// A tool result: one text part, and whether the tool failed.
function textResult(id, text, isError) {
  return { jsonrpc: '2.0', id: id, result: { content: [{ type: 'text', text: text }], isError: isError } };
}

// The tools this server offers. The description is what the model reads to choose.
const tools = [
  {
    name: 'find_lecture',
    description: 'Return the title and topics of one course lecture by its number, 1 to 12. Use it when asked what a lecture covers.',
    inputSchema: {
      type: 'object',
      properties: { number: { type: 'integer', description: 'Lecture number, 1 to 12' } },
      required: ['number'],
    },
  },
  {
    name: 'list_lectures',
    description: 'List the number and title of every course lecture. Use it when asked what the course covers.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_events',
    description: 'List the upcoming events with id, title, date and free places. Use it when asked what events are coming.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'find_event',
    description: 'Return one event by its title, with its id, date and free places. Use it when asked about a specific event by name.',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string', description: 'Event title' } },
      required: ['title'],
    },
  },
  {
    name: 'register_for_event',
    description: 'Sign the current member up for an event by its ID if it has free places. Use it when asked to register.',
    inputSchema: {
      type: 'object',
      properties: { eventId: { type: 'integer', description: 'Event ID' } },
      required: ['eventId'],
    },
  },
];

// Print one reply as one line of JSON on stdout.
function send(reply) {
  process.stdout.write(JSON.stringify(reply) + '\n');
}

// Decide what to answer. Return the reply, or null to answer nothing.
// Looks up the MCP user in the database. Only the tools that need a user call it.
async function getMcpUser() {
  return findUserByEmail(process.env.MCP_USER_EMAIL || 'student@club.com');
}

async function handle(msg) {
  if (msg.method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        protocolVersion: msg.params.protocolVersion,
        capabilities: { tools: {} },
        serverInfo: { name: 'club-events', version: '0.1.0' },
      },
    };
  }
  if (msg.method === 'notifications/initialized') {
    return null; // a notification: it has no id and gets no reply
  }
  if (msg.method === 'tools/list') {
    return { jsonrpc: '2.0', id: msg.id, result: { tools: tools } };
  }
  if (msg.method === 'tools/call') {

    const name = msg.params.name;
    const args = msg.params.arguments || {};
    if (name === 'find_lecture') {
      const lecture = lectures.find((l) => l.number === args.number);
      if (!lecture) {
        return textResult(msg.id, 'There is no lecture ' + args.number + '. The course has lectures 1 to 12.', true);
      }
      return textResult(msg.id, 'Lecture ' + lecture.number + ': ' + lecture.title + '. Topics: ' + lecture.topics, false);
    }
    if (name === 'list_lectures') {
      return textResult(msg.id, lectures.map((l) => l.number + '. ' + l.title).join('\n'), false);
    }
    if (name === 'list_events') {
      const user = await getMcpUser();
      if (!user) {
        return textResult(msg.id, 'MCP user not found', true);
      }
      const events = await getUpcomingEvents(user.id);
      const text = events.map(e => `ID: ${e.id}, Title: ${e.title}, Date: ${e.date}, Free Places: ${e.free_places}`).join('\n');
      return textResult(msg.id, text || 'No upcoming events', false);
    }
    if (name === 'find_event') {
      const user = await getMcpUser();
      if (!user) {
        return textResult(msg.id, 'MCP user not found', true);
      }
      const event = await findEventByTitle(args.title, user.id);
      if (!event) {
        return textResult(msg.id, 'Event not found: ' + args.title, true);
      }
      return textResult(msg.id, `ID: ${event.id}, Title: ${event.title}, Date: ${event.date}, Free Places: ${event.free_places}`, false);
    }
    if (name === 'register_for_event') {
      const user = await getMcpUser();
      if (!user) {
        return textResult(msg.id, 'MCP user not found', true);
      }
      try {
        await signUpForEvent(user.id, args.eventId);
        return textResult(msg.id, 'Successfully registered for event ' + args.eventId, false);
      } catch (err) {
        return textResult(msg.id, err.message, true);
      }
    }
    // A tool we never offered: the message itself is wrong, so it is a protocol error.
    return { jsonrpc: '2.0', id: msg.id, error: { code: -32602, message: 'Unknown tool: ' + name } };
  }
  if (msg.id !== undefined) {
    // Any other request we do not know.
    return { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Unknown method: ' + msg.method } };
  }
  return null;
}

const lines = readline.createInterface({ input: process.stdin });

lines.on('line', async (line) => {
  if (!line.trim()) return;
  const reply = await handle(JSON.parse(line));
  if (reply) send(reply);
});
