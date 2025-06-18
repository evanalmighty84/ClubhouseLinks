// LandingServicesPage.jsx
import React from 'react';
import ServicesSection from '../services/ServicesSection';
import servicesData     from './ServicesLandingPageData';
import Unlimited        from '../WideMovieLogo.gif';
import Logo             from '../Untitled_design_7_o9dfvi_c_crop,w_1116,h_628,ar_16_9.png';

const LandingServicesPage = () => (
    <ServicesSection
        services       = {servicesData}
        heroGif        = {Unlimited}
        heroLogo       = {Logo}
        fullScreen     = {true}      // makes each service span full width
        heroSwapDelay  = {10000}     // swap to logo after 10s on landing
    />
);

export default LandingServicesPage;
