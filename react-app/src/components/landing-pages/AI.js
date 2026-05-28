// LandingServicesPage.jsx
import React from "react";
import HomeServicesMapSection from "../services/HomeServicesMapSection";
import servicesData from "./ServicesLandingPageData";
import Logo from "../Untitled_design_7_o9dfvi_c_crop,w_1116,h_628,ar_16_9.png";

const LandingServicesPage = () => {
    return (
        <HomeServicesMapSection
            services={servicesData}
            logo={Logo}
            title="Home Service Locations"
        />
    );
};

export default LandingServicesPage;