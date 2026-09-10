export type Amenity = "power" | "wifi" | "screen" | "meal";

export type Fare = {
  name: string;
  note?: string;
  delta: number;
  recommended?: boolean;
  carryOn: string;
  checked: string | null;
  refund: string;
  refundable: boolean;
  change: string;
  perks: string[];
  bundle?: { name: string; items: string[]; value: number };
};

export type Flight = {
  id: string;
  airline: string;
  code: string;
  flightNo: string;
  aircraft: string;
  cabin: string;
  fromCode: string;
  fromCity: string;
  fromAirport: string;
  fromTerminal: string;
  toCode: string;
  toCity: string;
  toAirport: string;
  toTerminal: string;
  departTime: string;
  arriveTime: string;
  nextDay: boolean;
  duration: string;
  stops: number;
  price: number;
  base: number;
  taxes: number;
  seatsLeft: number;
  co2: number;
  trees: number;
  onTime: number;
  legroom: string;
  amenities: Amenity[];
  tag?: string;
  fares: Fare[];
};

export type ReturnLeg = {
  flightNo: string;
  aircraft: string;
  departTime: string;
  arriveTime: string;
  duration: string;
  fromTerminal: string;
  toTerminal: string;
};

function fareSet(opts: {
  carryOn: string;
  checked: string;
  changeFee: number;
  standard: number;
  flex: number;
  miles: number;
}): Fare[] {
  return [
    {
      name: "Basic",
      note: "Lowest fare",
      delta: 0,
      carryOn: opts.carryOn,
      checked: null,
      refund: "Non-refundable",
      refundable: false,
      change: `Change fee from $${opts.changeFee}`,
      perks: [`Earn ${opts.miles} miles`, "Seat assigned at check-in"],
    },
    {
      name: "Standard",
      note: "Best value",
      delta: opts.standard,
      recommended: true,
      carryOn: opts.carryOn,
      checked: opts.checked,
      refund: "Free cancellation within 24h",
      refundable: true,
      change: "Free date change · once",
      perks: [`Earn ${Math.round(opts.miles * 1.5)} miles`, "Free seat selection"],
      bundle: {
        name: "TripFlex · EasyCancel & Change",
        items: ["Cancellation fee waived", "Rebooking fee waived", "24h price-drop refund"],
        value: opts.standard * 3,
      },
    },
    {
      name: "Flex",
      note: "Fully flexible",
      delta: opts.flex,
      carryOn: opts.carryOn,
      checked: `2 × ${opts.checked.split("× ")[1] ?? "23kg"}`,
      refund: "Free cancellation anytime",
      refundable: true,
      change: "Unlimited free changes",
      perks: [`Earn ${opts.miles * 2} miles`, "Priority boarding", "Lounge access · 1 visit"],
    },
  ];
}

