
const fetch = require('node-fetch');


// Replace with your actual JWT token
const YOUR_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiJlYmNlNGViMy1kYWQxLTRkOWEtYjk1Yy1iZTBiZGYyYjIzNTUiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sInZlcnNpb24iOjIsInJvb21JZCI6IjJreXYtZ3pheS02NHBnIiwicGFydGljaXBhbnRJZCI6Imx4dmRwbHd0Iiwicm9sZXMiOlsiY3Jhd2xlciIsInJ0YyJdLCJpYXQiOjE3MjIyOTE0MTQsImV4cCI6MTcyMjI5ODYxNH0.1AncNbdxMfpyMwsJSCXf_T4SZtbW7qFhw2KHpiIIhfI';

const options = {
    method: "POST",
    headers: {
        "Authorization": `Bearer ${YOUR_TOKEN}`,
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

const createRoom = async () => {
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error('Error creating room:', error);
    }
};

createRoom();
