// ServicesData.js


import TreeCut     from '../services/images/pexels-canvastudio-3194518.jpg';
import TreeRemoval from '../services/images/pexels-tima-miroshnichenko-9574569.jpg';
import TreeStump   from '../services/images/pexels-format-380633-1029757.jpg';
import TreeStorm   from '../services/images/Lead Generation.jpg';

const ServicesData = [
    {
        title: 'Website Development and Applications',
        description: `
      Clubhouse Links is your best choice for web application and website development projects.
      We build fast, secure and visually striking platforms tailored to your exact needs.
      
    `,
        image: TreeCut,
    },

    {
        title: 'Lead Services',
        description: `
      We provide turnkey lead-generation through custom CRM integrations and API extensions.
      Build a reliable pipeline targeting HOAs, municipal contracts, and local Nextdoor
      communities. Our dashboards give you real-time visibility into conversions and ROI,
      so you never miss an opportunity to grow.
    `,
        image: TreeStorm,
    },
    {
        title: 'Graphic Design',
        description: `
      Clubhouse Links delivers bold, high-impact graphic design that brings brands to life.
      From sleek logos to vibrant digital assets, we craft visuals that capture attention
      and make your message stand out. Our process starts with a deep dive into your brand
      personality, ensuring consistency across every asset we produce.
    `,
        image: TreeStump,
    },
    {
        title: 'Design and Apparel',
        description: `
      At Clubhouse Links, we harness the power of A.I. to design custom apparel with unmatched
      speed and precision. From concept to production, our intelligent tools generate striking
      visuals that are ready for sublimation—cutting down turnaround time and ensuring your
      uniforms look as sharp as your brand. We handle everything from mockups to bulk fulfillment,
      giving you a turnkey solution.
    `,
        image: TreeRemoval,
    },
];

export default ServicesData;
