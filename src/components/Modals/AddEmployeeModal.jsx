import { useState } from "react";
import {
  User, Briefcase, Building2, Users, Hash, UserPlus,
  ChevronDown, ArrowLeft, CheckCircle, Loader2
} from "lucide-react";
import CustomSelect from "../UI/CustomSelect";

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
  <div className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden animate-fade-in-up`}>
    <div className={`flex items-center gap-4 px-10 py-6 border-b border-slate-100 ${headerBg}/30 backdrop-blur-sm`}>
      <div className={`w-10 h-10 rounded-2xl ${iconBg} flex items-center justify-center shadow-lg shadow-indigo-100`}>
        <Icon size={20} className={iconColor} />
      </div>
      <span className={`text-base font-black ${titleColor} uppercase tracking-[0.2em]`}>{title}</span>
    </div>
    <div className="px-10 py-8 bg-white/50">{children}</div>
  </div>
);

/* ─── Main Component ─── */
const AddEmployeeForm = ({ onClose, onAdd, managers, departments }) => {
  const firstDept = Array.isArray(departments) && departments.length > 0
    ? (typeof departments[0] === 'string' ? departments[0] : departments[0].id || departments[0])
    : '';

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "EMPLOYEE",
    department_id: firstDept,
    manager_emp_id: "",
    emp_id: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (key) => (e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  const inputCls = `w-full px-4 py-3.5 text-sm rounded-xl border-2 border-slate-200
    bg-white text-slate-800 font-medium placeholder-slate-400 focus:outline-none
    focus:ring-2 focus:ring-indigo-500 focus:border-transparent
    transition-all duration-200 hover:border-slate-400`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.emp_id || !formData.email) {
      alert("Name, Employee ID, and Email are required");
      return;
    }

    setSubmitting(true);
    try {
      // Match EmployeeCreate schema exactly
      await onAdd({
        emp_id: formData.emp_id,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department_id: formData.department_id,
        manager_emp_id: formData.manager_emp_id || null,
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Failed to add employee", err);
    } finally {
      setSubmitting(false);
    }
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
        className="relative rounded-[2rem] overflow-hidden px-12 py-12 flex items-center justify-between shadow-2xl"
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
                value={formData.emp_id} onChange={set("emp_id")} required />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel icon={User} color="text-indigo-500" textColor="text-indigo-700">Email Address</FieldLabel>
              <input type="email" className={inputCls} placeholder="e.g. jane@company.com"
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
              <CustomSelect
                options={[
                  { value: 'EMPLOYEE', label: 'Employee' },
                  { value: 'MANAGER', label: 'Manager' },
                  { value: 'ADMIN', label: 'Admin' },
                ]}
                value={formData.role}
                onChange={(val) => setFormData(p => ({ ...p, role: val }))}
                className="w-full"
              />
            </div>
            <div>
              <FieldLabel icon={Building2} color="text-violet-500" textColor="text-violet-700">Department</FieldLabel>
              <CustomSelect
                options={departments.map((d, idx) => {
                  const val = typeof d === 'string' ? d : (d.id || d.department_id || `dept-${idx}`);
                  const label = typeof d === 'string' ? d : (d.name || d.department_id || 'Unknown');
                  return { value: val, label };
                })}
                value={formData.department_id}
                onChange={(val) => setFormData(p => ({ ...p, department_id: val }))}
                className="w-full"
              />
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
            <CustomSelect
              options={[
                { value: '', label: '— No Manager Assigned —' },
                ...managers.map((m, idx) => ({
                  value: m.emp_id || m.id || `mgr-${idx}`,
                  label: `${m.name || 'Unknown'} · ${m.department_id || m.department || 'N/A'}`
                }))
              ]}
              value={formData.manager_emp_id}
              onChange={(val) => setFormData(p => ({ ...p, manager_emp_id: val }))}
              className="w-full"
            />
          </div>
        </Section>

        {/* Action Footer */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl px-10 py-8 flex items-center justify-between gap-4">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest hidden sm:block">
            Default credentials: <span className="font-mono font-bold text-violet-600 bg-violet-50 px-3 py-1 rounded-lg border border-violet-100 ml-2">password123</span>
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
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-3 text-sm font-bold text-white rounded-xl
                transition-all duration-200 hover:scale-[1.03] active:scale-95 disabled:opacity-70 disabled:hover:scale-100"
              style={{
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                boxShadow: "0 4px 16px rgba(79,70,229,0.4)"
              }}
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
              {submitting ? "Adding..." : "Add Employee"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddEmployeeForm;
