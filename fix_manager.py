import re

filepath = r'c:\Users\SARATH\Project UAE\Rolebased task MS\src\components\Dashboard\ManagerDashboard.jsx'

with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Find the problematic sections by searching for key markers
# that we can be sure about

# 1. Replace Stat component - find via a unique string we know exists
old_stat_marker = 'shadow-emerald-200/50'  # unique to old Stat gradient map

if old_stat_marker in content:
    print("Found old stat marker - updating Stat component")
    
    # Find start of stat function comment
    stat_comment = '/* \u2500\u2500\u2500 Small stat card'
    stat_idx = content.find(stat_comment)
    
    # Find end = next double-newline after '};' which ends the function
    # The const ManagerDashboard = marks the following component
    mgr_dashboard_idx = content.find('const ManagerDashboard = ')
    
    new_stat = '''/* \u2500\u2500\u2500 Small stat card \u2014 CFO-style large gradient \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
const Stat = ({ label, value, sub, icon: Icon, color = 'violet' }) => {
    const c = {
        violet: { bg: 'from-indigo-500 to-violet-600', shadow: 'shadow-indigo-300/40', accent: 'bg-indigo-400/30' },
        green:  { bg: 'from-emerald-400 to-teal-500',  shadow: 'shadow-emerald-300/40', accent: 'bg-emerald-400/30' },
        emerald:{ bg: 'from-emerald-400 to-teal-500',  shadow: 'shadow-emerald-300/40', accent: 'bg-emerald-400/30' },
        amber:  { bg: 'from-amber-400 to-orange-500',  shadow: 'shadow-amber-300/40',   accent: 'bg-amber-400/30' },
        orange: { bg: 'from-orange-500 to-rose-500',   shadow: 'shadow-orange-300/40',  accent: 'bg-orange-400/30' },
        blue:   { bg: 'from-blue-500 to-indigo-500',   shadow: 'shadow-blue-300/40',    accent: 'bg-blue-400/30' },
        rose:   { bg: 'from-rose-500 to-pink-600',     shadow: 'shadow-rose-300/40',    accent: 'bg-rose-400/30' },
    }[color] || { bg: 'from-indigo-500 to-violet-600', shadow: 'shadow-indigo-300/40', accent: 'bg-indigo-400/30' };

    return (
        <div className={`group animate-fade-in-up relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.bg} ${c.shadow} shadow-lg py-5 px-6 transition-all duration-500 hover:scale-[1.03] hover:shadow-xl`}>
            <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${c.accent} blur-2xl`} />
            <div className={`absolute -bottom-6 -left-6 w-20 h-20 rounded-full ${c.accent} blur-2xl opacity-60`} />
            <div className="relative z-10 flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 border border-white/30">
                    <Icon size={22} className="text-white drop-shadow-sm" strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-3xl font-black text-white tabular-nums tracking-tighter leading-none drop-shadow">{value ?? '\u2014'}</div>
                    <div className="text-[11px] font-bold text-white/80 uppercase tracking-widest truncate mt-1.5">{label}</div>
                    {sub && <div className="text-[9px] text-white/60 font-semibold truncate uppercase tracking-widest mt-0.5">{sub}</div>}
                </div>
            </div>
        </div>
    );
};

'''

    content = content[:stat_idx] + new_stat + content[mgr_dashboard_idx:]
    print(f"Stat replaced. New size: {len(content)}")
else:
    print("Old stat marker NOT found - skipping Stat replacement")

# 2. Replace the dark hero banner with clean white CFO style
if 'mesh-gradient-premium' in content:
    print("Found mesh-gradient-premium - updating hero")
    
    hero_start = content.find('            <div className="rounded-[2.5rem] overflow-hidden shadow-2xl relative mb-10 border border-white/10 mesh-gradient-premium">')
    # The hero ends right before the next section (Active Team Directives card)
    # Find the closing </div> that wraps the whole hero
    # Look for the section after hero: the "Active Team Directives" panel
    next_section = content.find('            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up">')
    
    print(f"Hero start: {hero_start}, Next section: {next_section}")
    
    if hero_start > 0 and next_section > hero_start:
        new_hero = '''            {/* \u2550\u2550 MANAGER HEADER \u2014 CFO-STYLE CLEAN WHITE \u2550\u2550 */}
            <div className="rounded-[2rem] bg-white shadow-sm border border-slate-100 relative overflow-hidden p-6 mb-2">
                <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-50 rounded-full blur-3xl -mr-36 -mt-36 opacity-60" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-emerald-50 rounded-full blur-3xl -ml-28 -mb-28 opacity-60" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-4 rounded-2xl shadow-lg shadow-indigo-200/50">
                            <Users size={28} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
                                Team <span className="text-indigo-600">Performance</span>
                            </h2>
                            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">
                                {user.department || \'Management\'} \u00b7 {new Date().toLocaleDateString(\'en-US\', { weekday: \'long\', month: \'long\', day: \'numeric\' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 gap-3">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Start Date</span>
                                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                                    className="bg-transparent text-slate-700 text-[11px] font-bold outline-none w-[110px] cursor-pointer" />
                            </div>
                            <div className="w-px h-6 bg-slate-200" />
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">End Date</span>
                                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                                    className="bg-transparent text-slate-700 text-[11px] font-bold outline-none w-[110px] cursor-pointer" />
                            </div>
                        </div>

                        <button onClick={() => navigate(\'/tasks/assign\')}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] shadow-md transition-all flex items-center gap-2 hover:-translate-y-0.5">
                            <Plus size={14} /> Assign Task
                        </button>

                        {(fromDate || toDate) && (
                            <button onClick={() => { setFromDate(\'\'); setToDate(\'\'); }}
                                className="text-[9px] font-black text-slate-400 hover:text-rose-500 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-rose-200 transition-all uppercase tracking-widest">
                                \u2715 Reset
                            </button>
                        )}
                    </div>
                </div>

                <div className="relative z-10 mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Team Members</span>
                        <span className="text-xl font-black text-slate-900 tabular-nums">{reportTeam.length}</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Pipeline</span>
                        <span className="text-xl font-black text-indigo-600 tabular-nums">{stats.pending}</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Efficiency</span>
                        <span className="text-xl font-black text-emerald-600 tabular-nums">{stats.completionRate}%</span>
                    </div>
                </div>
            </div>

'''
        content = content[:hero_start] + new_hero + content[next_section:]
        print(f"Hero replaced. New size: {len(content)}")
    else:
        print("Could not find hero boundaries")
else:
    print("mesh-gradient-premium NOT found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("File written successfully")
