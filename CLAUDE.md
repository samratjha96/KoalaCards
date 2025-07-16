# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KoalaCards is a language‑learning flashcard app with SRS (Spaced Repetition System), speech recognition, and LLM grading. It helps users learn languages with a focus on listening and speaking skills through objective, machine-assisted grading.

## Commands

- **Lint:** `tidy.sh` (runs eslint fixes, typescript check, and prettier)
- **Type Check:** `npx tsc --noEmit`
- **Tests:** `npm test` or `npm run test:coverage` for coverage reports
- **Format Code:** `npm run format`
- **Start Local Server:** `docker-compose up --build -d` (runs local server on port 3000)
- **Never run:** build, dev (localhost:3000 already running), start, or any DB ops
- **THE DEV SERVER RUNS IN A CONTAINER!!!** Don't expect the DB to be available on local. Don't try to run the dev server on bare metal. The same goes for the database - it's not on the host, it's on Docker.
## Architecture

### Tech Stack
- **Framework:** Next.js with React
- **Language:** TypeScript (strict mode)
- **API:** tRPC for type-safe API routes
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js with email magic links and Google OAuth
- **UI Components:** Mantine library
- **External Services:**
  - AWS Bedrock for LLM grading (Claude model) and image generation (Stable Diffusion)
  - AWS S3 for file storage
  - AWS Polly for text-to-speech
  - AWS Transcribe for speech-to-text
  - PostHog for analytics

### Key Directories
- `/pages` - Next.js pages and routes
- `/koala` - Core application logic
  - `/koala/components` - React components
  - `/koala/trpc-routes` - API routes using tRPC
  - `/koala/quiz-evaluators` - Logic for grading user responses
  - `/koala/decks` - Flashcard deck management
  - `/koala/review` - Spaced repetition review system

### Important Services
- **Speech Services** - TTS via AWS Polly for voice generation
- **Transcription Services** - STT via AWS Transcribe for speech recognition
- **Storage** - AWS S3 for audio files and images
- **LLM Integration** - AWS Bedrock (Claude model) for grading responses
- **Image Generation** - AWS Bedrock (Stable Diffusion) for generating card images
- **FSRS Algorithm** - Scheduling algorithm for spaced repetition

## Coding Rules

- **TypeScript:** strict; never use `any` (use `unknown` only when unavoidable)
- **React:** functional components with explicit return types, avoid inline JSX expressions. Use variables and then {insertTheResult}.
- **Naming:** PascalCase components; camelCase functions & variables; kebab-case files.
- **Structure:** small, focused, reusable components; follow existing patterns; Next.js routing & data fetching
- **UI:** Mantine library for styling
- **Config:** store secrets in environment variables
- **Data:** prefer `getServerSideProps` over `trpc`
- **Style:** avoid inline expressions, long one‑liners, and ternaries; expand code vertically
- **Safety:** never use `dangerouslySetInnerHTML`. Always make sure the user owns the resource they are accessing in tRPC.
- **Component Flow:** Child components should not pass callbacks to parents. Follow React's unidirectional data flow.
- **Refs:** Avoid using refs unless absolutely necessary

## AWS Integration

- Always use AWS SDK V3 for javascript
