/**
 * Email-safe neo-punk Nextdoor roofing leads report.
 *
 * Import:
 *   const rooferLeadReportHtml = require("./rooferLeadReportHtml");
 *
 * Insert above the greeting in zeptoscript.js:
 *   ${rooferLeadReportHtml}
 *
 * Uses the roofing CSV columns:
 *   author      -> Name
 *   city/state  -> Location
 *   phone       -> First Phone
 *   lead_type   -> Lead badges
 *   description -> Homeowner request
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
        id: "2306",
        author: "Wanda Pope",
        leadTypes: ["roofer"],
        phone: "(972) 225-3284",
        city: "Dallas",
        state: "TX",
        description: "hello does anyone know of a roof contractor to fix a leak the correct way. i don't have much money to pay. send me a message plz."
    },
    {
        id: "2305",
        author: "Claudia Amaro",
        leadTypes: ["roofer"],
        phone: "(214) 534-5838",
        city: "Dallas",
        state: "TX",
        description: "i’m looking for someone to repair the roof, at a good price! 13 9 chats"
    },
    {
        id: "2304",
        author: "Stephen Spiro",
        leadTypes: ["roofer"],
        phone: "(415) 387-5909",
        city: "Dallas",
        state: "TX",
        description: "hi, looking for an exterior design/color specialist who could help with a color scheme for house (shingles, siding, trim, painted brickwork etc). any recommendations would be gratefully received. thanks! happy 4th!"
    },
    {
        id: "2266",
        author: "Michelle Comeaux",
        leadTypes: ["roofer"],
        phone: "(972) 741-5176",
        city: "Waxahachie",
        state: "TX",
        description: "looking for a roofer that can replace a couple shingles and fix a few others that are loose. i don’t need a whole roof"
    },
    {
        id: "2264",
        author: "Jessie Chen",
        leadTypes: ["roofer"],
        phone: "(214) 304-4536",
        city: "Frisco",
        state: "TX",
        description: "we are looking for someone to help us clean our gutters, thanks! two story house. frisco. 3 9 marco villalpando rosas"
    },
    {
        id: "2241",
        author: "Paula Micka",
        leadTypes: ["roofer"],
        phone: "(410) 730-8489",
        city: "Columbia",
        state: "MD",
        description: "roofer recommendations ? 3 17 richard ofwono"
    },
    {
        id: "2232",
        author: "Christine Brim",
        leadTypes: ["roofer"],
        phone: "(202) 379-6776",
        city: "Fairfax",
        state: "MD",
        description: "i need gutters cleaned - 6\" wide gutters on both sides of house, carport and porch addition. they were replaced last year. recommendations? i went with the company that installed them last year. they beat competitive pricing."
    },
    {
        id: "2190",
        author: "David Ramirez",
        leadTypes: ["roofer"],
        phone: "(214) 434-1807",
        city: "Melissa",
        state: "TX",
        description: "actively looking for a reliable and reasonably priced contractor. i need help with: • installing gutters • laying gravel infill and building/installing paver walkways i’m looking for someone who does quality work, is dependable, and offers fair pricing. if you’ve p… 5 9 e"
    },
    {
        id: "2180",
        author: "Walid Daniel",
        leadTypes: ["roofer"],
        phone: "(972) 562-7214",
        city: "Mckinney",
        state: "TX",
        description: "hi folks, my 6’ wooden fence, overhead garage door and side panels need staining due to weather related discoloration, needless to say interested only in free lancer. flexible on start- up time frame. any cred… 3 5 j"
    },
    {
        id: "2071",
        author: "Tom Ballinger",
        leadTypes: ["roofer"],
        phone: "(214) 548-7307",
        city: "Frisco",
        state: "TX",
        description: "looking for a roofer recomendation, our usual roofer hasnt answered multiple calls, so i need to find a new one. need a roof repair."
    },
    {
        id: "2070",
        author: "Nicole Jones",
        leadTypes: ["roofer"],
        phone: "(214) 529-1250",
        city: "Sanger",
        state: "TX",
        description: "does anyone have a roofer they can recommend? and what do you know about summit solutions, roofing, and construction?"
    },
    {
        id: "2068",
        author: "Justin Henry",
        leadTypes: ["roofer"],
        phone: "(805) 302-4484",
        city: "Savannah",
        state: "TX",
        description: "who wants to go hop on a roof for me and see if it needs replacing today?? pv"
    },
    {
        id: "2052",
        author: "Marie Zwickert",
        leadTypes: ["roofer"],
        phone: "(410) 357-5206",
        city: "Monkton",
        state: "MD",
        description: "im looking for a reputable roofer to replace a few shingles on my roof and not the entire roof. recommendations appreciated. i live in monkton."
    },
    {
        id: "2051",
        author: "Vince Williams",
        leadTypes: ["roofer"],
        phone: "(302) 312-5478",
        city: "Silver Spring",
        state: "MD",
        description: "neighbors i need a recommendation for a reliable trustworthy roofing company that charges resonable prices. someone that you have actually used for a new roof! 5 33 c"
    },
    {
        id: "2050",
        author: "Gail Scott",
        leadTypes: ["roofer"],
        phone: "(443) 910-7777",
        city: "Street",
        state: "MD",
        description: "does anybody have any recommendations on reasonably priced gutter cleaning service? looking for someone who services street/ darlington area 3 12 b"
    },
    {
        id: "2049",
        author: "Grace Pakkianathan",
        leadTypes: ["roofer"],
        phone: "(301) 931-1318",
        city: "Leesburg",
        state: "MD",
        description: "i’m looking for someone to replace the roof, with replacing wood, underlayment and shingles on two sheds."
    },
    {
        id: "2048",
        author: "Christopher Custis",
        leadTypes: ["roofer"],
        phone: "(240) 295-1209",
        city: "Bowie",
        state: "MD",
        description: "looking for someone to re attach this flashing and about 20 panels. @"
    },
    {
        id: "2047",
        author: "Cathy Fleming",
        leadTypes: ["roofer"],
        phone: "(410) 695-1880",
        city: "Gambrills",
        state: "MD",
        description: "the roof on my shed was caved in during winter’s snow storms. i need estimates on repair"
    },
    {
        id: "2046",
        author: "Joel Oresky",
        leadTypes: ["roofer"],
        phone: "(301) 622-2928",
        city: "Cedar Tree",
        state: "MD",
        description: "happy sunday everyone :) looking for a recommendation on a company or contractor that can provide a free estimate on a new roof. any suggestions are greatly appreciated. thanks, and have a wonderful day!"
    },
    {
        id: "2045",
        author: "Andrea Lewis",
        leadTypes: ["roofer"],
        phone: "(301) 592-7809",
        city: "Columbia",
        state: "MD",
        description: "hi neighbors! proper diagnosis needed for gutter/downspout clog. any recs for a company that can help? i know it’s busy season for roofs and gutters, but i’m hoping someone would be willing to fit me in soon. wate…"
    },
    {
        id: "2043",
        author: "Yaniv Asayag",
        leadTypes: ["roofer"],
        phone: "(240) 472-1767",
        city: "Beltsville",
        state: "MD",
        description: "need roofing company i’m a contractor 4 10 rob m."
    },
    {
        id: "2042",
        author: "David Bodey",
        leadTypes: ["roofer"],
        phone: "(410) 822-5933",
        city: "Easton",
        state: "MD",
        description: "recommendations for reliable roofer?"
    },
    {
        id: "2033",
        author: "Lakia Kenan",
        leadTypes: ["roofer"],
        phone: "(240) 304-0619",
        city: "Bowie",
        state: "MD",
        description: "lookimg for recommendations for companies that can fix a soft spot on my bathroom ceiling. there is no water leaking from it, but it makes a hole when you touch it. the attic is above the bathroom. 5 16 s"
    },
    {
        id: "2003",
        author: "Glennis Hogan",
        leadTypes: ["roofer"],
        phone: "(940) 368-5373",
        city: "Denton",
        state: "TX",
        description: "i have seen in the past some posts about gutter cleaning offered. anyone know what company or who does gutter cleaning and cleans the downspouts also along with the gutters. i have very old gutters and do not plan on replacing them as may be moving in a couple years…"
    },
    {
        id: "1978",
        author: "Nikki Zampino",
        leadTypes: ["roofer"],
        phone: "(214) 544-8733",
        city: "Fairview",
        state: "TX",
        description: "looking for a roofer to patch a small hole 6 2 sohail monshizadeh"
    },
    {
        id: "1976",
        author: "Emmanuel Boateng",
        leadTypes: ["roofer"],
        phone: "(614) 806-9230",
        city: "Argyle",
        state: "TX",
        description: "need a roofer to repair/replace broken flat vent, secure loose shingles, and seal all fasteners on top side of the roof with proper weather sealant. someone that knows what he’s doing that won’t break my pockets! seems like a simple enough job. i hope"
    },
    {
        id: "1971",
        author: "Beth Hallett",
        leadTypes: ["roofer"],
        phone: "(972) 345-3134",
        city: "Frisco",
        state: "TX",
        description: "i'm looking for recommendations for someone who can do some shingle repair/replacement on my roof. to be upfront, i already know my roof needs to be replaced, but replacing it is not something i'm able to do right now. at this time, i'm only looking for reasonable repairs to address the immediate …"
    },
    {
        id: "1969",
        author: "Nakesha Newbury",
        leadTypes: ["roofer"],
        phone: "(315) 491-2678",
        city: "Red Oak",
        state: "TX",
        description: "i have limited space but i want to extend covered roof area and have a screen protection for bugs. suggestions? 5 6 m melissa vh"
    },
    {
        id: "1953",
        author: "Mary Davenport",
        leadTypes: ["roofer"],
        phone: "(908) 782-2914",
        city: "Denton",
        state: "TX",
        description: "hello, i’m looking for a roofer or handyman that can repair my roof. i know i probably need a new roof, but looking for just a repair for a leak at the moment. it is a simple asphalt shingle roof on a small home. so many companies out there and i am overwhelmed. thank… 4 18 k"
    },
    {
        id: "1952",
        author: "Jason North",
        leadTypes: ["roofer"],
        phone: "(817) 779-2944",
        city: "Arlington",
        state: "TX",
        description: "was quoted 32k for new roof install.. …this reasonable or high in cost?... there is also a 20x20 detached garage under the trees, that will be reroofed also.. adding up to 3200sq foot roofing needed, and metal shingle, composite grade"
    },
    {
        id: "1951",
        author: "Carmen Carr",
        leadTypes: ["roofer"],
        phone: "(817) 655-2730",
        city: "Arlington",
        state: "TX",
        description: "i need some repairs on my roof, can someone recommend a person who can do it, thanks."
    },
    {
        id: "1949",
        author: "Brent Aldon",
        leadTypes: ["roofer"],
        phone: "(310) 848-5222",
        city: "Dallas",
        state: "TX",
        description: "any recommendations on a general contractor that can do all of the following. we had a leak from our attic that trickled down to our second floor bedroom and the primary bedroom on the ground floor. luckily we caught it on time but there’s still significant damages. - replace …"
    },
    {
        id: "1948",
        author: "Karina Bray",
        leadTypes: ["roofer"],
        phone: "(214) 455-1439",
        city: "Dallas",
        state: "TX",
        description: "does anyone know anyone that can repair/install a new gutter?"
    },
    {
        id: "1947",
        author: "Lindsay Burton",
        leadTypes: ["roofer"],
        phone: "(678) 492-2646",
        city: "Grapevine",
        state: "TX",
        description: "looking for roofer recommendations not from roofing companies, but actual people on here. or even the ones to stay away from. thanks in advance!"
    },
    {
        id: "1946",
        author: "Tammy Hyder",
        leadTypes: ["roofer"],
        phone: "(817) 744-0166",
        city: "Arlington",
        state: "TX",
        description: "iso a roofer i need someone that’s reasonable and not trying to get over and over charge. serious inquiries only. 6 27 a"
    },
    {
        id: "1943",
        author: "Sally Davis",
        leadTypes: ["roofer"],
        phone: "(817) 675-4743",
        city: "Granbury",
        state: "TX",
        description: "i’m looking for a reasonable roof repair company. if anyone has a trusted roofer i would appreciate the input. thank you. 1 24 a ar h."
    },
    {
        id: "1941",
        author: "James Johnson",
        leadTypes: ["roofer"],
        phone: "(682) 583-6055",
        city: "Arlington",
        state: "TX",
        description: "gutter company recommendations who also do soffit and fascia board repair"
    },
    {
        id: "1939",
        author: "Lisa Hughes",
        leadTypes: ["roofer"],
        phone: "(817) 929-8590",
        city: "Euless",
        state: "TX",
        description: "any good recommendations for gutter cleaning in the area. reasonably priced? 5 13 k"
    },
    {
        id: "1938",
        author: "Linda Jeffries",
        leadTypes: ["roofer"],
        phone: "(214) 333-9767",
        city: "Dallas",
        state: "TX",
        description: "looking for recommendations on gutter repair. 5 2 r"
    },
    {
        id: "1876",
        author: "Karen Farrington",
        leadTypes: ["roofer"],
        phone: "(443) 975-1176",
        city: "Falls Church",
        state: "MD",
        description: "handyman-roof, had 3 shingles blown off my roof & need to have them put back on soon. thanks for your response & i am available today."
    },
    {
        id: "1875",
        author: "Konstantin Milman",
        leadTypes: ["roofer"],
        phone: "(410) 517-2277",
        city: "Owings Mills",
        state: "MD",
        description: "good morning to all, looking for a referal from your personal experince for a reputable roof repair company. need to repair a small area, not to replace the whole roof. thank you"
    },
    {
        id: "1874",
        author: "Dan Ali",
        leadTypes: ["roofer"],
        phone: "(205) 441-3692",
        city: "Gainesville",
        state: "MD",
        description: "hi everyone , during the storm tonight i noticed few of my roof shingles blew off . need a roof repair recommendation with reasonable pricing and fast service - please recommend"
    },
    {
        id: "1873",
        author: "Jeromy Vojacek",
        leadTypes: ["roofer"],
        phone: "(740) 408-6139",
        city: "Lower Hanover",
        state: "MD",
        description: "i need someone to come fix a leak in my roof. i live near arundel mill mall."
    },
    {
        id: "1872",
        author: "Olivia Fexhter",
        leadTypes: ["roofer"],
        phone: "(202) 246-0619",
        city: "Potomac",
        state: "MD",
        description: "hi. does anyone know of a fair / reliable roof company that does repairs or can replace a hail damaged roof? any recommendations would be much appreciated. thanks. 1 34 b"
    },
    {
        id: "1871",
        author: "Adnan Riaz",
        leadTypes: ["roofer"],
        phone: "(703) 392-8482",
        city: "Centreville",
        state: "MD",
        description: "i need recommendations for roof/gutter or whoever can fix this. …ater comes down from the back of the gutters (i think), there is a gap between the gutter and the roof if you zoom in the pictures. not sure if that is the issue. i had the gutters checked before and… 2 21 a"
    },
    {
        id: "1870",
        author: "Tracy Moretti",
        leadTypes: ["roofer"],
        phone: "(301) 674-5055",
        city: "Frederick",
        state: "MD",
        description: "hello neighbors. looking for a soft wash from my roof any suggestions would be welcome and thank you for all of the recommendations for the crabs! 1 6 d"
    },
    {
        id: "1869",
        author: "Allie Brown",
        leadTypes: ["roofer"],
        phone: "(804) 248-9433",
        city: "Fairfax Station",
        state: "MD",
        description: "does anyone have recommendations for reliable home repair services? …ote that. i'm looking for someone to replace porch steps and handrails, someone to repair part of the roof on our tool shed and build a ramp to it. last, i need someone who cleans gutters. thank you!"
    },
    {
        id: "1868",
        author: "Abu Sarkar",
        leadTypes: ["roofer"],
        phone: "Not provided",
        city: "Alexandria",
        state: "MD",
        description: "hello neighbor, it a abu again. need help/recommendation for a roof leak. water is dripping out from the ceiling. i know where the issue is but need an affordable person who can fix it. thanks everyone!!"
    },
    {
        id: "1837",
        author: "Warren Chase",
        leadTypes: ["roofer"],
        phone: "(214) 477-8404",
        city: "Garland",
        state: "TX",
        description: "i have a 2nd floor deck over a 1st floor patio. …rs old. there is a water leak near the french-door entrance to deck. the railing system has hail damage, is sagging, and needs repair/replacement. i'm looking for a deck installation/repair compa…"
    },
    {
        id: "1835",
        author: "Sue Wyll",
        leadTypes: ["roofer"],
        phone: "(214) 986-3559",
        city: "Lucas",
        state: "TX",
        description: "looking for someone to clean out my gutters. who do u recommend?"
    },
    {
        id: "1831",
        author: "Beth Hallett",
        leadTypes: ["roofer"],
        phone: "(972) 345-3134",
        city: "Frisco",
        state: "TX",
        description: "i'm looking for recommendations for someone who can do some shingle repair/replacement on my roof. …roof needs to be replaced, but replacing it is not something i'm able to do right now. at this time, i'm only looking for reasonable repairs to address the immediate issues. i'd appreciate recommend…"
    },
    {
        id: "1830",
        author: "Richard Balling",
        leadTypes: ["roofer"],
        phone: "(469) 481-6986",
        city: "Frisco",
        state: "TX",
        description: "looking for a reasonable handyman. 7 5 e"
    },
    {
        id: "1827",
        author: "Carolyn Beall",
        leadTypes: ["roofer"],
        phone: "(214) 957-8671",
        city: "Fairview",
        state: "TX",
        description: "looking for recommendations for someone to clean gutters"
    },
    {
        id: "1823",
        author: "David Ramirez",
        leadTypes: ["roofer"],
        phone: "(214) 434-1807",
        city: "Melissa",
        state: "TX",
        description: "looking for recommendations for a reliable and reasonably priced contractor/handyman in the area. i need help with: • installing gutters • installing french drains for drainage issues • laying gravel infill • building/installing paver walkways i’m looking for someone who does quality work, is dep… 4 5 d"
    },
    {
        id: "1822",
        author: "Karen Hopkins",
        leadTypes: ["roofer"],
        phone: "(214) 704-6031",
        city: "McKinney",
        state: "TX",
        description: "best priced and best roofing, siding & facia guy in dfw?? recommendations please :) 3 37 e eddie de leon"
    },
    {
        id: "1820",
        author: "Atul Jain",
        leadTypes: ["roofer"],
        phone: "Not provided",
        city: "Mckinney",
        state: "TX",
        description: "i am looking for a good plumber who can check the leak under drywall ceiling and provide reasonable estimates to complete fix. 7 12 a"
    },
    {
        id: "1819",
        author: "Sonia Russ",
        leadTypes: ["roofer"],
        phone: "(760) 805-0692",
        city: "Fairview",
        state: "TX",
        description: "can someone recommend a good and affortable gutter business to replace my gutters? thank you. 6 12 r rachel e."
    },
    {
        id: "1817",
        author: "Lorraine Fletcher",
        leadTypes: ["roofer"],
        phone: "(214) 724-0115",
        city: "Euless",
        state: "TX",
        description: "retaining wall behind house shows large cracks, loss of mortar, etc. does anyone know who fixes this or can point & tuck? 5 8 a"
    },
    {
        id: "1749",
        author: "Greg Carleton",
        leadTypes: ["roofer"],
        phone: "(949) 654-0371",
        city: "Dallas",
        state: "TX",
        description: "has anyone else gotten constant offers to replace your roof? i almost fell for a scam and thought i would share it. they sent a very young looking pretty woman offering a free roof inspection. they did the inspection and said i needed a new roof and they would … 3 15 e rayemonde pry"
    },
    {
        id: "1747",
        author: "Todd Taylor",
        leadTypes: ["roofer"],
        phone: "(972) 345-9809",
        city: "Forney",
        state: "TX",
        description: "still looking for an experienced flashing guy, familiar with 12/12 roof pitches, with heavy runoff. thanks dm pls."
    },
    {
        id: "1687",
        author: "Karen Hopkins",
        leadTypes: ["roofer"],
        phone: "(214) 704-6031",
        city: "McKinney",
        state: "TX",
        description: "best priced and best roofing, siding & facia guy in dfw?? recommendations please :) 3 37 c"
    },
    {
        id: "1684",
        author: "Cathy Wernli",
        leadTypes: ["roofer"],
        phone: "(214) 538-5484",
        city: "Allen",
        state: "TX",
        description: "any recommendations on having a roof extension and outdoor kitchen built. the picture is what i want the finished project to look like 13 10 n"
    },
    {
        id: "1680",
        author: "Tina Crisp",
        leadTypes: ["roofer"],
        phone: "(972) 365-6857",
        city: "Allen",
        state: "TX",
        description: "i need an engineer report to get approval by the city of mckinney to add a retaining wall and reattach the fence? can anyone refer me to a retaining wall structural engineer? tyia 2 4 m"
    },
    {
        id: "1642",
        author: "Karen Hopkins",
        leadTypes: ["roofer"],
        phone: "(214) 704-6031",
        city: "McKinney",
        state: "TX",
        description: "best priced and best roofing, siding & facia guy in dfw?? recommendations please :)"
    },
    {
        id: "1628",
        author: "Beth Hallett",
        leadTypes: ["roofer"],
        phone: "(972) 345-3134",
        city: "Frisco",
        state: "TX",
        description: "i'm looking for recommendations for someone who can do some shingle repair/replacement on my roof. …e, i'm only looking for reasonable repairs to address the immediate issues. i'd appreciate recommendations for honest contractors who are willing to make repairs without turning the visit into a high…"
    },
    {
        id: "1625",
        author: "Sonia Russ",
        leadTypes: ["roofer"],
        phone: "(760) 805-0692",
        city: "Fairview",
        state: "TX",
        description: "can someone recommend a good and affortable gutter business to replace my gutters? thank you."
    },
    {
        id: "1622",
        author: "Michelle Martineau",
        leadTypes: ["roofer"],
        phone: "Not provided",
        city: "Mckinney",
        state: "TX",
        description: "we are building a patio cover and would need help from structural engineer for plans. mckinney requires stamped plans from engineer. would anyone have a referral? 4 m"
    },
    {
        id: "1619",
        author: "Kimberly Stephens",
        leadTypes: ["roofer"],
        phone: "(864) 234-0396",
        city: "allen",
        state: "TX",
        description: "i have a broken window and need just that one pane replaced. does anyone know someone who can provide this service without trying to get me to replace all of my windows? thanks"
    },
    {
        id: "1618",
        author: "Cathy Wernli",
        leadTypes: ["roofer"],
        phone: "(214) 538-5484",
        city: "Allen",
        state: "TX",
        description: "any recommendations on having a roof extension and outdoor kitchen built. the picture is what i want the finished project to look like"
    },
    {
        id: "1614",
        author: "Shahed Khan",
        leadTypes: ["roofer"],
        phone: "(224) 805-1048",
        city: "Mckinney",
        state: "TX",
        description: "who can help fix this vent? 2 3 becky p."
    },
    {
        id: "1471",
        author: "David Ramirez",
        leadTypes: ["roofer"],
        phone: "(469) 556-8273",
        city: "Melissa",
        state: "TX",
        description: "does anyone have recommendations for someone who can give me a quote on gutters? please share any reliable contacts you have."
    },
    {
        id: "1470",
        author: "Melody Winchester",
        leadTypes: ["roofer"],
        phone: "(469) 766-0620",
        city: "Mckinney",
        state: "TX",
        description: "i need a recommendation for replacing the wood around my chimney. thanks!"
    },
    {
        id: "1444",
        author: "Fikre Degefu",
        leadTypes: ["roofer"],
        phone: "(443) 562-6868",
        city: "Silver Spring",
        state: "MD",
        description: "any recommendation for good roofer to fix a leaking roof 6 32 a"
    },
    {
        id: "1443",
        author: "Lynn Steckbeck",
        leadTypes: ["roofer"],
        phone: "(301) 776-3219",
        city: "Columbia",
        state: "MD",
        description: "looking for someone to clean my gutters and also my neighbors. thanks is advance"
    },
    {
        id: "1442",
        author: "Rosie Turlik",
        leadTypes: ["roofer"],
        phone: "(301) 975-0021",
        city: "Gaithersburg",
        state: "MD",
        description: "looking fair and honest roofer to replace our roof. don't want to spend a fortune so looking for competitive bid. #askaneighbor 4 28 jennifer edwards-ghartey"
    },
    {
        id: "1441",
        author: "Sangeeta Bhunia",
        leadTypes: ["roofer"],
        phone: "(410) 377-0084",
        city: "Baltimore",
        state: "MD",
        description: "update: i had some damage in the slate roof and underlayment that is all fixed. …ow i need someone who is skilled in plaster repair. any recommendations? who should i contact: a roofer or general contractor? do you have someone who you have directly worked with regarding similar p… 6 26 s"
    },
    {
        id: "1440",
        author: "Ola Omishore",
        leadTypes: ["roofer"],
        phone: "(443) 621-7483",
        city: "Baltimore",
        state: "MD",
        description: "hello, please i need someone to help repair leaking roof. please note repair , not replace the whole roof at the moment. thanks 5 19 m"
    },
    {
        id: "1439",
        author: "Jamel Malloy",
        leadTypes: ["roofer"],
        phone: "(301) 267-0208",
        city: "Upper Marlboro",
        state: "MD",
        description: "looking for a roofer in the bryans md 20616 area that can put back some trim on the side of the house . materials are already on site just need a labor price. need it done asap 1 12 c"
    },
    {
        id: "1418",
        author: "Elizabeth Reece",
        leadTypes: ["roofer"],
        phone: "(301) 588-5082",
        city: "Annandale",
        state: "MD",
        description: "something is determined to remove a metal (alluminum) siding panel from the side of a dolrmer on our roof. …are beginning to think it wants ants or termites in this third story elevation. what kind of contractor would be good at studying this problem on a sixty year old house? more an a nail needed. 703-…"
    },
    {
        id: "1389",
        author: "Joslin Dsouza",
        leadTypes: ["roofer"],
        phone: "(682) 552-3089",
        city: "McKinney",
        state: "TX",
        description: "need recommendations to come replace this vent cover and get the birds out of there. they’ve made a comfortable home and i need them out."
    },
    {
        id: "1383",
        author: "Yan Liu",
        leadTypes: ["roofer"],
        phone: "(972) 832-4712",
        city: "Mckinney",
        state: "TX",
        description: "needs for stucco patching, roof flashing, and window sealing. damage shown in picture. respond to me with quotes please."
    },
    {
        id: "1331",
        author: "Avis Fillingham",
        leadTypes: ["roofer"],
        phone: "(760) 702-2637",
        city: "Plano",
        state: "TX",
        description: "looking for gutter company recommendations. who is the best?"
    },
    {
        id: "1327",
        author: "Faith Stewart",
        leadTypes: ["roofer"],
        phone: "(469) 363-8275",
        city: "Duncanville",
        state: "TX",
        description: "hello i am looking for advise on how much are new roof would cost for a 1800sq house. i guess i am looking for an estimate. thank you and good day"
    },
    {
        id: "1313",
        author: "Tanikqa Brown",
        leadTypes: ["roofer"],
        phone: "(857) 231-0113",
        city: "Ashburn",
        state: "MD",
        description: "hi, i’m looking for a roofer/handyman in reston, va who can help install roof decking/sheathing plywood. looking for someone available this friday. 3 9 m michael g."
    },
    {
        id: "1308",
        author: "Takiyah Stewart",
        leadTypes: ["roofer"],
        phone: "(301) 890-1586",
        city: "Silver Spring",
        state: "MD",
        description: "good morning. anybody who can clean my gutters out for me ? i live in a townhome."
    },
    {
        id: "1307",
        author: "Jared Rawlings",
        leadTypes: ["roofer"],
        phone: "(785) 643-4350",
        city: "Daniels Park",
        state: "MD",
        description: "does anyone have a recommendation for a licensed professional who can replace a walk-in shower door? i currently have a sliding double-door, but it's too short and i want a door with more clearance so i don't have to duck when i get in. i also need someone who can recaulk the basin and tile/grout. an…"
    },
    {
        id: "1183",
        author: "John Betten",
        leadTypes: ["roofer"],
        phone: "(972) 727-9849",
        city: "Allen",
        state: "TX",
        description: "i’m looking for a qualified roofer or handyman to do a minor repair. a few ridge shingles have come off my roof. i have some identical new ones that can be used, assuming the old one is ruined. if you had anyone do a repair like this at a reasonable price, i would appr… 7 r"
    },
    {
        id: "1083",
        author: "Vickie Hall",
        leadTypes: ["roofer"],
        phone: "(972) 835-4375",
        city: "Rockwall",
        state: "TX",
        description: "looking for someone to put together a gazebo with metal roof. prefab. 13 x 11…"
    },
    {
        id: "1047",
        author: "Fred Brant",
        leadTypes: ["roofer"],
        phone: "(214) 726-1776",
        city: "Mckinney",
        state: "TX",
        description: "does anyone know of a licensed roofer that can replace my vent on the roof for my dryer ? 3 6 chats"
    },
    {
        id: "912",
        author: "Leroy Isreal",
        leadTypes: ["roofer"],
        phone: "(301) 384-1562",
        city: "Laurel",
        state: "MD",
        description: "Hi neighbors! I'm looking for a reliable, local roofer for a full replacement. Does anyone have someone they’ve used recently and truly trust? Bonus points if they are easy to communicate with and fair on pricing. Thank you!"
    },
    {
        id: "911",
        author: "Russell Hayer",
        leadTypes: ["roofer"],
        phone: "(202) 415-1003",
        city: "Bethesda",
        state: "MD",
        description: "Any recommendations for someone who can do copper roofing in Northwest DC would be greatly appreciated."
    },
    {
        id: "910",
        author: "Nancy SancheZ",
        leadTypes: ["roofer"],
        phone: "Not provided",
        city: "Bethesda",
        state: "MD",
        description: "Looking for recommendations for a licensed/insured roofer who can replace some gutters. This is a small job and I’m just looking for an individual rather than a big company. Thank you in and advance for any tips!"
    },
    {
        id: "909",
        author: "Najiya Shanaa",
        leadTypes: ["roofer"],
        phone: "(202) 234-6883",
        city: "Gaithersburg",
        state: "MD",
        description: "Hi all! I need a recommendation for a gutter and/or window cleaning company that is reliable and reasonably priced."
    },
    {
        id: "907",
        author: "Lisa Herrick",
        leadTypes: ["roofer"],
        phone: "(202) 641-5368",
        city: "Gaithersburg",
        state: "MD",
        description: "Hi all! I need a recommendation for a gutter and/or window cleaning company that is reliable and reasonably priced."
    },
    {
        id: "906",
        author: "Zemzem Mustefa",
        leadTypes: ["roofer", "lighting"],
        phone: "(202) 460-2422",
        city: "Columbia",
        state: "MD",
        description: "Looking for recommendation for a mason or handyman who can replace marble tile fireplace surround at reasonable price."
    },
    {
        id: "895",
        author: "Debra Oosterhof",
        leadTypes: ["roofer"],
        phone: "(972) 530-7770",
        city: "Allen",
        state: "TX",
        description: "Hey neighbors I’m looking for someone to inspect gutters and remove clogs if needed"
    },
    {
        id: "892",
        author: "Juan Contreras",
        leadTypes: ["roofer"],
        phone: "(469) 360-1811",
        city: "Allen",
        state: "TX",
        description: "Hey neighbors I’m looking for someone to inspect gutters and remove clogs if needed"
    },
    {
        id: "846",
        author: "Jennifer Hill",
        leadTypes: ["roofer"],
        phone: "(214) 288-2042",
        city: "The Colony",
        state: "TX",
        description: "Need a Trusted Roofer to just fix 10 shingles. Don’t need one to say I need to do whole roof. Who should I use?"
    },
    {
        id: "845",
        author: "Kristine Jenkins",
        leadTypes: ["roofer"],
        phone: "(903) 815-8237",
        city: "The Colony",
        state: "TX",
        description: "Need a Trusted Roofer to just fix 10 shingles. Don’t need one to say I need to do whole roof. Who should I use?"
    },
    {
        id: "844",
        author: "Wes Cade",
        leadTypes: ["handyman", "general_contractor", "roofer"],
        phone: "(469) 223-8078",
        city: "Melissa",
        state: "TX",
        description: "I need some help blowing off my roof and gutters. I also need help chain sawing several large limbs that have fallen."
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

const rooferLeadReportHtml = `
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
                    Roofing
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
                                July 14, 2026
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

module.exports = rooferLeadReportHtml;
