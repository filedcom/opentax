---
name: save-skill
description: Helps users permanently set up the OpenTax skill on their AI platform so they don't have to load it every time.
---

# Save OpenTax Skill Permanently

Help the user set up OpenTax so it's always available in their AI assistant without needing to re-upload the skill file each time.

## Detect the platform

Ask the user what AI tool they're using, then follow the right instructions below.

## Claude Code

Install as a plugin:

```bash
# In Claude Code, run:
/plugin marketplace add filedcom/opentax
/plugin install opentax@filedcom-opentax
```

Once installed, the skills are always available:
- `/opentax:tax-preparer` -- prepare a return
- `/opentax:tax-reviewer` -- review a return

## Claude (claude.ai)

Claude on the web supports Projects with custom instructions:

1. Go to claude.ai and create a new Project (or open an existing one)
2. In the Project's knowledge section, upload the skill file:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/filedcom/opentax/main/skills/SKILL.md -o opentax-skill.md
   ```
3. Upload `opentax-skill.md` as a Project knowledge file
4. Every conversation in that Project will have the OpenTax skill available

## ChatGPT

ChatGPT supports Custom GPTs and custom instructions:

### Option A: Custom Instructions
1. Go to Settings > Personalization > Custom Instructions
2. Download the skill file:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/filedcom/opentax/main/skills/SKILL.md -o opentax-skill.md
   ```
3. Copy the contents of `opentax-skill.md` into the "How would you like ChatGPT to respond?" section

### Option B: Create a Custom GPT
1. Go to Explore GPTs > Create
2. In the Instructions field, paste the contents of the skill file
3. Name it "OpenTax" and save
4. The GPT will be available from your sidebar

## Gemini

Gemini supports Gems (custom agents):

1. Go to gemini.google.com and click "Gem manager"
2. Create a new Gem
3. Download the skill file:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/filedcom/opentax/main/skills/SKILL.md -o opentax-skill.md
   ```
4. Paste the contents of `opentax-skill.md` into the Gem's instructions
5. Name it "OpenTax" and save

## Copilot CLI

If using GitHub Copilot CLI:

```bash
# Add the plugin marketplace
copilot plugin marketplace add filedcom/opentax
```

## Other platforms

For any other AI assistant that supports system prompts or custom instructions:

1. Download the skill file:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/filedcom/opentax/main/skills/SKILL.md -o opentax-skill.md
   ```
2. Paste the contents into whatever "system prompt", "custom instructions", or "knowledge base" feature the platform provides
3. Save it so it persists across conversations

If the platform doesn't support persistent instructions, the user will need to upload the skill file at the start of each conversation.
