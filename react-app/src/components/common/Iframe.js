import React, { useEffect } from 'react';

const BookingIframe = () => {
    useEffect(() => {
        // Create a script element
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.text = `
      daysmart_acc = "f465f960-7239-43ba-b1f8-fab238a2d464";
      daysmart_iframe_width = 700;
      daysmart_iframe_height = 0;
      daysmart_website_root = "https://plugin.myonlineappointment.com";
      load_in_iframe = "false";
    `;
        document.body.appendChild(script);

        // Create a second script element to load the external script
        const externalScript = document.createElement('script');
        externalScript.type = 'text/javascript';
        externalScript.src = 'https://plugin.myonlineappointment.com/Scripts/external/bookingplugin.js';
        document.body.appendChild(externalScript);

        // Clean up the script elements on component unmount
        return () => {
            document.body.removeChild(script);
            document.body.removeChild(externalScript);
        };
    }, []);

    return (
        <div>
            <iframe
                title="Clubhouse Links Booking"
                src="https://clubhouselinks.myonlineappointment.com/Booking/?sid=0&guid=f465f960-7239-43ba-b1f8-fab238a2d464&customerId=1343445"
                width="100%"
                height="800"
                style={{ border: 'none' }}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
            />
        </div>
    );
};

export default BookingIframe;
