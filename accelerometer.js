// Configuration values
const FALL_THRESHOLD = 3;       // Must first fall slowly (m/s²)
const IMPACT_THRESHOLD = 25;    // Must then suddenly stop (m/s²)
const MIN_FALL_TIME = 200;      // Must fall for this time (ms)

// State tracking variables
let falling = false;    // Falling? (T/F)
let startTime = null;   // Start time of fall

// Calculate total acceleration
function calculateTotalAccel(x, y, z) {
    return Math.sqrt(x * x + y * y + z * z);  // Pythagoras Theorem for 3D
}

// Fall detection logic
function checkFall(totalAccel) {
    const currentTime = Date.now();
  
    if (totalAccel < FALL_THRESHOLD) {        // Start to fall liao
        if (!falling) {
            falling = true;
            startTime = currentTime;          // Record start time of fall
    }
  }
  
    else if (totalAccel > IMPACT_THRESHOLD && falling) {    // Got hit floor anot?
        const duration = currentTime - startTime;
        if (duration >= MIN_FALL_TIME) {                    // Got fall long enough?
        fallDetected(duration, totalAccel);                 // If all got means fall alr
        }
        falling = false;
        startTime = null;
  }
  
    else {  // Fall but no problem
        if (falling) {
        console.log('Fall ended without impact');
    }
    falling = false;
    startTime = null;
  }
}

function fallDetected(duration, impactForce) {
    console.log('FALL DETECTED!');
    console.log('Fall duration:', duration.toFixed(0), 'ms');
    console.log('Impact force:', impactForce.toFixed(2), 'm/s²');
}

function handleMotionEvent(event) {
    // Get acceleration data from the sensor
    const acc = event.accelerationIncludingGravity;
  
    // Make sure we have valid data
    if (acc && acc.x !== null && acc.y !== null && acc.z !== null) {
    
        // Get individual axis values (use 0 if null)
        const x = acc.x || 0;
        const y = acc.y || 0;
        const z = acc.z || 0;
    
        // Calculate total acceleration magnitude
        const totalAccel = calculateTotalAccel(x, y, z);
    
        // Check if this indicates a fall
        checkFall(totalAccel);
  }
}

function startFallDetection() {
  console.log('Starting fall detection...');
  
  // Listen for device motion events
  window.addEventListener('devicemotion', handleMotionEvent);
}

function stopFallDetection() {
  console.log('Stopping fall detection...');
  
  // Remove the event listener
  window.removeEventListener('devicemotion', handleMotionEvent);
  
  // Reset state
  falling = false;
  startTime = null;
}

startFallDetection();
