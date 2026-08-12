"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type AssessmentType = "collection" | "return";
type VehicleView = "front" | "left" | "right" | "rear";
type Condition = "" | "Clear" | "Worn" | "Burns" | "Ripped" | "Stained" | "Cracked";
type TyreCondition = "" | "Good" | "Scratched" | "Dented" | "Worn" | "Cut" | "Rubbed";

type Damage = {
  id: string;
  view: VehicleView;
  zone: string;
  type: string;
  severity: "Minor" | "Moderate" | "Major";
  status: "Existing" | "New";
  note: string;
};

type EquipmentState = Record<
  "First-aid kit" | "Toolbox" | "Jack" | "Spare wheel" | "Warning triangle" | "Wheel spanner",
  boolean | null
>;

type IconName =
  | "grid"
  | "clipboard"
  | "history"
  | "car"
  | "camera"
  | "check"
  | "chevron"
  | "bell"
  | "plus"
  | "search"
  | "download"
  | "shield"
  | "clock"
  | "warning"
  | "arrow";

const steps = [
  { label: "Vehicle", short: "Vehicle" },
  { label: "Equipment", short: "Equipment" },
  { label: "Exterior condition", short: "Exterior" },
  { label: "Interior & tyres", short: "Condition" },
  { label: "Evidence & driver declaration", short: "Sign-off" },
  { label: "Review assessment", short: "Review" },
];

const damageTypes = [
  { label: "Bent", code: "B" },
  { label: "Broken", code: "BR" },
  { label: "Chip", code: "CH" },
  { label: "Cracked", code: "CR" },
  { label: "Dented", code: "D" },
  { label: "Missing", code: "M" },
  { label: "Pitted", code: "PT" },
  { label: "Rusty", code: "R" },
  { label: "Rubbed", code: "RU" },
  { label: "Scratch", code: "S" },
  { label: "Hairline Scratch", code: "HS" },
  { label: "Stained", code: "ST" },
  { label: "Torn", code: "T" },
];

const interiorItems = ["Front carpet", "Rear carpet", "Front seat", "Rear seat", "Headliner", "Door panels"];
const tyreItems = ["Front right", "Front left", "Rear right", "Rear left", "Spare"];

function displayDate(value: string, short = false) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", short ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" }).format(date);
}

const diagramZones: { name: string; view: VehicleView; x: number; y: number }[] = [
  { name: "Bonnet", view: "front", x: 15, y: 57 },
  { name: "Left headlight", view: "front", x: 10, y: 49 },
  { name: "Grille", view: "front", x: 10, y: 58 },
  { name: "Right headlight", view: "front", x: 10, y: 68 },
  { name: "Front bumper", view: "front", x: 5, y: 58 },
  { name: "Left front panel", view: "left", x: 32, y: 35 },
  { name: "Left front door", view: "left", x: 45, y: 34 },
  { name: "Left rear door", view: "left", x: 55, y: 34 },
  { name: "Left rear panel", view: "left", x: 66, y: 35 },
  { name: "Left sill", view: "left", x: 50, y: 40 },
  { name: "Right front panel", view: "right", x: 34, y: 83 },
  { name: "Right front door", view: "right", x: 44, y: 86 },
  { name: "Right rear door", view: "right", x: 55, y: 86 },
  { name: "Right rear panel", view: "right", x: 66, y: 83 },
  { name: "Right sill", view: "right", x: 51, y: 80 },
  { name: "Boot lid", view: "rear", x: 85, y: 57 },
  { name: "Left tail light", view: "rear", x: 89, y: 49 },
  { name: "Rear panel", view: "rear", x: 89, y: 58 },
  { name: "Right tail light", view: "rear", x: 89, y: 68 },
  { name: "Rear bumper", view: "rear", x: 94, y: 58 },
];

const viewLabels: Record<VehicleView, string> = {
  front: "Front view",
  left: "Vehicle left side",
  right: "Vehicle right side",
  rear: "Rear view",
};

function diagramZoneNumber(zoneName: string) {
  return diagramZones.findIndex((zone) => zone.name === zoneName) + 1;
}

function damageCode(type: string) {
  return damageTypes.find((damage) => damage.label === type)?.code ?? "—";
}

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    clipboard: <><path d="M9 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3"/><rect x="9" y="2" width="6" height="5" rx="2"/><path d="M8 12h8M8 16h6"/></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
    car: <><path d="M5 17h14l1-5-2-5H6l-2 5 1 5Z"/><path d="M6 7h12M7 17v2M17 17v2M4 12h16"/><circle cx="7" cy="14.5" r="1"/><circle cx="17" cy="14.5" r="1"/></>,
    camera: <><path d="M14.5 5 13 3H8L6.5 5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-5.5Z"/><circle cx="10.5" cy="12.5" r="4"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    warning: <><path d="M10.3 3.7 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
  };
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function SegmentedToggle({
  value,
  onChange,
  yesLabel = "Yes",
  noLabel = "No",
}: {
  value: boolean | null;
  onChange: (value: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={`${yesLabel} or ${noLabel}`}>
      <button type="button" className={value === true ? "active positive" : ""} onClick={() => onChange(true)}>{yesLabel}</button>
      <button type="button" className={value === false ? "active negative" : ""} onClick={() => onChange(false)}>{noLabel}</button>
    </div>
  );
}

function SignaturePad({ label, onChange }: { label: string; onChange: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const point = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
      y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
    };
  };

  const start = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const current = point(event);
    context.beginPath();
    context.moveTo(current.x, current.y);
  };

  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const current = point(event);
    context.lineTo(current.x, current.y);
    context.strokeStyle = "#17202d";
    context.lineWidth = 3.2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();
  };

  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      onChange("");
    }
  };

  return (
    <div className="signature-field">
      <div className="signature-label"><span>{label}</span><button type="button" onClick={clear}>Clear</button></div>
      <canvas
        ref={canvasRef}
        width="800"
        height="220"
        aria-label={`${label} signature area`}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
      <span className="signature-hint">Sign using a finger, stylus or mouse</span>
    </div>
  );
}

