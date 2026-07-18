/**
 * Email-safe neo-punk Nextdoor leads report.
 *
 * Import:
 *   const leadReportHtml = require("./leadReportHtml");
 *
 * Insert above the greeting in zeptoscript.js:
 *   ${leadReportHtml}
 *
 * Uses the CSV columns:
 *   author -> Name
 *   phone  -> First Phone
 *
 * The "phones" array column is intentionally ignored.
 */

function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function phoneHref(phone = "") {
    const digits = String(phone).replace(/\D/g, "");

    if (digits.length === 10) {
        return `tel:+1${digits}`;
    }

    if (digits.length === 11 && digits.startsWith("1")) {
        return `tel:+${digits}`;
    }

    return "";
}

const leads = [
    {
        id: `7`,
        author: `Rozina Jivraj`,
        leadTypes: [`pest_control`],
        phone: `(281) 630-9325`,
        city: `Plano`,
        state: `TX`,
        description: `Hi we have a baby raccoon that has died in our backyard. Now it’s collecting all kinds of bugs. Any idea who I can call to have this cleaned up?`
    },
    {
        id: `415`,
        author: `Allen Hogge`,
        leadTypes: [`plumber`, `pest_control`],
        phone: `(757) 589-6402`,
        city: `Norfolk`,
        state: `VA`,
        description: `Can someone give me a price to snake out my main line it's not very old pvc and accessible no digging involved`
    },
    {
        id: `702`,
        author: `Deb Poquette`,
        leadTypes: [`pest_control`, `general_contractor`],
        phone: `(410) 340-3569`,
        city: `Columbia`,
        state: `MD`,
        description: `Anybody have recommendations for a general contractor close to Severn, MD that does basement finishing? Licensed and permit pulling pros only please - thanks in advance for anyone who replies!`
    },
    {
        id: `577`,
        author: `Shawna Mann`,
        leadTypes: [`pest_control`],
        phone: `(407) 687-7631`,
        city: `Frisco`,
        state: `TX`,
        description: `Need pest control to be done every 3 months. Pls IM me with reasonable price for it. No specific issues.`
    },
    {
        id: `633`,
        author: `Aiden-Michael Alexander`,
        leadTypes: [`pest_control`],
        phone: `(469) 298-3733`,
        city: `Richardson`,
        state: `TX`,
        description: `Does anyone know any pest control services who offer a one-time treatment without breaking your bank? Please advise. Thank you!`
    },
    {
        id: `632`,
        author: `Leigh Riley`,
        leadTypes: [`pest_control`],
        phone: `(972) 542-9730`,
        city: `Allen`,
        state: `TX`,
        description: `I’m looking for someone to mow my backyard very soon. I have a mower but can’t get it started and I’m not able to afford to hire a full lawn service. It’s a Very small yard, it would usually take me 10-15 minutes to do it when my mower was working. Please message me if interested`
    },
    {
        id: `636`,
        author: `Kim Bokhari`,
        leadTypes: [`pest_control`],
        phone: `(972) 781-8087`,
        city: `Plano`,
        state: `TX`,
        description: `Does anyone know of a wasp remover company? I am getting trapped inside by them making nest and they are not friendly!!`
    },
    {
        id: `816`,
        author: `Richard Abram`,
        leadTypes: [`pest_control`, `roofer`],
        phone: `(626) 485-3212`,
        city: `The Colony`,
        state: `TX`,
        description: `We have rats or squirrels chewing up spots on our roof trying to get into the attic. How do you stop this?`
    },
    {
        id: `849`,
        author: `Suba Shadiq`,
        leadTypes: [`pest_control`],
        phone: `(818) 221-5175`,
        city: `Dallas`,
        state: `TX`,
        description: `Can anyone recommend a decent exterminator for a house near 635 and Rosser ? (Rosser /Glen Cove) Seems like it is getting overrun by carpenter ants….`
    },
    {
        id: `1376`,
        author: `Shanice Diniz`,
        leadTypes: [`pest_control`],
        phone: `Not provided`,
        city: `Lewisville`,
        state: `TX`,
        description: `hi all, does anyone know a good and reliable pest control? i’ve wasps in my backyard. thank you in advance!!!!`
    },
    {
        id: `1105`,
        author: `Robbie Ramirez`,
        leadTypes: [`pest_control`],
        phone: `Not provided`,
        city: `Mesquite`,
        state: `TX`,
        description: `any pest control companies without cancellation fees? looking for a low monthly fee 3 14 b`
    },
    {
        id: `1254`,
        author: `Erim Adewole`,
        leadTypes: [`pest_control`],
        phone: `(214) 974-1006`,
        city: `Anna`,
        state: `TX`,
        description: `iso pest control recommendations. my property has creepy crawlers in the garage`
    },
    {
        id: `1329`,
        author: `Tajii Black`,
        leadTypes: [`pest_control`],
        phone: `(916) 779-9450`,
        city: `Irving`,
        state: `TX`,
        description: `hey need a pest control guy , no contract in irving 1 5 l`
    },
    {
        id: `1108`,
        author: `Allison Dugue`,
        leadTypes: [`pest_control`],
        phone: `(214) 749-0104`,
        city: `Dallas`,
        state: `TX`,
        description: `can anyone recommend someone reasonably priced and good for pest control? tyia`
    },
    {
        id: `1106`,
        author: `Jahnisha Warren`,
        leadTypes: [`pest_control`],
        phone: `(214) 566-8216`,
        city: `Dallas`,
        state: `TX`,
        description: `can you recommend the best pest control company ??? one that can spray your house once and you won't see anything for a year or more ??? thank you in advance`
    },
    {
        id: `1107`,
        author: `Robert Manigo`,
        leadTypes: [`pest_control`],
        phone: `(903) 731-9581`,
        city: `Garland`,
        state: `TX`,
        description: `looking for pest control. mosquitos yellow jackets outside and spiders inside 2 13 s`
    },
    {
        id: `1109`,
        author: `Sonia Godinez`,
        leadTypes: [`pest_control`],
        phone: `(214) 502-8078`,
        city: `Dallas`,
        state: `TX`,
        description: `any suggestions for pest control services to deal with termites? i need help as soon as possible. 2 h`
    },
    {
        id: `1110`,
        author: `Jason Avilla`,
        leadTypes: [`pest_control`],
        phone: `(801) 944-8288`,
        city: `Mckinney`,
        state: `TX`,
        description: `looking for a new pest control company for both inside and outside. any suggestions that you’re happy with? thanks in advance!!`
    },
    {
        id: `1111`,
        author: `Sandra Ronk`,
        leadTypes: [`pest_control`],
        phone: `(214) 503-7484`,
        city: `Dallas`,
        state: `TX`,
        description: `any recommendations for pest control companies? for roaches/waterbugs. thanks! 5 15 m`
    },
    {
        id: `1251`,
        author: `Yesenia Silerio`,
        leadTypes: [`pest_control`],
        phone: `(972) 201-6333`,
        city: `Dallas`,
        state: `TX`,
        description: `any recommendations for pest control services that offer good prices? please share your experiences and info. thank you in advance. 3 8 m`
    },
    {
        id: `1252`,
        author: `Jan Rottner`,
        leadTypes: [`pest_control`],
        phone: `(559) 437-9530`,
        city: `Rockwall`,
        state: `TX`,
        description: `i need a recommendation of a locally owned pest control service. thanks i advance. 10 p`
    },
    {
        id: `1112`,
        author: `Erika Hungaski`,
        leadTypes: [`pest_control`],
        phone: `(972) 992-8819`,
        city: `Grand Prairie`,
        state: `TX`,
        description: `hi neighbors, any recommendations for pest control? i would like to treat all 3 of my homes here in grand prairie.`
    },
    {
        id: `1248`,
        author: `Iris Templeman`,
        leadTypes: [`pest_control`],
        phone: `(214) 212-7667`,
        city: `McKinney`,
        state: `TX`,
        description: `looking for a good pest control guy. if you have one… let me know. 214-212-`
    },
    {
        id: `1253`,
        author: `Morgan Smithhart`,
        leadTypes: [`pest_control`],
        phone: `(903) 335-9575`,
        city: `Anna`,
        state: `TX`,
        description: `hi friendly neighbors! needing pest control services? look no further! i wanted to share a great local business that i recommend for anyone needing residential pest control services. if anyone is looking for honest, re…`
    },
    {
        id: `1250`,
        author: `Heidi Potts`,
        leadTypes: [`pest_control`, `lawn_care`],
        phone: `(971) 400-8750`,
        city: `Mckinney`,
        state: `TX`,
        description: `not happy with my lawn care company.... would like one that does lawn, sprinklers, pest control too... any suggestions?`
    },
    {
        id: `1777`,
        author: `Yong Chen`,
        leadTypes: [`pest_control`],
        phone: `(617) 610-0983`,
        city: `Frisco`,
        state: `TX`,
        description: `i need to do carpenter ant treatment in my house in cedar hill. please quote. thank you!`
    },
    {
        id: `1771`,
        author: `Kim Sandling`,
        leadTypes: [`pest_control`],
        phone: `Not provided`,
        city: `Arlington`,
        state: `TX`,
        description: `hello! i'm looking for a pest control company for a good treatment before i move into my house... any recommendations?? i'm also looking for an insulation company... and a house cleaner.... thank you for… 1 15 n`
    },
    {
        id: `1757`,
        author: `Uzma Qureshi`,
        leadTypes: [`pest_control`],
        phone: `(214) 680-1952`,
        city: `Allen`,
        state: `TX`,
        description: `looking for someone to knock down wasp hives in our front n backyard / allen silhouette area 1 4 c corei m.`
    },
    {
        id: `1770`,
        author: `Jentrie Reynolds`,
        leadTypes: [`pest_control`, `lawn_care`, `house_cleaner`],
        phone: `Not provided`,
        city: `Little Elm`,
        state: `TX`,
        description: `hello! my boyfriend and i just moved to the area and we are looking for guidance on different services. tia! 1) pest control 2) landscaping/weed control 3) pet sitter 4) home cleaners`
    },
    {
        id: `1772`,
        author: `Evan Rashid`,
        leadTypes: [`pest_control`],
        phone: `Not provided`,
        city: `Allen`,
        state: `TX`,
        description: `hello everyone i’m hoping someone can help me out for pest control i have these drain flies i believe in past few weeks they rest on ceilings and walls of the house so i’m wondering if anyone has any help or if any of you know anyone that can help . thank you ! 1 1 k`
    },
    {
        id: `1778`,
        author: `Esmeralda Huerta`,
        leadTypes: [`pest_control`],
        phone: `(469) 626-3948`,
        city: `Garland`,
        state: `TX`,
        description: `hi! anyone have a recommendation for a pet safe pest control company? thank you!`
    },
    {
        id: `1779`,
        author: `Angelina Hullum`,
        leadTypes: [`pest_control`],
        phone: `(303) 463-0705`,
        city: `Richardson`,
        state: `TX`,
        description: `anyone have recommendations for pest control ? mosquitoes roaches etc anyone but white knight`
    },
    {
        id: `1780`,
        author: `Kristi Patz`,
        leadTypes: [`pest_control`],
        phone: `(469) 528-0814`,
        city: `McKinney`,
        state: `TX`,
        description: `we have a serious ant problem around our house and now they are coming in .. does anyone know of an affordable pest control place in mckinney?`
    },
    {
        id: `1773`,
        author: `Sherry Baker`,
        leadTypes: [`pest_control`],
        phone: `(972) 567-9926`,
        city: `Mesquite`,
        state: `TX`,
        description: `help. i need a pest control guy to help me get rid of gnats. i’ve tried everything. i need someone who can pinpoint the source. tia 1 21 k`
    },
    {
        id: `1774`,
        author: `April Weand`,
        leadTypes: [`pest_control`],
        phone: `(214) 629-9456`,
        city: `Aubrey`,
        state: `TX`,
        description: `i need a pest control. does anyone have a local company they recommend?`
    },
    {
        id: `1775`,
        author: `Kae Mills`,
        leadTypes: [`pest_control`],
        phone: `(936) 499-0358`,
        city: `Little Elm`,
        state: `TX`,
        description: `recommendations on pest control? i want to keep every insect and critter away 8 m`
    },
    {
        id: `1776`,
        author: `Corey Simmons`,
        leadTypes: [`pest_control`],
        phone: `(414) 292-7230`,
        city: `Grand Prairie`,
        state: `TX`,
        description: `looking for recommendations on pest control. are they helpful with mosquitoes and spiders? how much? 1 6 d`
    },
    {
        id: `1826`,
        author: `Susan Bernard`,
        leadTypes: [`pest_control`],
        phone: `(972) 359-0777`,
        city: `Allen`,
        state: `TX`,
        description: `🟩🩵🟫 i need only a perimeter spray for pests, [ants, bugs, roaches, mites, etc.... ] so, just the outside of the house. but, i have an elderly cat, 14+ years old, has mild asthma.... that's why they can't spray inside - i don't want that! does anyone know of a person/company who cou…`
    },
    {
        id: `1906`,
        author: `Sherry Wells`,
        leadTypes: [`pest_control`],
        phone: `(469) 595-9570`,
        city: `Cedar Hill`,
        state: `TX`,
        description: `hello, i need an exterminator please!! i have about 4 cicada killer nest in my yard right by the front door. they are not attacking they are just so intimidating. also, i hav a wasp nest on my porch😳 please … 2 10 d`
    },
    {
        id: `1912`,
        author: `Sharon Sigler`,
        leadTypes: [`pest_control`],
        phone: `(405) 471-9304`,
        city: `Rockwall`,
        state: `TX`,
        description: `have any on inside window sill think they are pharaoh ants. i sprayed but new ones today. need name of reliable pest control inside only do not want yard sprayed 1 7 s`
    },
    {
        id: `1998`,
        author: `Linda Maurer`,
        leadTypes: [`pest_control`],
        phone: `(817) 793-6944`,
        city: `Allen`,
        state: `TX`,
        description: `i'm in allen tx. …i thought i was having a bee problem in one of my squirrel homes in one of my oak trees. well, now i know i do !!!! i need someone on here that does a bee removal asap!!! i will post a picture soon!!`
    },
    {
        id: `1996`,
        author: `Steve Bright`,
        leadTypes: [`pest_control`],
        phone: `(817) 360-2828`,
        city: `Bedford`,
        state: `TX`,
        description: `would someone please recommend an exterminator service. it appears that i have tiny spiders that are causing damage underneath my kitchen cabinets near the strip lights. 5 m`
    },
    {
        id: `1994`,
        author: `Stephanie Davila`,
        leadTypes: [`pest_control`],
        phone: `(469) 930-8090`,
        city: `Dallas`,
        state: `TX`,
        description: `anybody know of a good pest control service? i’ve been dealing with roaches for years at my house and i’ve hired a company before they had been coming for months but they never went away. so i need someone that know someone recommended 💯 guarant… 5 21 e`
    },
    {
        id: `2172`,
        author: `Comfort Denis`,
        leadTypes: [`pest_control`],
        phone: `(845) 765-0943`,
        city: `Prosper`,
        state: `TX`,
        description: `hi neighbors! does anyone have a recommendation for a reliable pest control service that offers one-time,safe treatments. 4 b beverly vinyard`
    },
    {
        id: `2268`,
        author: `Marlene Sandoval`,
        leadTypes: [`pest_control`],
        phone: `(972) 854-1299`,
        city: `Dallas`,
        state: `TX`,
        description: `is anyone else dealing with ticks? its so bad at my house.. wynnewood area… anyone know who can help, ive tried everything 2 10 r`
    },
    {
        id: `2277`,
        author: `Alexa Sofia`,
        leadTypes: [`pest_control`],
        phone: `(713) 625-9976`,
        city: `Dallas`,
        state: `TX`,
        description: `hi yall. can anyone recommend pest control to spray my mom’s house and yard? mosquitos, spiders, etc. so general spray would be great. tia!! zip code 75218 2 15 k`
    }
];

