// src/components/PlumbingData.js

import FixtureInstallImage       from '../services/images/fixtures.jpg';
import DrainCleaningImage        from '../services/images/draincleaning.jpg';
import PipeRepairImage           from '../services/images/piperepair.jpeg';
import WaterHeaterInstallImage   from '../services/images/plumbing.png';

const PlumbingData = [
    {
        title: 'Fixture Installation & Upgrades',
        description: `
      Whether it's a sleek new faucet, rain-style showerhead, or an entire kitchen sink, our licensed plumbers ensure precise installation that prevents leaks and preserves manufacturer warranties.
      
      We assess your existing plumbing layout, verify water pressure compatibility, and install fixtures with attention to both performance and design. From modern remodels to classic upgrades, we make sure everything flows beautifully.
    `,
        image: FixtureInstallImage,
    },
    {
        title: 'Drain Cleaning & Sewer Line Clearing',
        description: `
      Clogged drains are more than an inconvenience—they can lead to costly backups. Our team uses advanced camera inspections and hydro-jetting to diagnose and clear blockages safely and effectively.
      
      Whether it’s a slow kitchen sink, a stubborn toilet, or a tree root intrusion in the main sewer line, we provide same-day solutions that keep your plumbing system healthy and free-flowing.
    `,
        image: DrainCleaningImage,
    },
    {
        title: 'Pipe Repair & Repiping Services',
        description: `
      From pinhole leaks behind the wall to full-scale galvanized pipe replacements, our pipe repair services are built on precision and permanence. We use leak detection equipment to identify problem areas without unnecessary demolition.
      
      Need repiping? We offer modern materials like PEX or copper, mapped and installed with minimal disruption. Your home’s plumbing infrastructure is too important to trust to anyone else.
    `,
        image: PipeRepairImage,
    },
    {
        title: 'Water Heater Installation & Maintenance',
        description: `
      Hot water should be reliable, not a daily gamble. We install both traditional tank and tankless water heaters, sized to your household’s needs and energy preferences. Every system includes code-compliant venting, expansion tanks, and pressure relief testing.
      
      Already have a unit? We offer flushing, anode rod replacement, and thermostat recalibration to extend the life of your system and prevent unexpected breakdowns. Be sure to Leave a Review for Randy and Jason when they come!
    `,
        image: WaterHeaterInstallImage,
    },
];

export default PlumbingData;
