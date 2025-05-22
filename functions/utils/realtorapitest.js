const axios = require('axios');
const qs = require('qs');

(async () => {
    try {
        const response = await axios.post(
            'https://tpescatore.cbapex.com/components/autocomplete.cfc',
            qs.stringify({
                returnformat: 'json',
                method: 'listings',
                fields: 'streetaddress,ml_number,city',
                mlsid: 'mls_dallas',
                propertytype: 'residential',
                propertytype_list: 'Residential,Commercial,Land,MultiFamily',
                openhouse: '',
                lookupvalue: 'plano',
                listingtype: '',
                pricemin: 0
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        console.log('✅ Response Data:', response.data);
    } catch (err) {
        if (err.response) {
            console.error('❌ Request failed with status:', err.response.status);
            console.error('❌ Error data:', err.response.data);
        } else {
            console.error('❌ Error:', err.message);
        }
    }
})();