function buildBadges(types = []) {
    const palette = [
        {
            text: "#25f4ff",
            border: "#087a91",
            background: "#08263a"
        },
        {
            text: "#ff45db",
            border: "#7a2372",
            background: "#2b1233"
        },
        {
            text: "#b8ff3d",
            border: "#5a7f20",
            background: "#182714"
        }
    ];

    return types.map((type, index) => {
        const color = palette[index % palette.length];

        return `
            <span
                style="
                    display:inline-block;
                    margin:0 6px 6px 0;
                    padding:5px 10px;
                    color:${color.text};
                    background:${color.background};
                    border:1px solid ${color.border};
                    border-radius:999px;
                    font-size:10px;
                    line-height:1.2;
                    font-weight:800;
                    letter-spacing:.03em;
                    text-transform:uppercase;
                    white-space:nowrap;
                "
            >
                ${escapeHtml(type.replaceAll("_", " "))}
            </span>
        `;
    }).join("");
}

function buildPhone(phone = "") {
    const href = phoneHref(phone);

    if (!href) {
        return `
            <span style="color:#94a3c6;">
                ${escapeHtml(phone || "Not provided")}
            </span>
        `;
    }

    return `
        <a
            href="${escapeHtml(href)}"
            style="
                color:#ff45db;
                text-decoration:none;
                font-weight:800;
                white-space:nowrap;
            "
        >
            ${escapeHtml(phone)}
        </a>
    `;
}

