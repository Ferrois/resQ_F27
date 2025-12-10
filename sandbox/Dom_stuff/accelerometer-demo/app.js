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
                document.getElementById('accel-x').textContent = accelerometer.x.toFixed(2);
                document.getElementById('accel-y').textContent = accelerometer.y.toFixed(2);
                document.getElementById('accel-z').textContent = accelerometer.z.toFixed(2);
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

    // --- Gyroscope Setup ---
    if ('Gyroscope' in window) {
        try {
            const gyroscope = new Gyroscope({ frequency: 60 }); // 60 readings per second

            gyroscope.addEventListener('reading', () => {
                document.getElementById('gyro-x').textContent = (gyroscope.x * (180 / Math.PI)).toFixed(2); // Convert to degrees/sec for clarity
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