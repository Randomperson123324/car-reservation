export const TRIP_TYPES = [
  {
    id: "drop_off",
    label: "ไปส่งอย่างเดียว",
    desc: "รับจากสถาบันและส่งถึงจุดหมาย",
  },
  {
    id: "pick_up",
    label: "ไปรับอย่างเดียว",
    desc: "ไปรับจากจุดหมายกลับสถาบัน",
  },
  {
    id: "drop_and_pick",
    label: "ไปส่งและไปรับ",
    desc: "ส่งถึงจุดหมาย แล้วกลับไปรับตามเวลานัด",
  },
  {
    id: "drop_and_wait",
    label: "ไปส่งและรอกลับ",
    desc: "ส่งถึงจุดหมาย และรถรอรับกลับ",
  },
] as const;

export type TripTypeId = (typeof TRIP_TYPES)[number]["id"];

export const PROVINCES = [
  "กรุงเทพมหานคร",
  "นนทบุรี",
  "ปทุมธานี",
  "สมุทรปราการ",
  "สมุทรสาคร",
  "นครปฐม",
  "ฉะเชิงเทรา",
] as const;

export type Province = (typeof PROVINCES)[number];

export const POSITIONS = [
  "อธิการบดี",
  "รองอธิการบดี",
  "คณบดีสำนักวิชาพยาบาลศาสตร์",
  "คณบดีสำนักวิชาบัณฑิตศึกษา",
  "รองคณบดี",
  "ผู้อำนวยการศูนย์บริการการพยาบาล",
  "ผู้อำนวยการศูนย์วิจัยและนวัตกรรม",
  "ผู้อำนวยการสำนักงาน",
  "หัวหน้าสาขาวิชาการพยาบาลพื้นฐานและบริหารการพยาบาล",
  "หัวหน้าสาขาวิชาการพยาบาลผู้ใหญ่และผู้สูงอายุ",
  "หัวหน้าสาขาวิชาการพยาบาลจิตเวชและสุขภาพจิต",
  "หัวหน้าสาขาวิชาการพยาบาลอนามัยชุมชน",
  "หัวหน้าสาขาวิชาการพยาบาลเด็ก",
  "หัวหน้าสาขาวิชาการพยาบาลมารดา ทารกและการผดุงครรภ์",
  "หัวหน้าฝ่ายบริหารงานทั่วไป",
  "หัวหน้าฝ่ายพัฒนานักศึกษา",
  "หัวหน้าฝ่ายบริการการศึกษา",
  "หัวหน้าฝ่ายวิจัยและบริการวิชาการ",
  "หัวหน้าฝ่ายบริหารวิชาการ",
  "หัวหน้าฝ่ายการคลังและทรัพย์สิน",
  "หัวหน้าฝ่ายยุทธศาสตร์และประกันคุณภาพการศึกษา",
  "อื่น ๆ เช่น ประธานวิชา/ประธานโครงการ",
] as const;

export type Position = (typeof POSITIONS)[number];

export const STATUS_LABELS: Record<string, string> = {
  pending: "รอการอนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
  cancelled: "ยกเลิก",
};

export const MAX_PASSENGERS = 50;

export type ReservationInput = {
  travelDate: string;
  tripType: TripTypeId | "";
  departTime: string;
  arriveTime: string;
  returnTime: string;
  name: string;
  position: Position | "";
  phone: string;
  passengers: string;
  province: Province | "";
  destination: string;
  note: string;
};

export type ReservationField = keyof ReservationInput;
export type ReservationErrors = Partial<Record<ReservationField, string>>;

export const EMPTY_RESERVATION: ReservationInput = {
  travelDate: "",
  tripType: "",
  departTime: "",
  arriveTime: "",
  returnTime: "",
  name: "",
  position: "",
  phone: "",
  passengers: "1",
  province: "",
  destination: "",
  note: "",
};

export type ReservationSummary = {
  code: string;
  travel_date: string;
  trip_type: TripTypeId;
  depart_time: string;
  arrive_time: string;
  return_time: string | null;
  province: string;
  destination: string;
  status: string;
};

// What the admin page shows of each booking.
export type AdminReservation = ReservationSummary & {
  requester_name: string;
  department: string | null;
  phone: string;
  passengers: number;
  note: string | null;
  created_at: string;
};

export const ADMIN_FILTERS = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "all",
] as const;
export type AdminFilter = (typeof ADMIN_FILTERS)[number];

export const CODE_PREFIX = "STIN";
// Bookings made before the prefix changed keep their "RS-" codes.
const LEGACY_CODE_PREFIX = "RS";
const CODE_LENGTH = 6;