function buildLocation(city = "", state = "") {
    const location = [city, state].filter(Boolean).join(", ");

    if (!location) {
        return "";
    }

    return `
        <div
            style="
                margin-top:6px;
                color:#8fa0c2;
                font-size:10px;
                line-height:1.35;
            "
        >
            ${escapeHtml(location)}
        </div>
    `;
}

function buildRows() {
    return leads.map((lead, index) => {
        const background = index % 2 === 0 ? "#0a1024" : "#10182e";

        return `
            <tr>
                <td
                    style="
                        width:50px;
                        padding:14px 8px;
                        color:#b8ff3d;
                        background:${background};
                        border-bottom:1px solid #202a49;
                        vertical-align:top;
                        font-family:Consolas,Monaco,monospace;
                        font-size:13px;
                        font-weight:800;
                    "
                >
                    ${escapeHtml(lead.id)}
                </td>

                <td
                    style="
                        width:130px;
                        padding:14px 8px;
                        color:#ffffff;
                        background:${background};
                        border-bottom:1px solid #202a49;
                        vertical-align:top;
                        font-size:12px;
                        line-height:1.45;
                        font-weight:700;
                    "
                >
                    ${escapeHtml(lead.author)}
                </td>

                <td
                    style="
                        width:165px;
                        padding:14px 8px;
                        color:#ffffff;
                        background:${background};
                        border-bottom:1px solid #202a49;
                        vertical-align:top;
                        font-size:12px;
                        line-height:1.45;
                    "
                >
                    ${buildBadges(lead.leadTypes)}
                </td>

                <td
                    style="
                        width:125px;
                        padding:14px 8px;
                        color:#ff45db;
                        background:${background};
                        border-bottom:1px solid #202a49;
                        vertical-align:top;
                        font-size:12px;
                        line-height:1.45;
                    "
                >
                    ${buildPhone(lead.phone)}
                    ${buildLocation(lead.city, lead.state)}
                </td>

                <td
                    style="
                        padding:14px 10px;
                        color:#f5f7ff;
                        background:${background};
                        border-bottom:1px solid #202a49;
                        vertical-align:top;
                        font-size:13px;
                        line-height:1.58;
                    "
                >
                    ${escapeHtml(lead.description)}
                </td>
            </tr>
        `;
    }).join("");
}

