# ResQ - Emergency Response Platform

**ResQ** is a comprehensive emergency response platform that connects communities, coordinates rescue operations, and ensures faster response times during critical situations. This project serves as a proof of concept submission for our team **F27** to **BuildingBloCS Hackathon 2025 December Conference**.

## Core Functionalities

- **Real-Time Emergency SOS System**
  - One-tap emergency button to send SOS alerts
  - Automatic photo capture (front and back camera) for context
  - Real-time location sharing with responders
  - Emergency cancellation capability

- **AI-Powered Emergency Assessment**
  - Automatic analysis of emergency photos using Groq AI
  - Provides condition assessment, severity level, reasoning, and suggested actions
  - Considers user's medical history for better context
  - Location inference from images

- **Fall Detection**
  - Advanced accelerometer-based fall detection algorithm
  - Automatic SOS trigger after 10 seconds if no response
  - User confirmation prompt before auto-SOS
  - Configurable enable/disable option

- **AED (Automated External Defibrillator) Locator**
  - Automatic detection of nearest AEDs when emergency is raised
  - Displays up to 5 nearest AED locations on map
  - Detailed AED information including building, floor level, and address
  - GeoJSON-based AED database

- **Real-Time Location Tracking**
  - Continuous location updates via WebSocket
  - Directional indicator showing user heading
  - Interactive map with Leaflet

- **Push Notifications**
  - Web Push API integration for emergency alerts
  - Notifies nearby responders when emergency is raised
  - Works even when app is in background

- **Medical Information Management**
  - Store medical conditions and treatments
  - Track first aid skills and proficiency levels
  - Share medical history with responders during emergencies
  - AI analyses medical history to find out what kind of treatment a user requires

- **Real-Time Map Interface**
  - Interactive map showing user location, emergencies, and AEDs
  - Visual markers for active emergencies
  - Distance calculations to nearby emergencies
  - Emergency details dialog with AI summary

## Tech Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Chakra UI v3** - Component library
- **React Leaflet** - Map integration
- **Socket.io Client** - Real-time communication
- **Axios** - HTTP client
- **React Router** - Routing

### Backend
- **Node.js** - Runtime environment
- **Express 5** - Web framework
- **MongoDB** - Database (via Mongoose)
- **Socket.io** - WebSocket server
- **JWT** - Authentication (access & refresh tokens)
- **bcryptjs** - Password hashing
- **web-push** - Push notification service

## 🔧 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Ferrois/resQ_F27.git
cd ResQ_F27
```

### 2. Install Dependencies

Install dependencies for both client and server:

```bash
# Install dependencies
npm run build_simul
```

### 3. IMPORTANT!!! Create environment variables

Create a `.env` file in the `server` directory with the following variables (5 Key-value pairs):

```env
# MongoDB Connection
dbURI=<MongoDbURI HERE>

# Server Port (optional, defaults to 8080 (do not set this in heroku))
PORT=8080

# Groq API Key for AI Emergency Assessment
GROQ_API_KEY=<groqApikey HERE>

# Secret Key (For JWT and other functions if required)
SECRET_KEY=<SecretKey HERE>

# VAPID Keys for Push Notifications (generate using web-push)
PUBVAPID=<vapidPublicKey HERE>
PRIVAPID=<vapidPrivateKey HERE>
EMAILVAPID=<vapidEmail HERE> # include mailto: in the front (example: EMAILVAPID=mailto:abc123@gmail.com)

# Dev Mode
DEV_MODE=y (y for yes, n for no)
```

### 4. Run the dev servers (using 2 separate terminals)

```bash
# Run client (vite)
npm run clientdev
```

- using another terminal:

```bash
# Run server (nodeJs)
npm run serverdev
```

### 5. Open the website

Now, go to [http://localhost:5173](http://localhost:5173) in your browser to access the ResQ application. 

## Notes

- **Emergency Expiration**: Emergencies automatically expire after 10 minutes
- **Location Accuracy**: The app requires location permissions for full functionality
- **Camera Permissions**: Required for emergency photo capture (can be disabled in settings)
- **Browser Compatibility**: Modern browsers with WebSocket, Geolocation, and MediaDevices API support
- **Mobile Optimisation**: Designed to work on mobile devices with responsive UI

## References

- **BuildingBloCS Hackathon 2025** - Project submission platform
- **Groq** - AI inference API
- **OpenStreetMap** - Map tiles
- **Chakra UI** - UI component library
- **Leaflet** - Mapping library
- **Self Repositories** - Repositories and apps that the developers have worked on before this competition have been referenced to support the development of resQ
- **Stack Overflow** - To solve and debug common issues

## AI Declaration

- Cursor and Gemini were used to guide the developers in code generation, debugging and code explanation. AI has been used to set up common boilerplates including this README.md
- Groq AI was used to provide an AI analysis of the emergency situation and generate an AI summary

---


## Contributors ##

**Team F27** - BuildingBloCS Hackathon 2025 December Conference

- **Ferrois Thiam** - Fullstack Developer & Technical Explainer & Devops Engineer
- **Dominic Chia** - Developer & App Tester & Video Editor/Presenter & Write-up
- **Lester Lim** - Developer & App Tester & Video Editor/Presenter & Write-up
- **Reyes Koh** - AI Developer & Assets generation & Write-up

Peace ✌️
