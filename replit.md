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

## Running the Application
The server runs on port 5000 and serves both the API and static frontend.

## Recent Changes
- 2026-02-01: Updated server to use port 5000 for Replit compatibility
