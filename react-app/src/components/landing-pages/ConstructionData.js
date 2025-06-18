// src/components/ConstructionData.js

import OutdoorImage               from '../services/images/ResidentialDesign.jpg';
import ResidentialRoofingImage    from '../services/images/general-contracting.jpg';
import RoofingConstructionImage  from '../services/images/roofing.jpg';
import SolarImplementationImage   from '../services/images/SolarElectric.jpg';

const ConstructionData = [
    {
        title: 'Outdoor Residential Construction',
        description: `
      At Clubhouse Links, every outdoor living space starts in our design studio. We create detailed 2D site plans and immersive 3D renderings—patios, pergolas, decks, outdoor kitchens and fire features all come to life in Figma and Sketch before a single shovel hits the ground.
      
      When you’re happy with the visuals, we take care of permits, site prep and full build-out: grading, hardscapes, lighting, irrigation, and final landscape touches. Our in-house project managers keep you informed at every milestone so the finished oasis matches exactly what you envisioned.
    `,
        image: OutdoorImage,
    },
    {
        title: 'Residential Roofing',
        description: `
      Your roof is both protection and curb appeal. We begin with high-res material mockups—shingles, metal panels or tile—showing how color, texture and pitch will complement your home’s style and energy goals.
      
      Once approved, our crews handle everything: tear-off of old roofing, installation of premium underlayment, flashing and ventilation, right through the final inspection. We manage warranties, perform quality checks, and even integrate future-ready clips for a potential solar array.
    `,
        image: ResidentialRoofingImage,
    },
    {
        title: 'Commercial Roofing & Construction',
        description: `
      From custom structural framing to commercial-grade membrane systems, our roofing construction service covers all scales of build. Our design team creates technically accurate roof schematics—drainage plans, load analysis and BIM models—so fabrication and on-site assembly go smoothly.
      
      Implementation is fully overseen by our own site supervisors: coordinating subcontractors, enforcing safety protocols, and running thermal/moisture inspections. Whether it’s a four-plex, warehouse, or multi-story build, you get one point of accountability and a roof built to last.
    `,
        image: RoofingConstructionImage,
    },
    {
        title: 'Solar Implementation',
        description: `
      We design solar solutions that balance performance with aesthetics. Our engineers produce 3D panel layouts, shade studies, and electrical one-lines that integrate seamlessly on rooftops or ground mounts—complete with monitoring dashboards to track yield in real time.
      
      On the implementation side, we secure utility interconnection approvals, install panels, inverters, and battery storage, and commission the system to full capacity. From permits to post-install monitoring, Clubhouse Links delivers a turnkey solar build under a single roof.
    `,
        image: SolarImplementationImage,
    },
];

export default ConstructionData;
