// get2CaptchaAccountInfo.js
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.TWOCAPTCHA_API_KEY;

async function getAccountInfo() {
    try {
        const url = `https://api.2captcha.com/proxy?key=${API_KEY}`;
        const { data } = await axios.get(url);

        if (data.status !== 'OK') {
            throw new Error(`API returned: ${data.status}`);
        }

        console.log('✅ 2Captcha Proxy Account Info:');
        console.log('--------------------------------');
        console.log(`👤 Username: ${data.data.username}`);
        console.log(`📦 Total Flow: ${data.data.total_flow}`);
        console.log(`🚀 Used Flow: ${data.data.used_flow}`);
        console.log(`🌍 Whitelisted IPs:`);
        console.table(data.data.ip_white_list || []);
    } catch (err) {
        console.error('❌ Failed to fetch account info:', err.response?.data || err.message);
    }
}

getAccountInfo();
