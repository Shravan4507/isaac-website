export interface ClubData {
  // Identity & Location
  id: string;
  username: string;
  clubName: string;
  institution: string;
  shortName: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  verified: boolean;
  estYear: string;

  // Visuals & About
  logo: string;
  banner: string;
  description: string;
  activities: string[];
  customActivity?: string;

  // Contacts
  clubEmail: string;
  address: string;
  zipCode: string;

  // Social handles/links
  website: string;
  instagram: string;
  linkedin: string;
  youtube: string;
  facebook: string;
  discord: string;
  github: string;

  // Representative info
  repFirstName: string;
  repMiddleName?: string;
  repLastName: string;
  repDesignation: string;
  repCustomDesignation?: string;
  repEmail: string;
  repPhone: string;
}

export const clubsData: any[] = [
  {
    id: "krittika-iitb",
    club: "Krittika",
    institution: "Indian Institute of Technology Bombay",
    shortName: "IIT Bombay",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    latitude: 19.135157,
    longitude: 72.91371,
    verified: true,
    website: "https://krittikaiitb.github.io/",
    instagram: "https://www.instagram.com/krittika.iitb",
    description: "Krittika is the Astronomy Club of IIT Bombay. We run observational stargazing, project mentorship, and collaborate on computation and astrophysics research."
  },
  {
    id: "cosmos-mitwpu",
    club: "Cosmos Astronomy Club",
    institution: "MIT World Peace University",
    shortName: "MIT-WPU",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    latitude: 18.518534,
    longitude: 73.814845,
    verified: true,
    website: "mailto:cosmos.astro-club@mitwpu.edu.in",
    instagram: "https://www.instagram.com/mitwpucosmos",
    description: "Student-led astronomy club operating its own observatory and ground station built by students. Uses a RASA 11” telescope and custom radio antennas."
  },
  {
    id: "niharika-iacs",
    club: "Niharika",
    institution: "Indian Association for the Cultivation of Science",
    shortName: "IACS",
    city: "Kolkata",
    state: "West Bengal",
    country: "India",
    latitude: 22.498453,
    longitude: 88.368075,
    verified: true,
    website: "https://iacs.res.in/niharika/events.html",
    instagram: "https://www.instagram.com/niharika_iacs",
    description: "Niharika conducts student discussion sessions, stargazing trips, public outreach events, and astrophotography sessions."
  },
  {
    id: "accretion-sai",
    club: "Accretion",
    institution: "Sai University",
    shortName: "Sai University",
    city: "Chennai",
    state: "Tamil Nadu",
    country: "India",
    latitude: 12.65407,
    longitude: 80.157747,
    verified: true,
    website: "mailto:astronomyclub@saiuniversity.edu.in",
    instagram: "https://www.instagram.com/the.accretion/",
    description: "An interdisciplinary astronomy club growing through small conversations, stargazing workshops, astrophotography, and monthly observation checklists."
  },
  {
    id: "orbitx-zcoer",
    club: "OrbitX",
    institution: "Zeal College of Engineering and Research",
    shortName: "ZCOER",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    latitude: 18.449349,
    longitude: 73.824922,
    verified: true,
    website: "mailto:president.orbitx@zealeducation.com",
    instagram: "",
    description: "OrbitX focuses on astronomy instrumentation, solar spot observation campaigns, and student project field trips to research centers like IUCAA and GMRT."
  },
  {
    id: "astrae-iisc",
    club: "Astrae",
    institution: "Indian Institute of Science",
    shortName: "IISc Bangalore",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    latitude: 13.019873,
    longitude: 77.566926,
    verified: true,
    website: "mailto:astrae@iisc.ac.in",
    instagram: "https://www.instagram.com/astrae.iisc",
    description: "Conducts regular night sky outings, solar observations, astrophotography workshops, lectures, and the annual Summer Project Expo."
  },
  {
    id: "seds-antariksh-vitc",
    club: "SEDS Antariksh",
    institution: "VIT Chennai",
    shortName: "VIT Chennai",
    city: "Chennai",
    state: "Tamil Nadu",
    country: "India",
    latitude: 12.841084,
    longitude: 80.154055,
    verified: true,
    website: "mailto:sedsantariksh@gmail.com",
    instagram: "https://www.instagram.com/seds_antariksh",
    description: "SEDS Antariksh is a student chapter working on aerospace technology upskilling and space engineering projects including CubeSats, CanSats, and robotics."
  },
  {
    id: "niser-astronomy-club",
    club: "NISER Astronomy Club",
    institution: "National Institute of Science Education and Research",
    shortName: "NISER",
    city: "Bhubaneswar",
    state: "Odisha",
    country: "India",
    latitude: 20.171582,
    longitude: 85.684376,
    verified: true,
    website: "https://astroclub-niser.github.io/",
    instagram: "https://www.instagram.com/astroclub_niser",
    description: "Runs KALPANA - a student observatory housing 11-inch and 8-inch telescopes. Host of the national astrophotography and astrocoding events."
  },
  {
    id: "kmc-physics-astronomy-club",
    club: "KMC Physics Astronomy Club",
    institution: "Kirori Mal College, University of Delhi",
    shortName: "Kirori Mal College",
    city: "Delhi",
    state: "Delhi",
    country: "India",
    latitude: 28.682736,
    longitude: 77.207686,
    verified: true,
    website: "mailto:kmcastroclub@gmail.com",
    instagram: "https://www.instagram.com/kmc_astroclub",
    description: "Developing a student horn antenna radio telescope for mapping Milky Way neutral hydrogen line (21cm). Partners outreach events with Nehru Planetarium."
  },
  {
    id: "physics-astronomy-club-iitr",
    club: "Physics and Astronomy Club",
    institution: "Indian Institute of Technology Roorkee",
    shortName: "IIT Roorkee",
    city: "Roorkee",
    state: "Uttarakhand",
    country: "India",
    latitude: 29.865733,
    longitude: 77.89021,
    verified: true,
    website: "https://paac.iitr.ac.in",
    instagram: "https://www.instagram.com/astro_iitr",
    description: "PaACIITR organizes skywatching campaigns, winter projects, inter-college physics research, and astronomy journal clubs."
  },
  {
    id: "antariksh-vit-pune",
    club: "Antariksh",
    institution: "Vishwakarma Institute of Technology",
    shortName: "VIT Pune",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    latitude: 18.463863,
    longitude: 73.868523,
    verified: true,
    website: "mailto:antairksh@vit.edu",
    instagram: "https://www.instagram.com/antarikshclubvi",
    description: "Vishwakarma Institute's astronomy club organizing stargazing, radio telescope projects, public astronomy outreach talks, and workshops since 2009."
  },
  {
    id: "spats-iitkgp",
    club: "Space Technology Students' Society (spAts)",
    institution: "Indian Institute of Technology Kharagpur",
    shortName: "IIT Kharagpur",
    city: "Kharagpur",
    state: "West Bengal",
    country: "India",
    latitude: 22.315723,
    longitude: 87.301249,
    verified: true,
    website: "https://www.spats.co.in/publication",
    instagram: "https://www.instagram.com/spats.nssc.iitkgp",
    description: "Official space sciences club under KC Space Technology Cell, ISRO coordinate point at IIT Kharagpur, and organizer of National Students' Space Challenge."
  }
]
