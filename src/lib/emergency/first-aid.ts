export type FirstAidGuide = {
  slug: string;
  title: string;
  summary: string;
  category: "cardiac" | "trauma" | "fire" | "other";
  warning?: string;
  steps: { heading: string; body: string }[];
};

export const FIRST_AID_GUIDES: FirstAidGuide[] = [
  {
    slug: "cpr-adult",
    title: "CPR — Adult",
    summary: "When an adult is unresponsive and not breathing normally.",
    category: "cardiac",
    warning:
      "Call emergency services first or send someone to call. Start CPR immediately if the person is not breathing or only gasping.",
    steps: [
      {
        heading: "1. Check responsiveness",
        body: "Tap their shoulders firmly and shout, \"Are you OK?\" If no response and breathing is absent or only gasping, begin CPR.",
      },
      {
        heading: "2. Position your hands",
        body: "Place the heel of one hand on the center of the chest (lower half of the breastbone). Place your other hand on top, interlace fingers, keep arms straight.",
      },
      {
        heading: "3. Compressions",
        body: "Push hard and fast: at least 2 inches (5 cm) deep, 100–120 per minute. Let the chest fully recoil between compressions. Tip: match the beat of \"Stayin' Alive\".",
      },
      {
        heading: "4. Rescue breaths (if trained)",
        body: "After 30 compressions: tilt head, lift chin, pinch nose, give 2 breaths (1 second each, watch for chest rise). If untrained, do compressions only.",
      },
      {
        heading: "5. Continue 30:2",
        body: "Keep cycling 30 compressions, 2 breaths until an AED arrives, the person responds, or trained help takes over.",
      },
      {
        heading: "6. Use an AED if available",
        body: "Turn it on and follow the spoken instructions. Continue CPR while pads are placed. Stand clear when prompted to shock.",
      },
    ],
  },
  {
    slug: "cpr-child",
    title: "CPR — Child & Infant",
    summary: "CPR for children (1–puberty) and infants (under 1 year).",
    category: "cardiac",
    warning:
      "If alone with a child/infant in cardiac arrest, do 2 minutes of CPR before calling emergency services.",
    steps: [
      {
        heading: "Child (1 to puberty)",
        body: "Use one or two hands on the center of the chest. Depth: about 2 inches (5 cm). Rate: 100–120/min. Cycles of 30 compressions to 2 breaths if alone, 15:2 if two rescuers.",
      },
      {
        heading: "Infant (under 1 year)",
        body: "Use two fingers in the center of the chest, just below the nipple line. Depth: about 1.5 inches (4 cm). Same rate of 100–120/min.",
      },
      {
        heading: "Rescue breaths for infant",
        body: "Cover the infant's mouth AND nose with your mouth. Give small puffs — just enough to see the chest rise.",
      },
      {
        heading: "Don't stop",
        body: "Continue until help arrives, the child responds, or you cannot physically continue.",
      },
    ],
  },
  {
    slug: "choking",
    title: "Choking (Heimlich Maneuver)",
    summary: "When someone cannot breathe, speak, or cough effectively.",
    category: "other",
    warning:
      "If the person can cough or speak, encourage them to keep coughing. Only intervene if they cannot.",
    steps: [
      {
        heading: "1. Confirm choking",
        body: "Ask, \"Are you choking?\" The universal sign is hands at the throat. If they can't speak or cough, act now.",
      },
      {
        heading: "2. Five back blows",
        body: "Stand to the side and behind. Lean them forward. Give 5 firm blows between the shoulder blades with the heel of your hand.",
      },
      {
        heading: "3. Five abdominal thrusts",
        body: "Stand behind, wrap arms around their waist. Make a fist just above the navel, grasp it with your other hand. Pull inward and upward 5 times sharply.",
      },
      {
        heading: "4. Alternate until cleared",
        body: "Keep alternating 5 back blows and 5 abdominal thrusts until the object is expelled or the person becomes unresponsive.",
      },
      {
        heading: "If they go unconscious",
        body: "Lower them carefully to the ground. Begin CPR. Each time you open the airway for breaths, look in the mouth and remove visible objects.",
      },
      {
        heading: "Infants under 1",
        body: "Do NOT do abdominal thrusts. Alternate 5 back blows (face down on your forearm) and 5 chest thrusts (face up, two fingers center of chest).",
      },
    ],
  },
  {
    slug: "bleeding",
    title: "Severe Bleeding",
    summary: "Heavy bleeding from a wound that won't stop on its own.",
    category: "trauma",
    warning:
      "Severe blood loss can be fatal within minutes. Call emergency services immediately.",
    steps: [
      {
        heading: "1. Protect yourself",
        body: "Wear gloves if available. Avoid contact with blood through cuts on your own hands.",
      },
      {
        heading: "2. Apply direct pressure",
        body: "Press firmly on the wound with a clean cloth, gauze, or even clothing. Do NOT remove a soaked cloth — add more on top.",
      },
      {
        heading: "3. Elevate if possible",
        body: "Raise the injured limb above heart level if there is no suspected fracture.",
      },
      {
        heading: "4. Apply a tourniquet (limb only)",
        body: "If bleeding from an arm or leg won't stop with pressure: place tourniquet 2–3 inches above the wound, NOT on a joint. Tighten until bleeding stops. Note the time.",
      },
      {
        heading: "5. Treat for shock",
        body: "Lay the person down. Cover them to keep warm. Do not give food or drink. Monitor breathing.",
      },
      {
        heading: "Never",
        body: "Never remove an impaled object — stabilize it in place with bulky dressings. Removing it can cause catastrophic bleeding.",
      },
    ],
  },
  {
    slug: "burns",
    title: "Burns",
    summary: "Thermal, chemical, or electrical burns.",
    category: "trauma",
    steps: [
      {
        heading: "1. Stop the burning",
        body: "Remove from the heat source. For chemical burns, brush off dry chemical, then rinse. For electrical, ensure power is off before touching the person.",
      },
      {
        heading: "2. Cool the burn",
        body: "Run cool (not cold, not iced) water over the burn for at least 10–20 minutes. Do NOT use ice — it causes further tissue damage.",
      },
      {
        heading: "3. Remove jewelry & loose clothing",
        body: "Carefully remove anything that could constrict as the area swells. Do NOT pull off clothing stuck to the burn.",
      },
      {
        heading: "4. Cover loosely",
        body: "Cover with cling film or a clean, non-fluffy cloth. Do NOT apply creams, butter, toothpaste, or ointments.",
      },
      {
        heading: "Call emergency services if",
        body: "Burn is larger than the person's palm, on face/hands/genitals/joints, looks white/charred/leathery, is from electricity or chemicals, or the person is a child or elderly.",
      },
    ],
  },
  {
    slug: "stroke-fast",
    title: "Stroke — FAST Check",
    summary: "Recognize a stroke quickly. Every minute counts.",
    category: "cardiac",
    warning:
      "If you suspect a stroke, call emergency services IMMEDIATELY. Note the time symptoms started — it determines treatment options.",
    steps: [
      {
        heading: "F — Face",
        body: "Ask the person to smile. Does one side of the face droop?",
      },
      {
        heading: "A — Arms",
        body: "Ask them to raise both arms. Does one drift downward, or are they unable to lift one?",
      },
      {
        heading: "S — Speech",
        body: "Ask them to repeat a simple phrase. Is speech slurred, strange, or absent?",
      },
      {
        heading: "T — Time",
        body: "If any sign is present, call emergency services NOW. Note the time symptoms began.",
      },
      {
        heading: "While waiting",
        body: "Keep them still and comfortable. Do not give food, drink, or medication. Loosen tight clothing. Stay with them.",
      },
    ],
  },
  {
    slug: "heart-attack",
    title: "Heart Attack",
    summary: "Chest discomfort, shortness of breath, cold sweat, nausea.",
    category: "cardiac",
    warning:
      "If unsure, treat it as a heart attack. Call emergency services immediately.",
    steps: [
      {
        heading: "1. Recognize the signs",
        body: "Chest pain or pressure (often described as squeezing, tight, or heavy), pain radiating to arm/jaw/back, shortness of breath, nausea, cold sweat, lightheadedness. Women may have subtler symptoms.",
      },
      {
        heading: "2. Call emergency services",
        body: "Do not drive yourself. Paramedics can begin treatment on the way.",
      },
      {
        heading: "3. Chew aspirin (if not allergic)",
        body: "If aspirin is available and the person is not allergic and not bleeding, have them chew one regular (325 mg) or 4 low-dose (81 mg) aspirin.",
      },
      {
        heading: "4. Sit and rest",
        body: "Sit them upright, leaning back slightly with knees up. Loosen tight clothing. Stay calm and reassure them.",
      },
      {
        heading: "5. Be ready for CPR",
        body: "If they become unresponsive and stop breathing normally, begin CPR. Use an AED if available.",
      },
    ],
  },
  {
    slug: "fire-smoke",
    title: "Fire & Smoke Inhalation",
    summary: "Escape, then help. Smoke kills faster than flame.",
    category: "fire",
    warning:
      "Do not re-enter a burning building for any reason. Call the fire department from a safe distance.",
    steps: [
      {
        heading: "1. Get out, stay out",
        body: "Crawl low under smoke — cleaner air is near the floor. Cover nose and mouth with cloth, wet if possible.",
      },
      {
        heading: "2. Check doors before opening",
        body: "Touch the back of your hand to the door. If hot, do NOT open — find another way out. If cool, open slowly and be ready to slam it shut.",
      },
      {
        heading: "3. If your clothes catch fire",
        body: "STOP — don't run. DROP — to the ground. ROLL — cover your face with your hands and roll back and forth until flames are out.",
      },
      {
        heading: "4. If trapped",
        body: "Close the door. Seal cracks with cloth. Open a window and signal for help — wave a bright cloth or flashlight. Call emergency services and give your exact location.",
      },
      {
        heading: "5. After escape — smoke inhalation",
        body: "Move to fresh air. Signs of smoke inhalation: coughing, hoarse voice, soot around nose/mouth, headache, confusion. Get medical attention even if you feel OK — symptoms can worsen over hours.",
      },
    ],
  },
  {
    slug: "shock",
    title: "Shock",
    summary: "Pale, cold, clammy skin; rapid weak pulse; confusion.",
    category: "other",
    steps: [
      {
        heading: "1. Recognize",
        body: "Pale, gray, or bluish skin; cold and clammy; rapid shallow breathing; weak rapid pulse; nausea; confusion or weakness. Often follows serious injury, bleeding, or allergic reaction.",
      },
      {
        heading: "2. Call for help",
        body: "Shock is a medical emergency. Call emergency services.",
      },
      {
        heading: "3. Position",
        body: "Lay the person flat on their back. If no spinal injury, raise legs about 12 inches.",
      },
      {
        heading: "4. Keep warm",
        body: "Cover with a blanket or coat. Loosen tight clothing.",
      },
      {
        heading: "5. Do NOT",
        body: "Do not give food or drink. Do not move them if a spinal injury is possible. Do not raise the head.",
      },
    ],
  },
  {
    slug: "seizures",
    title: "Seizures",
    summary: "Protect them from injury — don't restrain.",
    category: "other",
    steps: [
      {
        heading: "1. Stay calm, time it",
        body: "Note when the seizure starts. Most seizures stop within 1–3 minutes.",
      },
      {
        heading: "2. Clear the area",
        body: "Move hard or sharp objects away. Cushion their head with something soft.",
      },
      {
        heading: "3. Do NOT restrain or insert anything",
        body: "Never put anything in their mouth — they cannot swallow their tongue. Do not hold them down.",
      },
      {
        heading: "4. Recovery position",
        body: "Once the seizure ends, gently roll them onto their side to keep the airway clear.",
      },
      {
        heading: "5. Call emergency services if",
        body: "Seizure lasts longer than 5 minutes, another follows immediately, they don't regain consciousness, they're injured, pregnant, diabetic, or it's their first seizure.",
      },
    ],
  },
];

export function getGuide(slug: string): FirstAidGuide | undefined {
  return FIRST_AID_GUIDES.find((g) => g.slug === slug);
}
