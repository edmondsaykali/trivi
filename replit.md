# Trivi - Real-time Trivia Game

## Overview

Trivi is a vibrant, minimalist trivia application designed for real-time battles of knowledge between two players. The app features a fast-paced gameplay where players compete through rounds of multiple-choice and integer-based questions, with the first to win 5 rounds being declared the winner.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React Query for server state, local React state for UI
- **Build Tool**: Vite with custom configuration
- **Component Library**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints under `/api`
- **Session Management**: Server-side sessions for player identification
- **Game Logic**: Server-authoritative architecture with in-memory storage

### Data Storage Solutions
- **Current Implementation**: Hybrid storage system with automatic fallback
- **Primary**: PostgreSQL via Supabase with Drizzle ORM (schema defined and ready)
- **Fallback**: In-memory storage for development and testing
- **Session Storage**: Browser sessionStorage for client-side game state
- **Real-time Updates**: Polling mechanism with optimized state change detection
- **Database Schema**: Fully designed with games, players, answers, and rounds tables

## Key Components

### Game Flow Components
- **Landing Page**: Entry point with create/join game options
- **Lobby**: Pre-game waiting room with player avatars and game code sharing
- **Game**: Main gameplay interface with question display and answer submission
- **Results**: Post-game summary with final scores and round breakdown

### UI Components
- **Timer Bar**: Visual countdown for question deadlines
- **Player Avatar**: Dynamic avatar display with fallback images
- **Join Game Modal**: 4-digit code input interface
- **Question Display**: Adaptive UI for multiple-choice and integer questions

### Game Logic Components
- **Question Pool**: Predefined sets of multiple-choice and integer questions
- **Answer Validation**: Server-side answer checking and scoring
- **Round Management**: State transitions between questions and rounds
- **Winner Determination**: Rule-based scoring system with tie-breaking logic

## Data Flow

### Game Creation Flow
1. Player enters name and creates game
2. Server generates unique 4-digit game code
3. Player receives session ID and is redirected to lobby
4. Game state stored in memory with "waiting" status

### Game Joining Flow
1. Player enters name and 4-digit game code
2. Server validates code and adds player to existing game
3. Both players see updated lobby with avatars
4. Creator can start game when both players are present

### Gameplay Flow
1. Server pushes question data to both players simultaneously
2. Players submit answers within 15-second deadline
3. Server processes answers and determines round winner
4. Game state updates trigger UI refresh via polling
5. Process repeats until one player reaches 5 round wins

### Real-time Synchronization  
- Client polling every 1 second for game state updates
- Server-side deadline enforcement prevents client manipulation
- State changes immediately reflected across all connected clients

## Recent Changes (Jan 21, 2025)

### Critical Bug Fixes
- ✅ **FIXED: Answer validation completely rewritten** - Multiple choice questions now properly recognize correct answers
- ✅ **FIXED: Game logic redesigned** - Implemented exact specification for 1-round testing
- ✅ **FIXED: Score tracking** - Players now properly receive points when winning rounds
- ✅ **FIXED: Question progression** - Proper flow from Question 1 (multiple choice) to Question 2 (integer) based on results

### Game Logic Implementation (1 Round for Testing)
**Question 1: Multiple Choice**
- Both players get same question with 15-second deadline
- One correct, one wrong: Winner determined immediately, round ends
- Both correct or both wrong: Move to Question 2

**Question 2: Integer Input**  
- Winner determined by: 1) Exact correct answer, 2) Speed if both correct, 3) Proximity if both wrong
- Game ends after 1 round (will extend to 5 rounds later)

### UI Improvements
- ✅ Minimized lobby page design while keeping functionality
- ✅ Made waiting messages more subtle without popup boxes
- ✅ Added mobile scroll-to-top functionality
- ✅ Removed "(max 10 chars)" text from landing page
- ✅ Comprehensive debugging added for answer processing

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Database connection (future use)
- **drizzle-orm**: Database ORM with PostgreSQL dialect
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight client-side routing
- **zod**: Schema validation and type safety

### UI Dependencies
- **@radix-ui/react-***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

### Development Dependencies
- **vite**: Build tool with React plugin
- **typescript**: Type checking and compilation
- **tsx**: TypeScript execution for development
- **esbuild**: Production server bundling

## Deployment Strategy

### Development Environment
- Vite dev server for frontend with HMR
- tsx for backend development with file watching
- Replit-specific plugins for development experience
- Runtime error overlay for debugging

### Production Build
- Frontend: Vite build to `dist/public`
- Backend: esbuild bundle to `dist/index.js`
- Static file serving through Express
- Environment-based configuration

### Database Strategy
- Current: PostgreSQL via Supabase with Drizzle ORM (fully implemented)
- Real-time updates: Direct API polling (1-second intervals)
- Connection via `DATABASE_URL` environment variable
- Schema defined in `shared/schema.ts` with complete relationships
- Minimalist SVG avatars replace human photos
- Question-by-question results display implemented

### Session Management
- Browser sessionStorage for client state
- Server-side session tracking for game association
- Unique session IDs for player identification
- Game cleanup strategies for abandoned sessions

The application is designed to be easily migrated from in-memory storage to a full PostgreSQL database by implementing the existing `IStorage` interface with a database-backed storage class.