function VehicleMap({
  selectedZone,
  onZoneSelect,
  damages,
  interactive = true,
}: {
  selectedZone: string;
  onZoneSelect?: (zone: string, view: VehicleView) => void;
  damages: Damage[];
  interactive?: boolean;
}) {
  return (
    <div className={`vehicle-map ${interactive ? "interactive" : "report-diagram"}`}>
      <div className="diagram-stage">
        <img className="condition-diagram" src="/assets/vehicle-condition-report.png" alt="Vehicle condition report diagram showing front, rear, top, left and right exterior views" />
        <span className="view-label front-label">Front view</span>
        <span className="view-label left-label">Vehicle left side</span>
        <span className="view-label top-label">Top view</span>
        <span className="view-label rear-label">Rear view</span>
        <span className="view-label right-label">Vehicle right side</span>
        {diagramZones.map((zone, index) => {
          const matchingDamages = damages.filter((damage) => damage.zone === zone.name);
          const count = matchingDamages.length;
          if (!interactive && !count) return null;
          return (
            <button
              type="button"
              key={zone.name}
              aria-label={`Area ${index + 1}: ${zone.name}`}
              title={zone.name}
              disabled={!interactive}
              className={`damage-pin ${selectedZone === zone.name ? "selected" : ""} ${count ? "recorded" : ""}`}
              style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
              onClick={() => onZoneSelect?.(zone.name, zone.view)}
            >
              {index + 1}
            </button>
          );
        })}
        {interactive && <div className="diagram-key"><span><i className="key-dot" /> Available area</span><span><i className="key-dot recorded" /> Damage recorded</span></div>}
      </div>
      {interactive && <div className="area-guide"><div className="area-guide-heading"><strong>Numbered vehicle-area guide</strong><span>Select a number here or directly on the diagram.</span></div><div className="area-guide-grid">{(["front", "left", "right", "rear"] as VehicleView[]).map((view) => <section key={view}><h3>{viewLabels[view]}</h3>{diagramZones.map((zone, index) => zone.view === view ? <button type="button" key={zone.name} className={`${selectedZone === zone.name ? "selected" : ""} ${damages.some((damage) => damage.zone === zone.name) ? "recorded" : ""}`} onClick={() => onZoneSelect?.(zone.name, zone.view)}><span>{index + 1}</span>{zone.name}</button> : null)}</section>)}</div></div>}
    </div>
  );
}

function Brand() {
  return (
    <div className="brand" aria-label="Cospharm — Believe in Good">
      <img className="brand-logo" src="/assets/cospharm-logo.png" alt="Cospharm — Believe in Good" />
      <strong className="brand-product">Cospharm FleetCare</strong>
    </div>
  );
}