const leadReportHtml = `
    <table
        role="presentation"
        width="100%"
        cellspacing="0"
        cellpadding="0"
        border="0"
        style="
            width:100%;
            margin:0 0 30px 0;
            border-collapse:separate;
            border-spacing:0;
            background:#050816;
            border:1px solid #0c6172;
            border-radius:16px;
            overflow:hidden;
            font-family:Verdana,Arial,Helvetica,sans-serif;
        "
    >
        <tr>
            <td
                style="
                    padding:28px 30px;
                    background:#0a1024;
                    border-bottom:1px solid #0c6172;
                "
            >
                <div
                    style="
                        margin:0 0 12px 0;
                        color:#25f4ff;
                        font-size:11px;
                        font-weight:800;
                        letter-spacing:2.4px;
                        text-transform:uppercase;
                    "
                >
                    Clubhouse Links • Community Demand Intelligence
                </div>

                <div
                    style="
                        margin:0 0 22px 0;
                        color:#f7f8ff;
                        font-size:38px;
                        line-height:1.08;
                        font-weight:800;
                        letter-spacing:-1.5px;
                    "
                >
                    Clubhous Links
                    <span style="color:#ff3bd4;">
                        Possible Leads
                    </span>
                    Report
                </div>

                <table
                    role="presentation"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="
                        border-collapse:separate;
                        border-spacing:10px 0;
                        margin-left:-10px;
                    "
                >
                    <tr>
                        <td
                            style="
                                min-width:145px;
                                padding:11px 14px;
                                background:#14213d;
                                border:1px solid #2b395a;
                                border-radius:9px;
                            "
                        >
                            <div
                                style="
                                    color:#98a5c4;
                                    font-size:9px;
                                    font-weight:800;
                                    letter-spacing:1.4px;
                                    text-transform:uppercase;
                                "
                            >
                                Report Date
                            </div>

                            <div
                                style="
                                    margin-top:4px;
                                    color:#ffffff;
                                    font-size:13px;
                                    font-weight:800;
                                "
                            >
                                July 13, 2026
                            </div>
                        </td>

                        <td
                            style="
                                min-width:105px;
                                padding:11px 14px;
                                background:#14213d;
                                border:1px solid #2b395a;
                                border-radius:9px;
                            "
                        >
                            <div
                                style="
                                    color:#98a5c4;
                                    font-size:9px;
                                    font-weight:800;
                                    letter-spacing:1.4px;
                                    text-transform:uppercase;
                                "
                            >
                                Lead Count
                            </div>

                            <div
                                style="
                                    margin-top:4px;
                                    color:#ffffff;
                                    font-size:13px;
                                    font-weight:800;
                                "
                            >
                                ${leads.length}
                            </div>
                        </td>

                        <td
                            style="
                                min-width:145px;
                                padding:11px 14px;
                                background:#14213d;
                                border:1px solid #2b395a;
                                border-radius:9px;
                            "
                        >
                            <div
                                style="
                                    color:#98a5c4;
                                    font-size:9px;
                                    font-weight:800;
                                    letter-spacing:1.4px;
                                    text-transform:uppercase;
                                "
                            >
                                Prepared By
                            </div>

                            <div
                                style="
                                    margin-top:4px;
                                    color:#ffffff;
                                    font-size:13px;
                                    font-weight:800;
                                "
                            >
                                Evan Ligon
                            </div>
                        </td>

                        <td
                            style="
                                min-width:145px;
                                padding:11px 14px;
                                background:#14213d;
                                border:1px solid #2b395a;
                                border-radius:9px;
                            "
                        >
                            <div
                                style="
                                    color:#98a5c4;
                                    font-size:9px;
                                    font-weight:800;
                                    letter-spacing:1.4px;
                                    text-transform:uppercase;
                                "
                            >
                                Phone
                            </div>

                            <div style="margin-top:4px;">
                                <a
                                    href="tel:+12145489175"
                                    style="
                                        color:#25f4ff;
                                        text-decoration:none;
                                        font-size:13px;
                                        font-weight:800;
                                    "
                                >
                                    214-548-9175
                                </a>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <tr>
            <td
                style="
                    padding:18px 0 0 0;
                    background:#050816;
                "
            >
                <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="
                        width:100%;
                        border-collapse:collapse;
                        background:#050816;
                    "
                >
                    <tr>
                        <th
                            style="
                                width:50px;
                                padding:12px 8px;
                                color:#25f4ff;
                                background:#080e20;
                                border-top:1px solid #0c6172;
                                border-bottom:1px solid #0c6172;
                                text-align:left;
                                font-size:10px;
                                letter-spacing:1.2px;
                                text-transform:uppercase;
                            "
                        >
                            ID
                        </th>

                        <th
                            style="
                                width:130px;
                                padding:12px 8px;
                                color:#25f4ff;
                                background:#080e20;
                                border-top:1px solid #0c6172;
                                border-bottom:1px solid #0c6172;
                                text-align:left;
                                font-size:10px;
                                letter-spacing:1.2px;
                                text-transform:uppercase;
                            "
                        >
                            Name
                        </th>

                        <th
                            style="
                                width:165px;
                                padding:12px 8px;
                                color:#25f4ff;
                                background:#080e20;
                                border-top:1px solid #0c6172;
                                border-bottom:1px solid #0c6172;
                                text-align:left;
                                font-size:10px;
                                letter-spacing:1.2px;
                                text-transform:uppercase;
                            "
                        >
                            Lead Type
                        </th>

                        <th
                            style="
                                width:125px;
                                padding:12px 8px;
                                color:#25f4ff;
                                background:#080e20;
                                border-top:1px solid #0c6172;
                                border-bottom:1px solid #0c6172;
                                text-align:left;
                                font-size:10px;
                                letter-spacing:1.2px;
                                text-transform:uppercase;
                            "
                        >
                            First Phone
                        </th>

                        <th
                            style="
                                padding:12px 10px;
                                color:#25f4ff;
                                background:#080e20;
                                border-top:1px solid #0c6172;
                                border-bottom:1px solid #0c6172;
                                text-align:left;
                                font-size:10px;
                                letter-spacing:1.2px;
                                text-transform:uppercase;
                            "
                        >
                            Description
                        </th>
                    </tr>

                    ${buildRows()}
                </table>
            </td>
        </tr>

        <tr>
            <td
                style="
                    padding:14px 18px;
                    color:#98a5c4;
                    background:#080e20;
                    border-top:1px solid #202a49;
                    font-size:10px;
                    text-align:right;
                "
            >
                Clubhouse Links •
                <a
                    href="https://www.clubhouselinks.com"
                    style="
                        color:#25f4ff;
                        text-decoration:none;
                    "
                >
                    www.ClubhouseLinks.com
                </a>
            </td>
        </tr>
    </table>
`;

module.exports = leadReportHtml;