export const flights: Flight[] = [
  {
    id: "nh853",
    airline: "ANA",
    code: "NH",
    flightNo: "NH853",
    aircraft: "Boeing 787-9",
    cabin: "Economy",
    fromCode: "TPE",
    fromCity: "Taipei",
    fromAirport: "Taoyuan Intl",
    fromTerminal: "T2",
    toCode: "HND",
    toCity: "Tokyo",
    toAirport: "Haneda Intl",
    toTerminal: "T3",
    departTime: "10:20",
    arriveTime: "14:25",
    nextDay: false,
    duration: "4h 05m",
    stops: 0,
    price: 428,
    base: 356,
    taxes: 72,
    seatsLeft: 4,
    co2: 19,
    trees: 212,
    onTime: 94,
    legroom: '34" pitch',
    amenities: ["power", "wifi", "screen", "meal"],
    tag: "Best match",
    fares: fareSet({
      carryOn: "1 × 10kg",
      checked: "1 × 23kg",
      changeFee: 40,
      standard: 46,
      flex: 112,
      miles: 780,
    }),
  },
  {
    id: "jx802",
    airline: "Starlux",
    code: "JX",
    flightNo: "JX802",
    aircraft: "Airbus A321neo",
    cabin: "Economy",
    fromCode: "TPE",
    fromCity: "Taipei",
    fromAirport: "Taoyuan Intl",
    fromTerminal: "T2",
    toCode: "NRT",
    toCity: "Tokyo",
    toAirport: "Narita Intl",
    toTerminal: "T1",
    departTime: "13:55",
    arriveTime: "18:05",
    nextDay: false,
    duration: "4h 10m",
    stops: 0,
    price: 396,
    base: 332,
    taxes: 64,
    seatsLeft: 7,
    co2: 23,
    trees: 252,
    onTime: 88,
    legroom: '32" pitch',
    amenities: ["power", "wifi", "screen"],
    tag: "Greenest",
    fares: fareSet({
      carryOn: "1 × 7kg",
      checked: "1 × 23kg",
      changeFee: 55,
      standard: 38,
      flex: 96,
      miles: 640,
    }),
  },
  {
    id: "jl802",
    airline: "JAL",
    code: "JL",
    flightNo: "JL802",
    aircraft: "Boeing 767-300ER",
    cabin: "Economy",
    fromCode: "TPE",
    fromCity: "Taipei",
    fromAirport: "Taoyuan Intl",
    fromTerminal: "T1",
    toCode: "NRT",
    toCity: "Tokyo",
    toAirport: "Narita Intl",
    toTerminal: "T2",
    departTime: "08:40",
    arriveTime: "12:50",
    nextDay: false,
    duration: "4h 10m",
    stops: 0,
    price: 452,
    base: 380,
    taxes: 72,
    seatsLeft: 9,
    co2: 11,
    trees: 118,
    onTime: 91,
    legroom: '33" pitch',
    amenities: ["power", "screen", "meal"],
    fares: fareSet({
      carryOn: "1 × 10kg",
      checked: "1 × 23kg",
      changeFee: 45,
      standard: 52,
      flex: 120,
      miles: 810,
    }),
  },
  {
    id: "mm628",
    airline: "Peach",
    code: "MM",
    flightNo: "MM628",
    aircraft: "Airbus A320",
    cabin: "Economy",
    fromCode: "TPE",
    fromCity: "Taipei",
    fromAirport: "Taoyuan Intl",
    fromTerminal: "T1",
    toCode: "NRT",
    toCity: "Tokyo",
    toAirport: "Narita Intl",
    toTerminal: "T1",
    departTime: "21:15",
    arriveTime: "01:20",
    nextDay: true,
    duration: "4h 05m",
    stops: 0,
    price: 342,
    base: 296,
    taxes: 46,
    seatsLeft: 2,
    co2: 8,
    trees: 86,
    onTime: 79,
    legroom: '29" pitch',
    amenities: ["power"],
    tag: "Lowest price",
    fares: fareSet({
      carryOn: "1 × 7kg",
      checked: "1 × 20kg",
      changeFee: 65,
      standard: 34,
      flex: 88,
      miles: 320,
    }),
  },
];

const fallbackLeg: ReturnLeg = {
  flightNo: "NH852",
  aircraft: "Boeing 787-9",
  departTime: "09:05",
  arriveTime: "12:00",
  duration: "3h 55m",
  fromTerminal: "T3",
  toTerminal: "T2",
};

export const returnLegs: Record<string, ReturnLeg> = {
  nh853: {
    flightNo: "NH852",
    aircraft: "Boeing 787-9",
    departTime: "09:05",
    arriveTime: "12:00",
    duration: "3h 55m",
    fromTerminal: "T3",
    toTerminal: "T2",
  },
  jx802: {
    flightNo: "JX801",
    aircraft: "Airbus A321neo",
    departTime: "19:20",
    arriveTime: "22:20",
    duration: "4h 00m",
    fromTerminal: "T1",
    toTerminal: "T2",
  },
  jl802: {
    flightNo: "JL801",
    aircraft: "Boeing 767-300ER",
    departTime: "14:10",
    arriveTime: "17:05",
    duration: "3h 55m",
    fromTerminal: "T2",
    toTerminal: "T1",
  },
  mm628: {
    flightNo: "MM627",
    aircraft: "Airbus A320",
    departTime: "16:45",
    arriveTime: "19:50",
    duration: "4h 05m",
    fromTerminal: "T1",
    toTerminal: "T1",
  },
};

export function flightById(id: string): Flight | undefined {
  return flights.find((f) => f.id === id);
}

export function returnLegFor(id: string): ReturnLeg {
  return returnLegs[id] ?? fallbackLeg;
}
