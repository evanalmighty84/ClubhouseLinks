// getProxyFrom2Captcha.js
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

export async function get2CaptchaProxy() {
    const key = process.env.TWOCAPTCHA_API_KEY;

    try {
        const response = await axios.get('https://2captcha.com/residential/proxy', {
            params: {
                key,
                type: 'residential',
                country: 'us',
                format: 'json',
            },
        });

        const { proxy } = response.data;

        if (!proxy) throw new Error('No proxy returned from 2Captcha');

        console.log('🌐 Proxy:', proxy);
        return proxy; // Format: user:pass@host:port
    } catch (err) {
        console.error('❌ Failed to get proxy from 2Captcha:', err.response?.data || err.message);
        throw err;
    }
}
