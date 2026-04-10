/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * AgentCommand: The LLM doesn't return markdown — it returns REFLOW commands.
 *
 * Flow:
 *   1. User types:  agent "show me overdue invoices and chart them by age"
 *   2. AgentCommand builds a system prompt containing:
 *      - Available commands (from commandDAO)
 *      - Available DAOs and their models (from context)
 *      - The user's prompt
 *   3. LLMService returns a string of REFLOW commands, e.g.:
 *        dao query invoiceDAO where status == 'OVERDUE'
 *        cells --from lastResult
 *        chart bar --x daysOverdue --y amount --title "Overdue by Age"
 *   4. PromptCommand parses each line and inserts them into the
 *      current flow document, where they execute in sequence.
 *
 * The LLM is just another user of the environment.
 * Permissions, validation, journaling — all inherited.
 */

foam.CLASS({
  package: 'foam.core.reflow.ai',
  name: 'AgentCommand',
  extends: 'foam.core.reflow.cmd.Command',

  documentation: `
    REFLOW command that delegates to an LLM, which responds with
    REFLOW commands rather than markdown. The commands are parsed
    and inserted into the current flow for execution.

    If the LLM wants to respond conversationally, it uses the
    markdown command — text is just one capability among many.

    Because 'agent' is itself a command, agents can delegate
    to other agents: router → specialist, cheap triage → expensive.
  `,

  imports: [
    'block',
    'commandDAO',
    'llmService',
    'subject'
  ],

  requires: [
    'foam.core.reflow.Markdown'
  ],

  properties: [
    /*
    {
      class: 'String',
      name: 'name',
      value: 'prompt'
      },
      */
    {
      class: 'String',
      name: 'description',
      value: 'Ask an LLM agent to generate REFLOW commands from a natural language instruction.'
    },
    {
      class: 'String',
      name: 'model',
      documentation: 'Optional model override.'
    },
    {
      class: 'Boolean',
      name: 'dryRun',
      documentation: 'If true, show generated commands without executing.',
      value: true
    }
  ],

  methods: [
    async function execute(q) {
      // ── 1. Build the system prompt with environment context ──
      var systemPrompt = await this.buildSystemPrompt_(x);

      // ── 2. Call LLMService ──
      var request = foam.core.ai.CompletionRequest.create({
        prompt: q,
        options: foam.core.ai.LLMOptions.create({
          systemPrompt: systemPrompt,
          model:        this.model,
          temperature:  0.2  // low temp for structured command output
        })
      });

      var result;
      try {
        result = await this.llmService.complete(x, request);
      } catch (e) {
        flow.insertError('LLM error: ' + e.message);
        return;
      }

      // ── 3. Parse response into command lines ──
      var lines = this.parseCommandLines_(result.content);

      if ( ! lines.length ) {
        // LLM returned nothing parseable — show raw as markdown fallback
        this.out.tag(this.Markdown, {markdown: result.content});
        return;
      }

      // ── 4. Insert commands into the flow ──
      for ( var i = 0 ; i < lines.length ; i++ ) {
        if ( lines[i].trim() != '' )
          await this.eval_((this.dryRun ? 'propose ' : '') + lines[i]);
      }

      // -- 5. Delete this block, since it was just a prompt, not a block
      setTimeout(() => this.block.del(), 100);
    },

    async function buildSystemPrompt_(x) {
      var parts = [];

      parts.push(`
You are a REFLOW command generator. Respond ONLY with valid REFLOW commands, one per line.
Do NOT wrap commands in code fences or add explanatory text between them.
If you need to explain something, use the markdown command.
If you need to show data, use dao, cells, or chart commands.

Examples:
show users -> dao userDAO
create a spreadsheet of size 5 x 10 -> cells(5,10)
create a markdown document -> markdown("markdown test\ngoes here")

You can also use the 'ask' command to run commands and have their output sent back to you.
Examples:
get a list of available flows -> ask flows
get a list of available DAOs -> ask daos
get a list of available commands -> ask help (but you have already been provided this information)

## REFLOW JavaScript String Formatting Rules

When using REFLOW commands that accept string parameters (especially \`markdown\`, \`doc\`, \`h1\`, \`h2\`, etc.), follow these JavaScript string formatting requirements:

### Multi-line Strings
- **NEVER use actual newline characters** in string literals
- **ALWAYS escape newlines** using \`\\n\`
- Strings must be valid JavaScript string literals

### Pitfalls
- Don't use the *doc* command as it doesn't support markdown. Use *markdown* instead.
`
      );

      // ── Available commands ──
      var commands = await this.commandDAO.select();
      if ( commands && commands.array && commands.array.length ) {
        parts.push('## Available Commands');
        commands.array.forEach(cmd => {
          var line = '- `' + cmd.id + '`';
          if ( cmd.description ) line += ' — ' + cmd.description;
          if ( cmd.usage )       line += '  Usage: `' + cmd.usage + '`';
          parts.push(line);
        });
        parts.push('');
      }

      // ── Available DAOs ──
      // The LLM needs to know what data it can query
      parts.push('## Available DAOs');
      parts.push('Use `ask daos` to list all, `ask describe <daoName>` to see model properties.');
      parts.push('Use `dao query <daoName> [where <predicate>]` to query data.');
      parts.push('');

      // ── Conventions ──
      parts.push('## Conventions');
      parts.push('- For conversational responses, use: markdown("your text here")');
      parts.push('- For errors or unknowns, use: \'throw "error ..."\' or  \'markdown("I could not ...")\', depending on the length.');
      parts.push('- Prefer specific commands over generic markdown when possible.');
//      parts.push('- You can call `agent` to delegate to another LLM for sub-tasks.');

      return parts.join('\n');
    },

    function parseCommandLines_(content) {
      if ( ! content ) return [];

      // Strip code fences if LLM wrapped them despite instructions
      content = content.replace(/^```[\w]*\n?/gm, '').replace(/^```$/gm, '');

      return content
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && ! l.startsWith('//') && ! l.startsWith('#'));
    }
  ]
});
