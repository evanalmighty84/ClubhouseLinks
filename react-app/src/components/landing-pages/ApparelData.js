// src/components/ApparelData.js

import AthleticJerseyImg  from '../services/images/Apparell-malcolnphoto-14997441.jpg';
import TshirtImg          from '../services/images/Apparell-aden-ardenrich-181745-581339.jpg';
import SchoolUniformImg   from '../services/images/Apparell-yankrukov-8617515.jpg';
import SignageImg         from '../services/images/pexels-tima-miroshnichenko-9574569.jpg';

const ApparelData = [
    {
        title: 'Athletic Jerseys',
        description: `
      At Clubhouse Links, our athletic-jersey design process starts with performance in mind. We’ll work with you to select moisture-wicking fabrics, ergonomic cuts, and breathable mesh panels—then craft full-color mockups in Figma that show every seam, stripe and sponsor patch before production.
      
      Once the design’s approved, we generate print-ready files for dye-sublimation or heat-press transfers, coordinate with our in-house production partners, and manage quality-control checks on every stitch. From team fittings to bulk fulfillment, we handle the entire workflow so your squads hit the field looking—and playing—their best.
    `,
        image: AthleticJerseyImg,
    },

    {
        title: 'School Uniforms',
        description: `
      Our school-uniform design service balances durability, comfort and brand consistency. We’ll consult on fabric blends, collar styles and embroidery placements—then produce tech-packs and digital lookbooks so administrators can approve colors and fit samples online.
      
      After sign-off, Clubhouse Links manages the full production chain: pattern making, cut-and-sew, and rigorous garment inspections. We coordinate multi-size orders, handle inventory logistics, and even provide re-order portals for schools—ensuring every student steps onto campus in crisp, cohesive attire.
    `,
        image: SchoolUniformImg,
    },
    {
        title: 'Branded Signage',
        description: `
      Beyond apparel, we design and fabricate on-brand signage to complement your uniforms or retail spaces. From vinyl banners and window decals to backlit channel letters, our team creates photorealistic mockups and material specs to nail down every finish.
      
      Our implementation arm then handles printing, laminating, framing and installation—plus any permitting or site surveys required. Whether it’s a pop-up event backdrop or permanent storefront signage, Clubhouse Links delivers a turnkey signage solution that ties your visual identity together.
    `,
        image: SignageImg,
    },
    {
        title: 'Workforce',
        description: `
      Whether it’s charity runs, company swag or merch drops, our custom T-shirt service brings your graphics to life. We start by fine-tuning artwork—vectorizing logos, adjusting colors to Pantone specs, and laying out prints on realistic 3D tees for your review.
      
      On the implementation side, we prep high-resolution separations for screen printing or DTG (direct-to-garment), schedule production runs with our trusted print houses, and oversee final packaging and shipping. You’ll get real-time updates at every stage, from press check to doorstep delivery.
    `,
        image: TshirtImg,
    },
];

export default ApparelData;
