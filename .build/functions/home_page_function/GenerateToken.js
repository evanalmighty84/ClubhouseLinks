const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// JWT configuration
const API_KEY = 'ebce4eb3-dad1-4d9a-b95c-be0bdf2b2355';
const SECRET = '00600d4a9f2dd33012dafa5551c14a298963163fbb988519166e55a64e1ce66f';
const jwtOptions = {
    expiresIn: '120m',
    algorithm: 'HS256'
};
const jwtPayload = {
    apikey: API_KEY,
    permissions: ['allow_join'], // `ask_join` || `allow_mod`
    version: 2, // OPTIONAL
    roomId: '2kyv-gzay-64pg', // OPTIONAL
    participantId: 'lxvdplwt', // OPTIONAL
    roles: ['crawler', 'rtc'], // OPTIONAL
};

// Generate JWT token
const token = jwt.sign(jwtPayload, SECRET, jwtOptions);
console.log('Generated Token:', token);

// Fetch configuration
const fetchOptions = {
    method: "POST",
    headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        "customRoomId": "aaa-bbb-ccc",
        "webhook": "https://your-webhook-url.com",
        "autoCloseConfig": { "enabled": true, "duration": 30 },
        "autoStartConfig": { "enabled": true, "start_time": "2024-07-30T10:00:00Z" }
    }),
};

const url = `https://api.videosdk.live/v2/rooms`;

// Function to create a room
const createRoom = async () => {
    try {
        const response = await fetch(url, fetchOptions);
        const data = await response.json();
        console.log('Room Created:', data);
    } catch (error) {
        console.error('Error creating room:', error);
    }
};

createRoom();
