import { useState } from "react";
import {
  User, Briefcase, Building2, Users, Hash, UserPlus,
  ChevronDown, ArrowLeft, CheckCircle
} from "lucide-react";

/* ─── Reusable styled field label ─── */
const FieldLabel = ({ icon: Icon, color = "text-indigo-600", textColor = "text-indigo-700", children }) => (
  <label className={`flex items-center gap-1.5 text-xs font-bold ${textColor} uppercase tracking-wider mb-2`}>
    <Icon size={12} className={color} />
    {children}
  </label>
);

/* ─── Select with chevron overlay ─── */
const StyledSelect = ({ value, onChange, children, ring = "focus:ring-indigo-500" }) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      className={`w-full appearance-none px-4 py-3.5 text-sm rounded-xl border-2 border-slate-200
        bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 ${ring}
        focus:border-transparent transition-all duration-200 cursor-pointer hover:border-slate-400`}
    >
      {children}
    </select>
    <ChevronDown size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
  </div>
);

/* ─── Section card with colored left accent ─── */
const Section = ({ icon: Icon, headerBg, iconBg, iconColor, titleColor, title, borderColor, children }) => (
  <div className={`bg-white rounded-2xl border-2 ${borderColor} shadow-sm overflow-hidden`}>
    <div className={`flex items-center gap-3 px-6 py-4 border-b-2 ${borderColor} ${headerBg}`}>
      <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center shadow-sm`}>
        <Icon size={16} className={iconColor} />
      </div>
      <span className={`text-sm font-extrabold ${titleColor} uppercase tracking-widest`}>{title}</span>
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
);

/* ─── Main Component ─── */
const AddEmployeeForm = ({ onClose, onAdd, managers, departments }) => {
  const [formData, setFormData] = useState({
    name: "",
    role: "Employee",
    department: departments[0] || "Engineering",
    managerId: "",
    email: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const set = (key) => (e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  const inputCls = `w-full px-4 py-3.5 text-sm rounded-xl border-2 border-slate-200
    bg-white text-slate-800 font-medium placeholder-slate-400 focus:outline-none
    focus:ring-2 focus:ring-indigo-500 focus:border-transparent
    transition-all duration-200 hover:border-slate-400`;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      alert("Name and Employee ID are required");
      return;
    }
    const newId = formData.email.includes("EMP") ? formData.email : `EMP-${Math.floor(Math.random() * 1000)}`;
    onAdd({
      id: newId,
      name: formData.name,
      role: formData.role,
      department: formData.department,
      managerId: formData.managerId || null,
      active: true,
      password: "password123",
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1500);
  };

  /* ── Success state ── */
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-pulse">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <p className="text-lg font-bold text-slate-800">Employee Added!</p>
        <p className="text-sm text-slate-500">Redirecting back to directory…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div
        className="relative rounded-2xl overflow-hidden px-8 py-7 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #4f46e5 75%, #818cf8 100%)" }}
      >
        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #818cf8, transparent)" }} />
          <div className="absolute bottom-0 left-40 w-36 h-36 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #38bdf8, transparent)" }} />
        </div>

        <div className="flex items-center gap-5 relative z-10">
          <div className="p-3.5 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
            <UserPlus size={26} className="text-white" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-indigo-300 text-[11px] font-bold uppercase tracking-widest mb-0.5">Admin Console</p>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Add New Employee</h1>
            <p className="text-indigo-200 text-xs mt-0.5">Fill in the details to register a new team member</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3 relative z-10">
          {[["Departments", departments.length], ["Managers", managers.length]].map(([label, val]) => (
            <div key={label} className="px-4 py-2.5 rounded-2xl text-center"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <div className="text-xl font-black text-white leading-none">{val}</div>
              <div className="text-indigo-300 text-[10px] font-semibold uppercase tracking-widest mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Personal Info */}
        <Section
          icon={User}
          headerBg="bg-indigo-50" iconBg="bg-indigo-500" iconColor="text-white"
          titleColor="text-indigo-700" borderColor="border-indigo-200"
          title="Personal Information"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <FieldLabel icon={User} color="text-indigo-500" textColor="text-indigo-700">Full Name</FieldLabel>
              <input type="text" className={inputCls} placeholder="e.g. Jane Doe"
                value={formData.name} onChange={set("name")} required />
            </div>
            <div>
              <FieldLabel icon={Hash} color="text-indigo-500" textColor="text-indigo-700">Employee ID</FieldLabel>
              <input type="text" className={inputCls} placeholder="e.g. EMP001"
                value={formData.email} onChange={set("email")} required />
            </div>
          </div>
        </Section>

        {/* Role & Department */}
        <Section
          icon={Briefcase}
          headerBg="bg-violet-50" iconBg="bg-violet-500" iconColor="text-white"
          titleColor="text-violet-700" borderColor="border-violet-200"
          title="Role & Department"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <FieldLabel icon={Briefcase} color="text-violet-500" textColor="text-violet-700">Role</FieldLabel>
              <StyledSelect value={formData.role} onChange={set("role")} ring="focus:ring-violet-500">
                <option value="Employee">Employee</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </StyledSelect>
            </div>
            <div>
              <FieldLabel icon={Building2} color="text-violet-500" textColor="text-violet-700">Department</FieldLabel>
              <StyledSelect value={formData.department} onChange={set("department")} ring="focus:ring-violet-500">
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </StyledSelect>
            </div>
          </div>
        </Section>

        {/* Reporting Structure */}
        <Section
          icon={Users}
          headerBg="bg-sky-50" iconBg="bg-sky-500" iconColor="text-white"
          titleColor="text-sky-700" borderColor="border-sky-200"
          title="Reporting Structure"
        >
          <div>
            <FieldLabel icon={Users} color="text-sky-500" textColor="text-sky-700">Reporting Manager</FieldLabel>
            <StyledSelect value={formData.managerId} onChange={set("managerId")} ring="focus:ring-sky-500">
              <option value="">— No Manager Assigned —</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.name} · {m.department}</option>
              ))}
            </StyledSelect>
          </div>
        </Section>

        {/* Action Footer */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-400 hidden sm:block">
            Default password: <span className="font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">password123</span>
          </p>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-600
                bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50
                rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95"
            >
              <ArrowLeft size={15} />
              Back to Directory
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-8 py-3 text-sm font-bold text-white rounded-xl
                transition-all duration-200 hover:scale-[1.03] active:scale-95"
              style={{
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                boxShadow: "0 4px 16px rgba(79,70,229,0.4)"
              }}
            >
              <UserPlus size={15} />
              Add Employee
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddEmployeeForm;