// Booking codes as issued by createReservation: the prefix plus six characters
// from an alphabet without the look-alikes 0/O and 1/I.
export const CODE_RE = /^(STIN|RS)-[A-HJ-NP-Z2-9]{6}$/;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const PHONE_RE = /^0\d{8,9}$/;

const INVALID_TIME =
  "รูปแบบเวลาไม่ถูกต้อง กรุณากรอกแบบ 24 ชั่วโมง เช่น 08:30 หรือ 14:00";

// Accepts a code typed loosely: any case, with or without its prefix or dash.
// The length tells a bare code from a prefixed one, since the six characters
// may themselves begin with the letters of a prefix.
export function normalizeCode(code: string) {
  const compact = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  for (const prefix of [CODE_PREFIX, LEGACY_CODE_PREFIX]) {
    if (
      compact.startsWith(prefix) &&
      compact.length === prefix.length + CODE_LENGTH
    ) {
      return `${prefix}-${compact.slice(prefix.length)}`;
    }
  }
  return `${CODE_PREFIX}-${compact}`;
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function bangkokToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(
    new Date(),
  );
}

export function tripTypeLabel(id: string) {
  return TRIP_TYPES.find((t) => t.id === id)?.label ?? id;
}

export function formatThaiDate(date: string) {
  if (!DATE_RE.test(date)) return date;
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function formatTime(time: string) {
  return `${time.slice(0, 5)} น.`;
}

export function validateReservation(
  input: ReservationInput,
  today: string,
): ReservationErrors {
  const errors: ReservationErrors = {};

  if (!DATE_RE.test(input.travelDate)) {
    errors.travelDate = "กรุณาเลือกวันเดินทาง";
  } else if (input.travelDate < today) {
    errors.travelDate = "วันเดินทางต้องไม่เป็นวันที่ผ่านมาแล้ว";
  }

  if (!TRIP_TYPES.some((t) => t.id === input.tripType)) {
    errors.tripType = "กรุณาเลือกรูปแบบการเดินทาง";
  }

  if (!input.departTime.trim()) {
    errors.departTime = "กรุณาระบุเวลาออกเดินทาง";
  } else if (!TIME_RE.test(input.departTime)) {
    errors.departTime = INVALID_TIME;
  }
  if (!input.arriveTime.trim()) {
    errors.arriveTime = "กรุณาระบุเวลาถึงสถานที่";
  } else if (!TIME_RE.test(input.arriveTime)) {
    errors.arriveTime = INVALID_TIME;
  } else if (!errors.departTime && input.arriveTime <= input.departTime) {
    errors.arriveTime = "เวลาถึงสถานที่ต้องหลังเวลาออกเดินทาง";
  }
  if (input.tripType === "drop_and_pick") {
    if (!input.returnTime.trim()) {
      errors.returnTime = "กรุณาระบุเวลาที่ให้ไปรับกลับ";
    } else if (!TIME_RE.test(input.returnTime)) {
      errors.returnTime = INVALID_TIME;
    } else if (!errors.arriveTime && input.returnTime <= input.arriveTime) {
      errors.returnTime = "เวลาไปรับกลับต้องหลังเวลาถึงสถานที่";
    }
  }

  const name = input.name.trim();
  if (name.length < 2) errors.name = "กรุณากรอกชื่อ-นามสกุล";
  else if (name.length > 120) errors.name = "ชื่อยาวเกินไป";

  if (!input.position) {
    errors.position = "กรุณาเลือกตำแหน่ง";
  } else if (!POSITIONS.includes(input.position)) {
    errors.position = "กรุณาเลือกตำแหน่งจากรายการ";
  }

  if (!PHONE_RE.test(normalizePhone(input.phone))) {
    errors.phone = "กรุณากรอกเบอร์ติดต่อ 9–10 หลัก ขึ้นต้นด้วย 0";
  }

  const passengers = Number(input.passengers);
  if (
    !Number.isInteger(passengers) ||
    passengers < 1 ||
    passengers > MAX_PASSENGERS
  ) {
    errors.passengers = `จำนวนผู้โดยสารต้องอยู่ระหว่าง 1–${MAX_PASSENGERS} คน`;
  }

  if (!PROVINCES.includes(input.province as Province)) {
    errors.province = "กรุณาเลือกจังหวัด";
  }

  const destination = input.destination.trim();
  if (destination.length < 2) {
    errors.destination = "กรุณาระบุชื่อสถานที่ที่ต้องการไป";
  } else if (destination.length > 200) {
    errors.destination = "ชื่อสถานที่ยาวเกินไป";
  }

  if (input.note.trim().length > 500) errors.note = "หมายเหตุยาวเกินไป";

  return errors;
}
