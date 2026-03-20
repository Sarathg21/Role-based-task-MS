import { useState, useEffect } from "react";
import {
  Building2, User, CheckCircle, Loader2, X, ArrowLeft,
  Users
} from "lucide-react";
import CustomSelect from "../UI/CustomSelect";

const DepartmentFormModal = ({ onClose, onSave, employees = [], initialData = null }) => {
  const isEdit = !!initialData;
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    manager_emp_id: initialData?.manager_emp_id || "",
    department_id: initialData?.department_id || initialData?.id || "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Allow selecting ANY employee as a manager to enable assigning leads to new or empty units
  const availableManagers = employees.map(m => ({
    value: m.emp_id || m.id,
    label: `${m.name} [${m.emp_id || m.id}]`
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.department_id) {
      alert("Department Name and ID are required");
      return;
    }

    setSubmitting(true);
    try {
      await onSave(formData);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Failed to save department", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-[3rem] p-16 flex flex-col items-center justify-center gap-6 animate-in zoom-in-95 duration-500 shadow-2xl">
        <div className="w-24 h-24 rounded-[2rem] bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-inner border border-emerald-100 rotate-12 group-hover:rotate-0 transition-transform duration-500">
          <CheckCircle size={48} className="animate-bounce" />
        </div>
        <div className="text-center">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Operation Successful</h2>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">Infrastructure unit {isEdit ? 'reconfigured' : 'initialized'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.15)] overflow-hidden max-w-lg w-full border border-slate-100 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="relative p-12 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
        
        <button 
            onClick={onClose} 
            className="absolute right-8 top-8 p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all active:scale-90 border border-white/10 backdrop-blur-md"
        >
          <X size={20} />
        </button>

        <div className="relative z-10">
            <div className="flex items-center gap-5 mb-4">
                <div className="p-4 bg-white/10 backdrop-blur-xl rounded-[1.5rem] border border-white/20 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                    <Building2 size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tight leading-none mb-1">{isEdit ? 'Reconfigure' : 'Initialize'}</h1>
                    <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.3em]">Operational Unit</p>
                </div>
            </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-12 space-y-8 bg-white">
        <div className="space-y-6">
            <div className="group">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 group-focus-within:text-indigo-600 transition-colors">
                    <Building2 size={12} /> Unit Designation (Name)
                </label>
                <input
                    type="text"
                    className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-8 focus:ring-indigo-500/5 transition-all text-[15px] font-bold text-slate-800 placeholder:text-slate-300 shadow-sm"
                    placeholder="e.g. Strategic Marketing, Core Engineering"
                    value={formData.name}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    required
                />
            </div>

            <div className="group">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 group-focus-within:text-indigo-600 transition-colors">
                    <Users size={12} /> Deployment ID (Slug)
                </label>
                <input
                    type="text"
                    className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-8 focus:ring-indigo-500/5 transition-all text-[15px] font-bold text-slate-800 placeholder:text-slate-300 shadow-sm disabled:opacity-40 disabled:grayscale font-mono"
                    placeholder="e.g. MKT-HQ, ENG-CORE"
                    value={formData.department_id}
                    onChange={(e) => setFormData(p => ({ ...p, department_id: e.target.value }))}
                    required
                    disabled={isEdit}
                />
            </div>

            <div className="group">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 group-focus-within:text-indigo-600 transition-colors">
                    <User size={12} /> Command Authority (Manager)
                </label>
                <div className="relative">
                    <CustomSelect
                        options={[
                            { value: '', label: '— No Leader Assigned —' },
                            ...availableManagers
                        ]}
                        value={formData.manager_emp_id}
                        onChange={(val) => setFormData(p => ({ ...p, manager_emp_id: val }))}
                        className="w-full"
                    />
                </div>
                <div className="mt-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 flex items-start gap-3">
                    <ArrowLeft size={14} className="text-indigo-400 mt-0.5 shrink-0 rotate-45" />
                    <p className="text-[10px] text-indigo-500/80 font-bold leading-relaxed italic">
                        Designate an organizational lead to oversee operations for this unit. You can select any active staff member.
                    </p>
                </div>
            </div>
        </div>

        <div className="flex gap-4 pt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-8 py-4 rounded-2xl border-2 border-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95"
          >
            Abort
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-2 px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.15em] hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-3 group"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} className="group-hover:scale-110 transition-transform" />}
            {isEdit ? 'Update Systems' : 'Activate Unit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DepartmentFormModal;
