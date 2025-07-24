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

## Recent Changes (July 24, 2025)

### Player Disconnection & Lobby Fixes (July 24)
- ✅ **FIXED: Lobby false "player left" message** - No longer shows on first game creation
- ✅ **ENHANCED: Lobby player tracking** - Properly updates when players join/leave
- ✅ **IMPROVED: Game disconnection handling** - Shows 3-second message and redirects home when opponent leaves
- ✅ **FIXED: Timer submission blocking** - Prevents answer submission after deadline
- ✅ **ENHANCED: Mobile experience** - Disabled tap highlights and pre-selection
- ✅ **UPDATED: Results display** - Shows elapsed time (e.g., "7s") instead of timestamps
- ✅ **FIXED: "Game not found" error** - Improved error handling and validation for game start

### Mid-Game Disconnection System (July 24 - Latest)
- ✅ **FIXED: Access Denied after player leaves** - Game properly ends when player count drops below 2
- ✅ **ENHANCED: Player removal during gameplay** - Players can leave during active games  
- ✅ **IMPROVED: Game state management** - Server detects disconnections and ends games gracefully
- ✅ **ADDED: Debug logging** - Client-side logging for disconnection detection in results phase
- ✅ **STREAMLINED: Leave handlers** - Unified leave handling for lobby and game states

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