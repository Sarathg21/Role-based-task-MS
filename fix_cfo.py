filepath = r'c:\Users\SARATH\Project UAE\Rolebased task MS\src\components\Dashboard\CFODashboard.jsx'

with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Find and replace the stat cards section
old_stats = '''            {/* Main Stats - Ultra Clean */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard title="Total Volume" value={globalStats.totalTasks} icon={CheckSquare} color="primary" compact />
                <StatsCard title="Approved" value={globalStats.completedTasks} icon={TrendingUp} color="success" compact />
                <StatsCard title="Pending Review" value={globalStats.pendingTasks} icon={AlertTriangle} color="warning" compact />
                <StatsCard title="Efficiency" value={`${globalStats.overallScore}%`} icon={Target} color="info" compact />
            </div>'''

new_stats = '''            {/* Main Stats - Large Gradient Cards matching CFO image */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-300/40 py-5 px-6 transition-all duration-500 hover:scale-[1.03] hover:shadow-xl">
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-blue-400/30 blur-2xl" />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                            <CheckSquare size={22} className="text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="text-3xl font-black text-white tabular-nums tracking-tighter leading-none drop-shadow">{globalStats.totalTasks}</div>
                            <div className="text-[11px] font-bold text-white/80 uppercase tracking-widest mt-1.5">Total Volume</div>
                        </div>
                    </div>
                </div>
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-300/40 py-5 px-6 transition-all duration-500 hover:scale-[1.03] hover:shadow-xl">
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-violet-400/30 blur-2xl" />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                            <TrendingUp size={22} className="text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="text-3xl font-black text-white tabular-nums tracking-tighter leading-none drop-shadow">{globalStats.completedTasks}</div>
                            <div className="text-[11px] font-bold text-white/80 uppercase tracking-widest mt-1.5">Approved</div>
                        </div>
                    </div>
                </div>
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-300/40 py-5 px-6 transition-all duration-500 hover:scale-[1.03] hover:shadow-xl">
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-amber-400/30 blur-2xl" />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                            <AlertTriangle size={22} className="text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="text-3xl font-black text-white tabular-nums tracking-tighter leading-none drop-shadow">{globalStats.pendingTasks}</div>
                            <div className="text-[11px] font-bold text-white/80 uppercase tracking-widest mt-1.5">Pending Review</div>
                        </div>
                    </div>
                </div>
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg shadow-teal-300/40 py-5 px-6 transition-all duration-500 hover:scale-[1.03] hover:shadow-xl">
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-teal-400/30 blur-2xl" />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                            <Target size={22} className="text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="text-3xl font-black text-white tabular-nums tracking-tighter leading-none drop-shadow">{globalStats.overallScore}%</div>
                            <div className="text-[11px] font-bold text-white/80 uppercase tracking-widest mt-1.5">Efficiency</div>
                        </div>
                    </div>
                </div>
            </div>'''

if old_stats in content:
    content = content.replace(old_stats, new_stats)
    print("Stats section replaced!")
else:
    print("Could not find old stats section - searching for similar...")
    idx = content.find('Main Stats')
    print(f"'Main Stats' found at index: {idx}")
    print("Context:", repr(content[idx-10:idx+200]))

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("CFO Dashboard written. Size:", len(content))
