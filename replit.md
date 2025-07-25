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
- **Question Caching**: Pre-fetch 22 questions per game and store in memory for instant access
- **Session Storage**: Browser sessionStorage for client-side game state
- **Real-time Updates**: Polling mechanism with optimized state change detection
- **Database Schema**: Fully designed with games, players, answers, and rounds tables
- **Performance**: Questions cached in memory during gameplay, eliminating database queries

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
- **Question Database**: All questions stored in PostgreSQL 'questions' table
- **Answer Validation**: Server-side answer checking and scoring with text-based comparison
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

## Recent Changes (July 25, 2025)

### Optimized Question Pre-fetching System (July 25 - 2:00 PM)
- ✅ **IMPLEMENTED: Question pre-fetching** - Games now fetch all 22 questions (11 MC + 11 IB) upfront when started
- ✅ **ADDED: In-memory question cache** - Questions stored in memory during gameplay for instant access
- ✅ **OPTIMIZED: Game performance** - Eliminated database queries during gameplay, reduced latency from seconds to milliseconds
- ✅ **ENHANCED: Cache management** - Automatic cleanup when games finish or players disconnect
- ✅ **FIXED: Database connection issues** - Added proper fallback to memory storage when database unavailable
- ✅ **IMPROVED: Storage architecture** - Hybrid storage system with graceful degradation

### Database-Only Question System (July 25 - Morning)
- ✅ **FIXED: Database storage implementation** - Switched from MemStorage to DatabaseStorage for true database-driven questions
- ✅ **RESOLVED: Question type mismatch** - Fixed 'integer' vs 'input_based' type inconsistency in question selection
- ✅ **ADDED: Database schema updates** - Added usedQuestions and categoryProgress columns to games table
- ✅ **IMPLEMENTED: True random selection** - Questions now selected randomly from database with uniqueness tracking
- ✅ **VERIFIED: Full database integration** - All 484 multiple_choice and 494 input_based questions accessible
- ✅ **REMOVED: All hardcoded questions** - Completely eliminated QUESTIONS_POOL from routes.ts
- ✅ **IMPLEMENTED: Database-only questions** - All questions now come exclusively from the 'questions' table
- ✅ **FIXED: Answer display system** - Answers now properly store and display actual text values instead of numeric indices
- ✅ **UPDATED: Evaluation logic** - Multiple choice answers compared as text values with backwards compatibility

### Advanced Question Management System (July 25)
- ✅ **IMPLEMENTED: Smart question selection** - Questions now use fair category coverage ensuring balanced gameplay
- ✅ **ADDED: Question uniqueness tracking** - No question appears twice in the same game for better player experience  
- ✅ **ENHANCED: Category balancing** - Every category appears before any repeats, maintaining diverse question types
- ✅ **UPDATED: Results display timing** - Reduced from 5 seconds to 4 seconds for faster game flow
- ✅ **IMPROVED: Answer storage** - Questions now store ID, text, and correct answers for comprehensive game history
- ✅ **ADDED: Game state tracking** - usedQuestions and categoryProgress fields track question selection patterns

### Critical Bug Fixes & Performance Improvements (July 25)
- ✅ **FIXED: Critical Q1 round completion bug** - Players answering Q1 correctly now properly win the round instead of continuing to Q2
- ✅ **FIXED: Major performance issue** - Switched from slow database connection to memory storage (reduced response times from 10+ seconds to milliseconds)
- ✅ **ENHANCED: Game logic evaluation** - Fixed evaluateMultipleChoice function to properly compare answer indices

### UI Polish & Error Handling Improvements (July 25)
- ✅ **FIXED: Lobby transition synchronization** - Added session storage flags to prevent false "host closed lobby" messages
- ✅ **ENHANCED: Error messaging** - All errors now show as subtle red text instead of popup boxes
- ✅ **IMPROVED: Mobile integer input** - Enter/Done key submits answers, reduced font size for mobile
- ✅ **SIMPLIFIED: Integer questions** - Removed unnecessary instructional text and labels
- ✅ **REFINED: Results display** - "Correct Answer:" label appears above green-colored answer for clarity
- ✅ **ADDED: Subtle time's up message** - Red text appears briefly instead of blocking popup

## Recent Changes (July 24, 2025)