export default function Home() {
  const [startedAt, setStartedAt] = useState("—");
  const [step, setStep] = useState(0);
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("collection");
  const [vehicle, setVehicle] = useState({
    driverName: "",
    assessmentDate: "",
    vehicleMake: "",
    vehicleModel: "",
    registrationNumber: "",
    colour: "",
    vehicleYear: "",
    odometerKm: "",
  });
  const [vehicleView, setVehicleView] = useState<VehicleView>("front");
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedDamageType, setSelectedDamageType] = useState("Scratch");
  const [severity, setSeverity] = useState<Damage["severity"]>("Minor");
  const [damageStatus, setDamageStatus] = useState<Damage["status"]>("Existing");
  const [damageNote, setDamageNote] = useState("");
  const [damages, setDamages] = useState<Damage[]>([]);
  const [hasExteriorDamage, setHasExteriorDamage] = useState<boolean | null>(null);
  const [equipment, setEquipment] = useState<EquipmentState>({
    "First-aid kit": null,
    Toolbox: null,
    Jack: null,
    "Spare wheel": null,
    "Warning triangle": null,
    "Wheel spanner": null,
  });
  const [interior, setInterior] = useState<Record<string, Condition>>(() => Object.fromEntries(interiorItems.map((item) => [item, ""])));
  const [tyres, setTyres] = useState<Record<string, TyreCondition>>(() => Object.fromEntries(tyreItems.map((item) => [item, ""])));
  const [operational, setOperational] = useState<boolean | null>(null);
  const [difficultyStarting, setDifficultyStarting] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<{ name: string; url: string; file: File }[]>([]);
  const [driverSignature, setDriverSignature] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedReportNumber, setSubmittedReportNumber] = useState("");
  const [compiledAt, setCompiledAt] = useState("");
  const [shareNotice, setShareNotice] = useState("");

  useEffect(() => {
    const now = new Date();
    setStartedAt(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(now));
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    setVehicle((current) => ({ ...current, assessmentDate: current.assessmentDate || `${year}-${month}-${day}` }));
  }, []);

  const missingEquipment = useMemo(() => Object.entries(equipment).filter(([, present]) => present === false).map(([item]) => item), [equipment]);
  const unansweredEquipment = useMemo(() => Object.values(equipment).filter((value) => value === null).length, [equipment]);
  const newDamages = damages.filter((damage) => damage.status === "New").length;
  const attentionRequired = Boolean(
    missingEquipment.length ||
    damages.length ||
    operational === false ||
    difficultyStarting === true ||
    Object.values(interior).some((value) => value && value !== "Clear") ||
    Object.values(tyres).some((value) => value && value !== "Good"),
  );
  const vehicleComplete = Boolean(vehicle.driverName.trim() && vehicle.assessmentDate && vehicle.vehicleMake.trim() && vehicle.vehicleModel.trim() && vehicle.registrationNumber.trim() && vehicle.colour.trim() && Number(vehicle.odometerKm) >= 0 && vehicle.odometerKm !== "");
  const exteriorComplete = hasExteriorDamage !== null && (!hasExteriorDamage || damages.length > 0);
  const conditionComplete = Object.values(interior).every(Boolean) && Object.values(tyres).every(Boolean) && operational !== null && difficultyStarting !== null;
  const signoffComplete = Boolean(driverSignature);
  const stepReady = [vehicleComplete, unansweredEquipment === 0, exteriorComplete, conditionComplete, signoffComplete, confirmed][step];
  const canSubmit = Boolean(confirmed && vehicleComplete && unansweredEquipment === 0 && exteriorComplete && conditionComplete && signoffComplete);

  const addDamage = () => {
    if (!selectedZone) return;
    setDamages((current) => [
      ...current,
      {
        id: `${Date.now()}`,
        view: vehicleView,
        zone: selectedZone,
        type: selectedDamageType,
        severity,
        status: damageStatus,
        note: damageNote.trim(),
      },
    ]);
    setDamageNote("");
    setSelectedZone("");
  };

  const updateVehicle = (field: keyof typeof vehicle, value: string) => {
    setVehicle((current) => ({ ...current, [field]: value }));
  };

  const compileAssessment = () => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replaceAll("-", "");
    const time = now.toTimeString().slice(0, 5).replace(":", "");
    setSubmittedReportNumber(`VA-${date}-${time}`);
    setCompiledAt(now.toISOString());
    setShareNotice("");
    setSubmitted(true);
  };

  const summaryText = () => {
    const missing = missingEquipment.length ? missingEquipment.join(", ") : "None";
    const exterior = damages.length
      ? damages.map((damage) => `${damage.zone}: ${damage.type} (${damage.severity}, ${damage.status})${damage.note ? ` — ${damage.note}` : ""}`).join("; ")
      : "None recorded";
    const interiorExceptions = Object.entries(interior).filter(([, condition]) => condition !== "Clear").map(([item, condition]) => `${item}: ${condition}`).join(", ") || "None";
    const tyreExceptions = Object.entries(tyres).filter(([, condition]) => condition !== "Good").map(([item, condition]) => `${item}: ${condition}`).join(", ") || "None";
    return [
      `COSPHARM VEHICLE ASSESSMENT — ${submittedReportNumber}`,
      `${assessmentType === "return" ? "Return" : "Collection"} assessment | ${displayDate(vehicle.assessmentDate)}`,
      `Vehicle: ${vehicle.vehicleMake} ${vehicle.vehicleModel}${vehicle.vehicleYear ? ` (${vehicle.vehicleYear})` : ""} | ${vehicle.registrationNumber} | ${vehicle.colour}`,
      `Driver: ${vehicle.driverName} | Odometer: ${Number(vehicle.odometerKm).toLocaleString("en-GB")} km`,
      `Operational: ${operational ? "Yes" : "No"} | Difficulty starting: ${difficultyStarting ? "Yes" : "No"}`,
      `Missing equipment: ${missing}`,
      `Exterior damage: ${exterior}`,
      `Interior exceptions: ${interiorExceptions}`,
      `Tyre/rim exceptions: ${tyreExceptions}`,
      `Driver declaration: ${vehicle.driverName} — signed`,
      "Assessor verification: Pending physical inspection on the printed report",
    ].join("\n");
  };

  const shareAssessment = async () => {
    const text = summaryText();
    try {
      if (navigator.share) {
        await navigator.share({ title: `Vehicle assessment ${submittedReportNumber}`, text });
        setShareNotice("Share options opened.");
      } else {
        await navigator.clipboard.writeText(text);
        setShareNotice("Summary copied. Paste it into email, WhatsApp or another app.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareNotice("Sharing is unavailable here. Use Print / Save PDF instead.");
    }
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <>
          <div className="section-heading"><div><span className="step-kicker">01 · Vehicle details</span><h2>Identify the vehicle and journey</h2><p>These details will be arranged into the final assessment report.</p></div><span className="imported-chip"><Icon name="clipboard" size={15}/> Required fields</span></div>
          <div className="assessment-type">
            <button type="button" className={assessmentType === "collection" ? "active" : ""} onClick={() => setAssessmentType("collection")}><span className="radio-dot"/><span><strong>Collection assessment</strong><small>Record condition before handover</small></span></button>
            <button type="button" className={assessmentType === "return" ? "active" : ""} onClick={() => setAssessmentType("return")}><span className="radio-dot"/><span><strong>Return assessment</strong><small>Compare condition after use</small></span></button>
          </div>
          <div className="field-grid">
            <label className="field"><span>Driver name</span><input value={vehicle.driverName} onChange={(event) => updateVehicle("driverName", event.target.value)} /></label>
            <label className="field"><span>Assessment date</span><input type="date" value={vehicle.assessmentDate} onChange={(event) => updateVehicle("assessmentDate", event.target.value)} /></label>
            <label className="field"><span>Vehicle make</span><input value={vehicle.vehicleMake} onChange={(event) => updateVehicle("vehicleMake", event.target.value)} /></label>
            <label className="field"><span>Model</span><input value={vehicle.vehicleModel} onChange={(event) => updateVehicle("vehicleModel", event.target.value)} /></label>
            <label className="field"><span>Registration number</span><input value={vehicle.registrationNumber} onChange={(event) => updateVehicle("registrationNumber", event.target.value.toUpperCase())} /></label>
            <label className="field"><span>Colour</span><input value={vehicle.colour} onChange={(event) => updateVehicle("colour", event.target.value)} /></label>
            <label className="field"><span>Year <small>Optional</small></span><input inputMode="numeric" value={vehicle.vehicleYear} onChange={(event) => updateVehicle("vehicleYear", event.target.value)} placeholder="e.g. 2021" /></label>
            <label className="field"><span>Odometer reading</span><div className="unit-input"><input inputMode="numeric" value={vehicle.odometerKm} onChange={(event) => updateVehicle("odometerKm", event.target.value)}/><em>km</em></div></label>
          </div>
        </>
      );
    }

    if (step === 1) {
      return (
        <>
          <div className="section-heading"><div><span className="step-kicker">02 · Safety equipment</span><h2>Confirm every required item</h2><p>Nothing is assumed. Select Yes or No for all six items.</p></div><span className={`count-chip ${unansweredEquipment || missingEquipment.length ? "warn" : ""}`}>{unansweredEquipment ? `${unansweredEquipment} unanswered` : `${missingEquipment.length} missing`}</span></div>
          <div className="equipment-list">
            {(Object.keys(equipment) as (keyof EquipmentState)[]).map((item) => (
              <div className="equipment-row" key={item}><span className={`equipment-icon ${equipment[item] === null ? "unanswered" : equipment[item] ? "present" : "missing"}`}><Icon name={equipment[item] === null ? "clock" : equipment[item] ? "check" : "warning"}/></span><div><strong>{item}</strong><small>{equipment[item] === null ? "Select Yes or No" : equipment[item] ? "Present and serviceable" : "Not available in vehicle"}</small></div><SegmentedToggle value={equipment[item]} onChange={(value) => setEquipment((current) => ({ ...current, [item]: value }))}/></div>
            ))}
          </div>
          {missingEquipment.length > 0 && <div className="notice warning-notice"><Icon name="warning"/><div><strong>Action will be required</strong><span>{missingEquipment.join(" and ")} {missingEquipment.length === 1 ? "is" : "are"} marked as missing.</span></div></div>}
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <div className="section-heading"><div><span className="step-kicker">03 · Exterior condition</span><h2>Is there any exterior damage?</h2><p>Answer the binary question first. The diagram appears only when damage must be recorded.</p></div><span className="count-chip">{damages.length} recorded</span></div>
          <div className="binary-decision"><div><strong>Exterior damage visible</strong><small>Include scratches, dents, chips, cracks, rust, stains or missing parts.</small></div><SegmentedToggle value={hasExteriorDamage} onChange={(value) => { setHasExteriorDamage(value); if (!value) { setDamages([]); setSelectedZone(""); } }}/></div>
          {hasExteriorDamage === null && <div className="tap-prompt"><span><Icon name="clock"/></span><div><strong>Select Yes or No</strong><small>No damage condition will be inferred automatically.</small></div></div>}
          {hasExteriorDamage === false && <div className="notice information-notice"><Icon name="check"/><div><strong>No exterior damage</strong><span>The report will record that the exterior was inspected and found clear.</span></div></div>}
          {hasExteriorDamage === true && <>
            <div className="diagram-instructions"><div><span>1</span><p><strong>Locate the damage</strong><small>Use the labelled views and select its numbered vehicle area.</small></p></div><div><span>2</span><p><strong>Describe the damage</strong><small>Choose the damage type, severity and whether it is existing or new.</small></p></div><div><span>3</span><p><strong>Record the entry</strong><small>Add optional notes, then select “Record this damage”.</small></p></div></div>
            <VehicleMap selectedZone={selectedZone} onZoneSelect={(zone, nextView) => { setSelectedZone(zone); setVehicleView(nextView); }} damages={damages}/>
            {selectedZone ? (
              <div className="damage-editor">
                <div className="editor-heading"><div><span>Selected vehicle area</span><strong><i>{diagramZoneNumber(selectedZone)}</i>{selectedZone} · {viewLabels[vehicleView]}</strong></div><button type="button" onClick={() => setSelectedZone("")}>Change area</button></div>
                <div className="editor-grid">
                  <div className="choice-group full"><span>Damage type</span><div className="choice-pills">{damageTypes.map((type) => <button type="button" key={type.code} className={selectedDamageType === type.label ? "active" : ""} onClick={() => setSelectedDamageType(type.label)}><b>{type.code}</b>{type.label}</button>)}</div></div>
                  <div className="choice-group"><span>Severity</span><div className="choice-pills compact">{(["Minor", "Moderate", "Major"] as const).map((item) => <button type="button" key={item} className={severity === item ? `active severity-${item.toLowerCase()}` : ""} onClick={() => setSeverity(item)}>{item}</button>)}</div></div>
                  <div className="choice-group"><span>Damage status</span><div className="choice-pills compact">{(["Existing", "New"] as const).map((item) => <button type="button" key={item} className={damageStatus === item ? "active" : ""} onClick={() => setDamageStatus(item)}>{item}</button>)}</div></div>
                  <label className="field full"><span>Description in your own words <small>Optional</small></span><textarea rows={2} value={damageNote} onChange={(event) => setDamageNote(event.target.value)} placeholder="e.g. hairline scratch below the left headlight"/></label>
                </div>
                <button type="button" className="primary-button add-damage" onClick={addDamage}><Icon name="plus"/> Record this damage</button>
              </div>
            ) : <div className="tap-prompt"><span><Icon name="plus"/></span><div><strong>Start by selecting a numbered vehicle area</strong><small>Use either a marker on the diagram or its matching label in the area guide below.</small></div></div>}
            {damages.length > 0 && <div className="damage-log"><div className="mini-heading"><strong>Recorded exterior damage</strong><span>{damages.length} {damages.length === 1 ? "entry" : "entries"}</span></div>{damages.map((damage) => <div className="damage-row" key={damage.id}><span className={`damage-number ${damage.status === "New" ? "new" : ""}`}>{diagramZoneNumber(damage.zone)}</span><div><strong>{damage.zone} · {damage.type}</strong><small>{viewLabels[damage.view]} · {damage.severity} · {damage.status}{damage.note ? ` · ${damage.note}` : ""}</small></div><button type="button" onClick={() => setDamages((current) => current.filter((item) => item.id !== damage.id))}>Remove</button></div>)}</div>}
          </>}
        </>
      );
    }

    if (step === 3) {
      return (
        <>
          <div className="section-heading"><div><span className="step-kicker">04 · Interior & tyres</span><h2>Complete the condition checks</h2><p>Choose the closest condition for every inspected component.</p></div><span className="count-chip clear-count"><Icon name="check" size={15}/> Checked</span></div>
          <div className="condition-section"><div className="mini-heading"><div><strong>Interior condition</strong><span>W — Worn · B — Burns · R — Ripped · S — Stained · C — Cracked</span></div></div><div className="condition-list">{interiorItems.map((item) => <div className="condition-row" key={item}><strong>{item}</strong><select value={interior[item]} onChange={(event) => setInterior((current) => ({ ...current, [item]: event.target.value as Condition }))}><option value="" disabled>Select condition</option>{(["Clear", "Worn", "Burns", "Ripped", "Stained", "Cracked"] as Condition[]).filter(Boolean).map((option) => <option key={option}>{option}</option>)}</select></div>)}</div></div>
          <div className="condition-section"><div className="mini-heading"><div><strong>Tyres and rims</strong><span>Select one condition for every position</span></div></div><div className="tyre-grid">{tyreItems.map((item) => <label className="tyre-card" key={item}><span className="tyre-icon">◎</span><strong>{item}</strong><select value={tyres[item]} onChange={(event) => setTyres((current) => ({ ...current, [item]: event.target.value as TyreCondition }))}><option value="" disabled>Select condition</option>{(["Good", "Scratched", "Dented", "Worn", "Cut", "Rubbed"] as TyreCondition[]).filter(Boolean).map((option) => <option key={option}>{option}</option>)}</select></label>)}</div></div>
          <div className="operational-grid"><div className="operational-row"><span className={`equipment-icon ${operational === null ? "unanswered" : operational ? "present" : "missing"}`}><Icon name={operational === null ? "clock" : "car"}/></span><div><strong>Vehicle operational</strong><small>Vehicle starts and can be driven safely</small></div><SegmentedToggle value={operational} onChange={setOperational}/></div><div className="operational-row"><span className={`equipment-icon ${difficultyStarting === null ? "unanswered" : difficultyStarting ? "missing" : "present"}`}><Icon name={difficultyStarting === null ? "clock" : difficultyStarting ? "warning" : "check"}/></span><div><strong>Difficulty starting</strong><small>Slow crank, repeated attempts or warning sounds</small></div><SegmentedToggle value={difficultyStarting} onChange={setDifficultyStarting}/></div></div>
        </>
      );
    }

    if (step === 4) {
      return (
        <>
          <div className="section-heading"><div><span className="step-kicker">05 · Evidence & driver declaration</span><h2>Add proof and sign the driver’s report</h2><p>The driver completes this section. The assessor’s fields remain blank on the printable report until the vehicle has been physically checked.</p></div><span className="secure-chip"><Icon name="shield" size={15}/> Device only</span></div>
          <label className="photo-uploader">
            <input type="file" accept="image/*" capture="environment" multiple onChange={(event) => { const selected = Array.from(event.target.files ?? []); setPhotos((current) => [...current, ...selected.map((file) => ({ name: file.name, url: URL.createObjectURL(file), file }))]); }}/>
            <span className="upload-icon"><Icon name="camera" size={27}/></span><strong>Take or upload vehicle photos</strong><small>Capture the odometer, each side of the vehicle and any damage.</small><em><Icon name="plus" size={16}/> Add photographs</em>
          </label>
          {photos.length > 0 && <div className="photo-grid">{photos.map((photo, index) => <figure key={`${photo.name}-${index}`}><img src={photo.url} alt={`Vehicle evidence ${index + 1}`}/><figcaption>Photo {index + 1}<button type="button" onClick={() => { URL.revokeObjectURL(photo.url); setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index)); }}>×</button></figcaption></figure>)}</div>}
          <div className="driver-declaration-card">
            <div className="declaration-copy"><span className="declaration-number">01</span><div><strong>Driver declaration</strong><p>I verify that this is an accurate assessment of the vehicle upon collection or return.</p><dl><div><dt>Driver</dt><dd>{vehicle.driverName}</dd></div><div><dt>Date</dt><dd>{displayDate(vehicle.assessmentDate)}</dd></div></dl></div></div>
            <SignaturePad label="Driver signature" onChange={setDriverSignature}/>
          </div>
          <div className="notice information-notice"><Icon name="clipboard"/><div><strong>Assessor sign-off is deliberately left blank</strong><span>The generated report includes empty assessor name, date, signature and remarks fields. The assessor completes them only after independently checking the vehicle.</span></div></div>
        </>
      );
    }

    return (
      <>
        <div className="section-heading"><div><span className="step-kicker">06 · Review</span><h2>One final check before compiling</h2><p>Your answers will be arranged into a clear report for printing, PDF saving or sharing.</p></div><span className="report-id">Private session · not saved</span></div>
        <div className="review-hero"><div className="vehicle-avatar large">{vehicle.vehicleMake[0] || "V"}{vehicle.vehicleModel[0] || "H"}</div><div><span>{vehicle.vehicleMake} {vehicle.vehicleModel}</span><h3>{vehicle.registrationNumber}</h3><small>{assessmentType === "return" ? "Return" : "Collection"} · {displayDate(vehicle.assessmentDate)} · {Number(vehicle.odometerKm || 0).toLocaleString("en-GB")} km</small></div><span className={`readiness ${attentionRequired ? "attention" : "ready"}`}>{attentionRequired ? "Attention noted" : "Ready to compile"}</span></div>
        <div className="review-grid">
          <article><span className="review-icon"><Icon name="car"/></span><div><small>Exterior</small><strong>{damages.length ? `${damages.length} damage ${damages.length === 1 ? "entry" : "entries"}` : "No damage recorded"}</strong><em>{newDamages} marked as new</em></div></article>
          <article><span className="review-icon"><Icon name="shield"/></span><div><small>Safety equipment</small><strong>{6 - missingEquipment.length} of 6 present</strong><em>{missingEquipment.length ? missingEquipment.join(", ") : "All items available"}</em></div></article>
          <article><span className="review-icon"><Icon name="camera"/></span><div><small>Evidence</small><strong>{photos.length} photographs</strong><em>{photos.length ? "Attached to report" : "No photos attached"}</em></div></article>
          <article><span className="review-icon"><Icon name="clipboard"/></span><div><small>Verification</small><strong>{driverSignature ? "Driver signed" : "Driver signature required"}</strong><em>Assessor fields reserved on printout</em></div></article>
        </div>
        <div className="report-summary">
          <div className="mini-heading"><strong>Condition summary</strong><button type="button" onClick={() => setStep(2)}>Edit assessment</button></div>
          <div className="summary-line"><span>Vehicle operational</span><strong className={operational ? "good-text" : "bad-text"}>{operational ? "Yes" : "No"}</strong></div>
          <div className="summary-line"><span>Difficulty starting</span><strong className={!difficultyStarting ? "good-text" : "bad-text"}>{difficultyStarting ? "Yes" : "No"}</strong></div>
          <div className="summary-line"><span>Interior exceptions</span><strong>{Object.values(interior).filter((value) => value !== "Clear").length || "None"}</strong></div>
          <div className="summary-line"><span>Tyre/rim exceptions</span><strong>{Object.values(tyres).filter((value) => value !== "Good").length || "None"}</strong></div>
        </div>
        <label className="confirm-box"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}/><span><strong>I confirm that the driver’s assessment is ready to compile.</strong><small>The assessor will complete the separate verification block after physically checking the vehicle.</small></span></label>
      </>
    );
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Primary navigation">
          <button className="active" onClick={() => setStep(0)}><Icon name="clipboard"/><span>Vehicle assessment</span></button>
        </nav>
        <div className="sidebar-card"><span className="sidebar-card-icon"><Icon name="shield"/></span><strong>Private device session</strong><p>No answers, photos or signatures are uploaded or stored in a database.</p></div>
        <div className="sidebar-user"><span>CF</span><div><strong>Cospharm FleetCare</strong><small>Staff assessment form</small></div></div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div className="mobile-brand"><Brand/></div><div className="breadcrumb"><span>Cospharm FleetCare</span><Icon name="chevron" size={15}/><strong>Vehicle assessment</strong></div><div className="topbar-actions"><span className="sync-status local-status"><i/> Device-only session</span><span className="mobile-avatar">CF</span></div></header>
          <div className="assessment-page">
            <div className="assessment-header">
              <div><div className="eyebrow-line"><span className="eyebrow">Vehicle assessment</span><span className="draft-chip">Not saved online</span></div><h1>{assessmentType === "collection" ? "Collection condition report" : "Return condition report"}</h1><p>{vehicle.registrationNumber ? `${vehicle.registrationNumber} · ${vehicle.vehicleMake} ${vehicle.vehicleModel} · ${vehicle.colour}` : "Complete each section, then compile a clear report to share or print."}</p></div>
              <div className="header-meta"><span><Icon name="clock" size={17}/><small>Started</small><strong>{startedAt}</strong></span><span><Icon name="shield" size={17}/><small>Storage</small><strong>This device only</strong></span></div>
            </div>
            <div className="progress-shell">
              <div className="progress-copy"><span>Step {step + 1} of {steps.length}</span><strong>{steps[step].label}</strong><em>{Math.round(((step + 1) / steps.length) * 100)}% complete</em></div>
              <div className="progress-track"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }}/></div>
              <div className="step-dots">{steps.map((item, index) => <button key={item.label} type="button" className={`${index === step ? "current" : ""} ${index < step ? "complete" : ""}`} onClick={() => setStep(index)}><span>{index < step ? <Icon name="check" size={14}/> : index + 1}</span><small>{item.short}</small></button>)}</div>
            </div>
            <div className="assessment-layout">
              <section className="form-card">{renderStep()}<div className="form-actions"><button type="button" className="back-button" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</button>{step < steps.length - 1 ? <button type="button" className="primary-button" disabled={!stepReady} onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}>{stepReady ? "Continue" : "Complete this section"} <Icon name="arrow" size={18}/></button> : <button type="button" className="submit-button" disabled={!canSubmit} onClick={compileAssessment}><Icon name="clipboard" size={18}/> Compile final report</button>}</div></section>
              <aside className="assessment-aside">
                <div className="vehicle-summary"><span className="eyebrow">Current vehicle</span><div className="car-badge"><Icon name="car" size={32}/></div><h3>{vehicle.registrationNumber || "Not identified"}</h3><p>{vehicle.vehicleMake ? `${vehicle.vehicleMake} ${vehicle.vehicleModel} · ${vehicle.colour}` : "Vehicle details pending"}</p><div><span>Driver</span><strong>{vehicle.driverName || "Pending"}</strong></div><div><span>Odometer</span><strong>{vehicle.odometerKm ? `${Number(vehicle.odometerKm).toLocaleString("en-GB")} km` : "Pending"}</strong></div><div><span>Assessment</span><strong>{assessmentType === "collection" ? "Collection" : "Return"}</strong></div></div>
                <div className="aside-checklist"><div className="mini-heading"><strong>Assessment health</strong><span>{step + 1}/{steps.length}</span></div><ul><li className={vehicleComplete ? "done" : ""}><Icon name={vehicleComplete ? "check" : "clock"} size={14}/> Vehicle identified</li><li className={unansweredEquipment === 0 ? "done" : ""}><Icon name={unansweredEquipment === 0 ? "check" : "clock"} size={14}/> Equipment checked</li><li className={exteriorComplete ? "done" : ""}><Icon name={exteriorComplete ? "check" : "clock"} size={14}/> Exterior inspected</li><li className={conditionComplete ? "done" : ""}><Icon name={conditionComplete ? "check" : "clock"} size={14}/> Interior & tyres checked</li><li className={signoffComplete ? "done" : ""}><Icon name={signoffComplete ? "check" : "clock"} size={14}/> Driver signed</li></ul></div>
              </aside>
            </div>
          </div>
      </main>
      {submitted && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="success-title"><div className="success-modal"><span className="success-mark"><Icon name="check" size={34}/></span><span className="eyebrow">Report compiled</span><h2 id="success-title">Ready to share or print.</h2><p>{submittedReportNumber} has been arranged from this session. It has not been uploaded to a database.</p><div className="success-summary"><span><small>Vehicle</small><strong>{vehicle.registrationNumber}</strong></span><span><small>Condition</small><strong>{attentionRequired ? "Attention noted" : "Clear"}</strong></span></div><div className="report-actions"><button className="primary-button full-button" onClick={() => window.print()}><Icon name="download"/> Print / save PDF</button><button className="share-button full-button" onClick={shareAssessment}><Icon name="arrow"/> Share summary</button></div>{shareNotice && <p className="share-notice">{shareNotice}</p>}<button className="text-button center-button" onClick={() => setSubmitted(false)}>Return to review</button><button className="text-button center-button new-session-button" onClick={() => window.location.reload()}>Start a new assessment</button></div></div>}
      <section className="print-report" aria-hidden="true">
        <header className="print-header"><Brand/><div><span>Vehicle assessment report</span><strong>{submittedReportNumber}</strong></div></header>
        <div className="print-title"><div><span>{assessmentType === "return" ? "Return assessment" : "Collection assessment"}</span><h1>{vehicle.registrationNumber}</h1><p>{vehicle.vehicleMake} {vehicle.vehicleModel}{vehicle.vehicleYear ? ` · ${vehicle.vehicleYear}` : ""} · {vehicle.colour}</p></div><strong className={attentionRequired ? "attention" : "clear"}>{attentionRequired ? "Attention noted" : "Condition clear"}</strong></div>
        <section className="print-vehicle-section"><h2>Vehicle and assessment details</h2><div className="print-details"><div><span>Driver</span><strong>{vehicle.driverName}</strong></div><div><span>Assessment date</span><strong>{displayDate(vehicle.assessmentDate)}</strong></div><div><span>Vehicle make</span><strong>{vehicle.vehicleMake}</strong></div><div><span>Model</span><strong>{vehicle.vehicleModel}</strong></div><div><span>Registration number</span><strong>{vehicle.registrationNumber}</strong></div><div><span>Colour</span><strong>{vehicle.colour}</strong></div><div><span>Year</span><strong>{vehicle.vehicleYear || "—"}</strong></div><div><span>Odometer reading</span><strong>{Number(vehicle.odometerKm || 0).toLocaleString("en-GB")} km</strong></div></div></section>
        <div className="print-columns">
          <section><h2>Safety equipment</h2>{Object.entries(equipment).map(([item, present]) => <div className="print-line" key={item}><span>{item}</span><strong>{present ? "Present" : "Missing"}</strong></div>)}</section>
          <section><h2>Interior condition</h2>{Object.entries(interior).map(([item, condition]) => <div className="print-line" key={item}><span>{item}</span><strong>{condition}</strong></div>)}</section>
          <section><h2>Tyres, rims & function</h2>{Object.entries(tyres).map(([item, condition]) => <div className="print-line" key={item}><span>{item}</span><strong>{condition}</strong></div>)}<div className="print-line"><span>Vehicle operational</span><strong>{operational ? "Yes" : "No"}</strong></div><div className="print-line"><span>Difficulty starting</span><strong>{difficultyStarting ? "Yes" : "No"}</strong></div></section>
        </div>
        <section className="print-damages"><div className="print-section-heading"><div><h2>Exterior condition & damage location</h2><p>Numbered markers correspond with the recorded damage table.</p></div><span>{damages.length ? `${damages.length} recorded` : "None recorded"}</span></div><VehicleMap selectedZone="" damages={damages} interactive={false}/>{damages.length ? <table><thead><tr><th>Area</th><th>Location</th><th>Damage</th><th>Severity</th><th>Status</th><th>Description</th></tr></thead><tbody>{damages.map((damage) => <tr key={damage.id}><td>{diagramZoneNumber(damage.zone)}</td><td>{damage.zone}<small>{viewLabels[damage.view]}</small></td><td><b>{damageCode(damage.type)}</b> — {damage.type}</td><td>{damage.severity}</td><td>{damage.status}</td><td>{damage.note || "—"}</td></tr>)}</tbody></table> : <p className="print-clear-condition">Exterior inspected — no damage recorded.</p>}<p className="print-code-legend"><strong>Damage codes:</strong> B Bent · BR Broken · CH Chip · CR Cracked · D Dented · M Missing · PT Pitted · R Rusty · RU Rubbed · S Scratch · HS Hairline Scratch · ST Stained · T Torn</p></section>
        {photos.length > 0 && <section className="print-evidence"><h2>Photographic evidence</h2><div>{photos.map((photo, index) => <figure key={`${photo.name}-${index}`}><img src={photo.url} alt={`Vehicle evidence ${index + 1}`}/><figcaption>Photo {index + 1}</figcaption></figure>)}</div></section>}
        <section className="print-declarations">
          <div className="print-declaration driver-copy"><span className="declaration-tag">Driver declaration · completed</span><p>I VERIFY THAT THIS IS AN ACCURATE ASSESSMENT OF THIS VEHICLE UPON COLLECTION/RETURN.</p><div className="declaration-fields"><div><span>Driver name</span><strong>{vehicle.driverName}</strong></div><div><span>Date</span><strong>{displayDate(vehicle.assessmentDate)}</strong></div><div className="signature-output"><span>Signature</span>{driverSignature && <img src={driverSignature} alt="Driver signature"/>}</div></div></div>
          <div className="print-declaration assessor-copy"><span className="declaration-tag">Assessor verification · complete after physical inspection</span><p>I VERIFY THAT THIS IS AN ACCURATE ASSESSMENT OF THIS VEHICLE UPON COLLECTION/RETURN.</p><div className="assessor-status"><span>☐ Assessment confirmed</span><span>☐ Differences noted in remarks</span></div><div className="declaration-fields"><div><span>Assessor name</span><strong className="blank-line">&nbsp;</strong></div><div><span>Date</span><strong className="blank-line">&nbsp;</strong></div><div className="signature-output"><span>Signature</span><strong className="blank-signature">&nbsp;</strong></div><div className="remarks-output"><span>Remarks / corrections</span><strong className="blank-remarks">&nbsp;</strong></div></div></div>
        </section>
        <footer className="print-footer"><span>Cospharm FleetCare · Compiled locally without database storage</span><span>Generated {compiledAt ? new Date(compiledAt).toLocaleString("en-GB") : ""}</span></footer>
      </section>
    </div>
  );
}
