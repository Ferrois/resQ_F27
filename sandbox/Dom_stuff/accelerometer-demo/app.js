const FREE_FALL_THRESHOLD = 0.5; // Acceleration magnitude threshold in m/s²
const MIN_DROP_READINGS = 10;   // Must be below threshold for this many readings (~0.16 seconds at 60Hz)

let freeFallReadingCount = 0;
let isAlertActive = false;

document.getElementById('start-sensors-btn').addEventListener('click', () => {
    // 1. Check for older iOS permission request (specific to DeviceMotion/Orientation events)
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then(state => {
                if (state === 'granted') {
                    startGenericSensors();
                } else {
                    alert('Permission for motion sensors denied by user.');
                }
            })
            .catch(error => {
                console.error('Permission request failed:', error);
                alert('Error requesting permission. Check console for details.');
            });
    } else {
        // 2. For non-iOS 13+ browsers (Android, etc.) or if the modern API is supported, just start the sensors
        startGenericSensors();
    }
});

function startGenericSensors() {
    // --- Accelerometer Setup ---
    if ('Accelerometer' in window) {
        try {
            const accelerometer = new Accelerometer({ frequency: 60 }); // 60 readings per second

            accelerometer.addEventListener('reading', () => {
                const x = accelerometer.x;
                const y = accelerometer.y;
                const z = accelerometer.z;

                document.getElementById('accel-x').textContent = x.toFixed(2);
                document.getElementById('accel-y').textContent = y.toFixed(2);
                document.getElementById('accel-z').textContent = z.toFixed(2);

                // === FREE FALL DETECTION LOGIC ===

                // 1. Calculate the magnitude of the total acceleration vector
                // Total acceleration (m/s²) is the square root of the sum of the squares of the components:
                const magnitude = Math.sqrt(x * x + y * y + z * z);
                // 

                // 2. Check if the magnitude is below the free-fall threshold
                if (magnitude < FREE_FALL_THRESHOLD) {
                    freeFallReadingCount++;
                } else {
                    freeFallReadingCount = 0; // Reset counter if the acceleration returns to normal
                    if (isAlertActive) {
                        isAlertActive = false; // Optional: Silence the alarm if the device is picked up
                    }
                }

                // 3. Check if the minimum duration has been met
                if (freeFallReadingCount >= MIN_DROP_READINGS && !isAlertActive) {
                    triggerDropAlert();
                    isAlertActive = true;
                }

            });

            accelerometer.addEventListener('error', event => {
                handleSensorError('Accelerometer', event.error);
            });

            accelerometer.start();
            console.log('Accelerometer started.');
        } catch (error) {
            handleSensorConstructionError('Accelerometer', error);
        }
    } else {
        document.getElementById('accel-x').textContent = 'API Not Supported';
        console.log('Accelerometer API is not supported in this browser.');
    }

    // --- Gyroscope Setup (Unchanged) ---
    if ('Gyroscope' in window) {
        try {
            const gyroscope = new Gyroscope({ frequency: 60 }); // 60 readings per second

            gyroscope.addEventListener('reading', () => {
                document.getElementById('gyro-x').textContent = (gyroscope.x * (180 / Math.PI)).toFixed(2);
                document.getElementById('gyro-y').textContent = (gyroscope.y * (180 / Math.PI)).toFixed(2);
                document.getElementById('gyro-z').textContent = (gyroscope.z * (180 / Math.PI)).toFixed(2);
            });

            gyroscope.addEventListener('error', event => {
                handleSensorError('Gyroscope', event.error);
            });

            gyroscope.start();
            console.log('Gyroscope started.');
        } catch (error) {
            handleSensorConstructionError('Gyroscope', error);
        }
    } else {
        document.getElementById('gyro-x').textContent = 'API Not Supported';
        console.log('Gyroscope API is not supported in this browser.');
    }

    // Optional: Disable the button once the process starts
    document.getElementById('start-sensors-btn').disabled = true;
    document.getElementById('start-sensors-btn').textContent = 'Sensors Running';
}

// === NEW ALERT FUNCTION ===
function triggerDropAlert() {
    console.warn("!!! FREE FALL DETECTED !!!");
    alert("Potential drop detected! Initiating emergency protocol...");
    // You could replace the simple alert() with:
    // 1. Playing a loud sound file (Audio API).
    // 2. Sending a network request (fetch) to an emergency server.
}

// --- Error Handling Functions (Unchanged) ---
function handleSensorError(sensorName, error) {
    if (error.name === 'NotAllowedError') {
        alert(`Permission to access ${sensorName} was denied. Ensure the page is served over HTTPS and permissions are granted.`);
    } else if (error.name === 'NotReadableError') {
        console.log(`Cannot connect to the ${sensorName} sensor.`);
    } else {
        console.error(`${sensorName} error:`, error);
    }
}

function handleSensorConstructionError(sensorName, error) {
    if (error.name === 'SecurityError') {
        alert(`Sensor access blocked by Permissions Policy. Ensure the page is served over HTTPS.`);
    } else {
        console.error(`${sensorName} construction error:`, error);
    }
}