### Player Disconnection & Lobby Fixes (July 24)
- ✅ **FIXED: Lobby false "player left" message** - No longer shows on first game creation
- ✅ **ENHANCED: Lobby player tracking** - Properly updates when players join/leave
- ✅ **IMPROVED: Game disconnection handling** - Shows 3-second message and redirects home when opponent leaves
- ✅ **FIXED: Timer submission blocking** - Prevents answer submission after deadline
- ✅ **ENHANCED: Mobile experience** - Disabled tap highlights and pre-selection
- ✅ **UPDATED: Results display** - Shows elapsed time (e.g., "7s") instead of timestamps
- ✅ **FIXED: "Game not found" error** - Improved error handling and validation for game start

## Recent Changes (July 21, 2025)

### UI Minimalism Updates ✅ COMPLETE
- ✅ **REMOVED: All loading screens** - Instant transitions from homepage→lobby→game→results
- ✅ **SIMPLIFIED: Lobby design** - Removed borders, avatars, "ready to start" text, only game code and player names
- ✅ **ENHANCED: Player disconnect handling** - Proper notifications and home redirect for both lobby and game
- ✅ **MINIMIZED: Join game modal** - Subtle design without heavy borders
- ✅ **CLEANED: Multiple choice questions** - Removed A/B/C/D labels, streamlined option display
- ✅ **REDESIGNED: Results display** - Simple player name + colored answer boxes (green/red) with minimal correct answer display
- ✅ **IMPROVED: Integer results** - Shows answer boxes with submission timestamps for better feedback

### Game Flow Optimizations ✅ COMPLETE
- ✅ **FIXED: Eliminated loading screens between rounds** - Next question data now preloaded during results display
- ✅ **FIXED: Game completion flow** - Game properly shows final results page after last round
- ✅ **IMPLEMENTED: Comprehensive results page** - Shows winner, round counts, and full game history in scrollable format
- ✅ **ENHANCED: Results timing** - Results show for exactly 3 seconds after every question
- ✅ **OPTIMIZED: State transitions** - Smooth flow from results to next question without loading states

### Multi-Round Game System Implementation ✅ COMPLETE
- ✅ **IMPLEMENTED: Full multi-round system** - Games now run multiple rounds until a player wins ROUNDS_TO_WIN (5)
- ✅ **FIXED: Proper round progression** - After each round completion, game automatically starts next round
- ✅ **IMPLEMENTED: Timeout handling** - Auto-saves "no_answer" for players who don't respond within 15 seconds
- ✅ **ENHANCED: Scoring logic** - Tracks rounds won per player, first to 5 rounds wins the game
- ✅ **TESTED: Q1→Q2 progression** - Both correct/wrong answers properly trigger Q2
- ✅ **WORKING: Complete game flow** - From round 1 through multiple rounds to game completion

### Updated Game Logic Specifications
**Question 1 (Multiple Choice):**
- 15-second timer with automatic processing on timeout
- One correct, one wrong → correct player wins round immediately
- Both correct or both wrong → proceed to Question 2

**Question 2 (Integer):**
- 15-second timer with timeout handling
- Winner determination order: exact match → speed (if both correct) → proximity (if both wrong)
- Any answer beats no answer

**Round/Game Completion:**
- Winner's score incremented after each round
- First player to reach ROUNDS_TO_WIN (5) wins the game
- Results display for 3 seconds, then immediate transition to next round
- Final results page shows winner, scores, and complete game history

### Game Logic Implementation (1 Round for Testing)
**Question 1: Multiple Choice**
- Both players get same question with 15-second deadline
- One correct, one wrong: Winner determined immediately, round ends
- Both correct or both wrong: Move to Question 2

**Question 2: Integer Input**  
- Winner determined by: 1) Exact correct answer, 2) Speed if both correct, 3) Proximity if both wrong
- FIXED: Game now waits for both players or deadline before processing
- Game ends after 1 round (will extend to 5 rounds later)

### UI Improvements
- ✅ Minimized lobby page design while keeping functionality
- ✅ Made waiting messages more subtle without popup boxes
- ✅ Added mobile scroll-to-top functionality
- ✅ Removed "(max 10 chars)" text from landing page
- ✅ Comprehensive debugging added for answer processing
- ✅ **NEW: Complete results page** - Shows final winner, scores, and detailed breakdown of all questions/answers played

### Results Page Features
- Final score display with winner celebration
- Detailed breakdown of every question asked and answers given
- Correct/incorrect answer validation display
- Round-by-round progression tracking
- Clean navigation back to new games

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