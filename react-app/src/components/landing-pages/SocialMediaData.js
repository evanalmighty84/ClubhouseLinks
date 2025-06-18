// src/components/BiddingData.js

import DesignImage from '../services/images/Lead Generation.jpg'; // your one “hero” graphic
import ImplementationImage from './implementation.jpg';     // pick a second
import PartnerImage        from './partner-network.jpg';    // pick a third
import OnboardingImage     from './onboarding.jpg';         // pick a fourth

const BiddingData = [
    {
        title: 'In-House Design',
        description: `
      At Clubhouse Links, we own the entire bidding process from start to finish. For every service we offer—whether it’s Website Development & Apps, Design & Apparel, Graphic Design, Lead-Gen Platforms, Pool Remodeling & Cleaning, General Contracting, Roofing, or Solar & Electric Utility implementation—we craft precise, high-fidelity mockups and technical specs in-house. Our design team wireframes in Figma, builds 3D renderings where appropriate, and finalizes every detail before our engineers, artisans, or contractors ever step on site.
    `,
        image: DesignImage
    },
    {
        title: 'Turnkey Implementation',
        description: `
      Once the design is approved, we transition seamlessly into implementation: spinning up React/SPAs and serverless backends, prepping print-ready apparel files and managing print-shop integrations, exporting brand assets and style guides for signage, or pulling permits and coordinating subs on your build site. We handle client communications, project management, and quality assurance at every milestone—so our partners can focus on execution.
    `,
        image: ImplementationImage
    },
    {
        title: 'Partner Network',
        description: `
      We’re always looking to strengthen our network. If you’re a development shop, print/embroidery house, branding studio, pool contractor, general builder, roofer, solar installer or electrician, we <strong>invite you to partner with us</strong>. By joining Clubhouse Links’ bidding platform, you’ll receive well-scoped, escrow-backed projects with clear specifications and support from our in-house team.
    `,
        image: PartnerImage
    },
    {
        title: 'Easy Onboarding',
        description: `
      To get started, simply sign up as a bidder, complete your profile, and tell us your specialties. We’ll notify you whenever a matching bid goes live. Together, we’ll deliver beautifully designed, flawlessly implemented projects that delight clients—and keep your calendar full.
    `,
        image: OnboardingImage
    }
];

export default BiddingData;
