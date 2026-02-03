# False Flag Fixer

## Overview
An AI-powered text scanner that detects and fixes AI-written content patterns to help avoid false positives from AI detection tools. The application uses Claude Haiku for text analysis and provides suggestions to humanize text.

## Project Structure
- `server.js` - Express backend server with API endpoints
- `public/` - Static frontend files (HTML, CSS, JS)
- `lib/` - Helper modules for text analysis
  - `context-aware-replacements.js` - Context-aware text replacement logic
  - `flow-risk-analysis.js` - Flow and structure analysis
  - `synonym-database.js` - Synonym lookup database

## Tech Stack
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **AI**: Anthropic Claude API (claude-haiku-4-5-20251001)
- **Frontend**: Vanilla HTML/CSS/JS (served as static files)

## Environment Variables
- `ANTHROPIC_API_KEY` - Required. Anthropic API key for Claude AI

## API Endpoints
- `POST /api/search-synonyms` - Search for word synonyms
- `POST /analyze` - Analyze essay for AI patterns
- `POST /quickfix` - Apply quick fixes to text
- `POST /api/chat/pro-support` - Pro Priority AI Chat Support

## Running the Application
The server runs on port 5000 and serves both the API and static frontend.

## Pro Chat Support Feature
- **Access**: Pro users only (localStorage, URL param `?test_pro=true` for dev, or Pro dashboard)
- **Word Limit**: 150 words per message (prevents essay submission)
- **Essay Detection**: Blocks requests with essay patterns (analyze, rewrite, score, etc.)
- **Rate Limit**: 50 requests/hour per user
- **Beta Warning**: Shown in dev environments (replit.dev, replit.app, localhost)
- **Production Security**: On custom domains, requires real Pro status (localStorage set by Stripe callback)

### Publishing Checklist
- [x] Chat works with current Pro detection (localStorage/URL params)
- [x] Essay prevention active (150-word limit, pattern detection)
- [x] Rate limiting implemented (50 requests/hour)
- [x] Claude API integration working
- [x] Beta warning for dev environments
- [ ] Stripe integration needed for production billing

## Recent Changes
- 2026-02-03: Added Pro Priority AI Chat Support with essay abuse prevention
- 2026-02-03: Added production verification and beta warning for chat
- 2026-02-01: Updated server to use port 5000 for Replit compatibility
